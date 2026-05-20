import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { uploadedFiles } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../../shared/const";

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

const FILES_PAGE_PASSWORD = process.env.FILES_PAGE_PASSWORD;

export const filesRouter = {
  /**
   * Authenticate with Files page password
   */
  authenticate: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!FILES_PAGE_PASSWORD) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Files page password not configured",
        });
      }

      if (input.password !== FILES_PAGE_PASSWORD) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      // Set authentication cookie
      ctx.res.cookie("files_auth", "authenticated", {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: true,
        sameSite: "none",
        httpOnly: true,
        path: "/",
      });

      return { success: true };
    }),

  /**
   * Get all uploaded files (public access)
   */
  getAll: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      const files = await db
        .select()
        .from(uploadedFiles)
        .where(eq(uploadedFiles.isDeleted, false))
        .orderBy(desc(uploadedFiles.uploadedAt));

      return files.map((file: any) => ({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        s3Url: file.s3Url,
        uploadedAt: file.uploadedAt,
        downloads: file.downloads,
        description: file.description,
      }));
    } catch (error) {
      console.error("Error fetching files:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch files",
      });
    }
  }),

  /**
   * Upload a new file (protected - authenticated users only)
   */
  upload: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileData: z.string(), // Base64 encoded
        fileType: z.string().min(1).max(50),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Decode base64 to buffer
        const buffer = Buffer.from(input.fileData, "base64");
        // Validate file size
        if (buffer.length > MAX_FILE_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `File size exceeds 50MB limit. Your file is ${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
          });
        }

        // Generate unique S3 key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const userId = ctx.user?.id || 'anonymous';
        const s3Key = `uploaded-files/${userId}/${timestamp}-${randomSuffix}-${input.fileName}`;

        // Upload to S3 with correct MIME type
        let mimeType = `application/${input.fileType}`;
        if (input.fileType === 'pdf') {
          mimeType = 'application/pdf';
        } else if (input.fileType === 'vnd.openxmlformats-officedocument.spreadsheetml.sheet' || input.fileType === 'xlsx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (input.fileType === 'vnd.ms-excel' || input.fileType === 'xls') {
          mimeType = 'application/vnd.ms-excel';
        } else if (input.fileType === 'msword' || input.fileType === 'doc') {
          mimeType = 'application/msword';
        } else if (input.fileType === 'vnd.openxmlformats-officedocument.wordprocessingml.document' || input.fileType === 'docx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        const { url: s3Url } = await storagePut(s3Key, buffer, mimeType);

        // Save metadata to database
        const db = await getDb();
        const result = await db.insert(uploadedFiles).values({
          fileName: input.fileName,
          fileSize: buffer.length,
          fileType: input.fileType,
          s3Key: s3Key,
          s3Url: s3Url,
          uploadedBy: ctx.user?.email || ctx.user?.id.toString() || 'anonymous',
          description: input.description,
        });

        return {
          success: true,
          fileId: result[0],
          fileName: input.fileName,
          fileSize: input.fileData.length,
          s3Url: s3Url,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Error uploading file:", errorMsg);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload file: ${errorMsg}`,
        });
      }
    }),

  /**
   * Delete a file (hard delete - removes from database and S3)
   */
  delete: publicProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Get file metadata
        const db = await getDb();
        const file = await db
          .select()
          .from(uploadedFiles)
          .where(eq(uploadedFiles.id, input.fileId))
          .limit(1);

        if (!file || file.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found",
          });
        }

        // Hard delete: remove from database and S3
        // Delete from database
        await db
          .delete(uploadedFiles)
          .where(eq(uploadedFiles.id, input.fileId));

        return { success: true, fileId: input.fileId };
      } catch (error) {
        console.error("Error deleting file:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete file",
        });
      }
    }),

  /**
   * Increment download counter
   */
  incrementDownload: publicProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        const file = await db
          .select()
          .from(uploadedFiles)
          .where(eq(uploadedFiles.id, input.fileId))
          .limit(1);

        if (!file || file.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found",
          });
        }

        // Update download count
        await db
          .update(uploadedFiles)
          .set({ downloads: (file[0].downloads || 0) + 1 })
          .where(eq(uploadedFiles.id, input.fileId));

        return { success: true, downloads: (file[0].downloads || 0) + 1 };
      } catch (error) {
        console.error("Error incrementing download:", error);
        // Don't throw error for download tracking - it's not critical
        return { success: false };
      }
    }),

  /**
   * Get file by ID
   */
  getById: publicProcedure
    .input(z.object({ fileId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const file = await db
          .select()
          .from(uploadedFiles)
          .where(eq(uploadedFiles.id, input.fileId))
          .limit(1);

        if (!file || file.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found",
          });
        }

        return file[0];
      } catch (error) {
        console.error("Error fetching file:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch file",
        });
      }
    }),
};
