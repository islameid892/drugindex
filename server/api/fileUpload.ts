import { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { uploadedFiles } from "../../drizzle/schema";
import cookie from "cookie";
import crypto from "crypto";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Configure multer with memory storage (100MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Auth middleware for file routes
function filesAuthMiddleware(req: Request, res: Response, next: Function) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const filesAuth = cookies.files_auth;
  if (filesAuth && filesAuth === "authenticated") {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

// GET /api/files/list - Get all files
router.get("/list", filesAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const files = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.isDeleted, false))
      .orderBy(desc(uploadedFiles.uploadedAt));
    return res.status(200).json(files);
  } catch (error: any) {
    console.error("File list error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch files" });
  }
});

// POST /api/files/upload - Upload a file with real progress tracking
router.post("/upload", filesAuthMiddleware, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { originalname, buffer, mimetype, size } = req.file;
    const description = req.body.description || "";

    // Generate unique file key
    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const fileKey = `uploads/${Date.now()}-${randomSuffix}-${originalname}`;

    // Upload to S3
    const { url } = await storagePut(fileKey, buffer, mimetype);

    // Save to database
    const db = await getDb();
    const now = new Date();
    
    const [result] = await db
      .insert(uploadedFiles)
      .values({
        fileName: originalname,
        fileSize: size,
        fileType: mimetype,
        s3Key: fileKey,
        s3Url: url,
        description: description || null,
        downloads: 0,
        uploadedAt: now,
      });

    // Get the inserted ID from the result
    const insertedId = (result as any).insertId as number;

    return res.status(200).json({
      id: insertedId,
      fileName: originalname,
      fileSize: size,
      fileType: mimetype,
      s3Url: url,
      s3Key: fileKey,
      uploadedAt: new Date().toISOString(),
      downloads: 0,
      description: description || null,
      isDeleted: false,
      uploadedBy: null,
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return res.status(500).json({ error: error.message || "Upload failed" });
  }
});

// DELETE /api/files/:id - Delete a file instantly
router.delete("/:id", filesAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ error: "Invalid file ID" });
    }

    const db = await getDb();
    
    // Soft delete
    await db
      .update(uploadedFiles)
      .set({ isDeleted: true })
      .where(eq(uploadedFiles.id, fileId));

    return res.status(200).json({ success: true, fileId });
  } catch (error: any) {
    console.error("File delete error:", error);
    return res.status(500).json({ error: error.message || "Delete failed" });
  }
});

// POST /api/files/:id/download - Increment download counter
router.post("/:id/download", async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ error: "Invalid file ID" });
    }

    const db = await getDb();
    const file = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.id, fileId))
      .limit(1);

    if (!file || file.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    await db
      .update(uploadedFiles)
      .set({ downloads: (file[0].downloads || 0) + 1 })
      .where(eq(uploadedFiles.id, fileId));

    return res.status(200).json({ success: true, downloads: (file[0].downloads || 0) + 1 });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed" });
  }
});

export default router;
