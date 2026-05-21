import { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { uploadedFiles } from "../../drizzle/schema";
import { validateSession } from "../middleware/sessionSecurity";
import cookie from "cookie";
import crypto from "crypto";

const router = Router();

// Configure multer with memory storage (100MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// Timing-safe password comparison
function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Auth middleware for file routes
function filesAuthMiddleware(req: Request, res: Response, next: Function) {
  const cookies = cookie.parse(req.headers.cookie || "");
  
  // Check files_auth cookie
  const filesAuth = cookies.files_auth;
  if (filesAuth) {
    const filesPassword = process.env.FILES_PAGE_PASSWORD || "Islameid992@";
    if (timingSafeEqual(filesAuth, filesPassword)) {
      return next();
    }
  }
  
  return res.status(401).json({ error: "Unauthorized" });
}

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
    const [newFile] = await db
      .insert(uploadedFiles)
      .values({
        fileName: originalname,
        fileSize: size,
        fileType: mimetype,
        s3Key: fileKey,
        s3Url: url,
        description: description || null,
        downloads: 0,
        uploadedAt: new Date(),
      })
      .$returningId();

    const insertedId = (newFile as any).id;

    return res.status(200).json({
      id: insertedId,
      fileName: originalname,
      fileSize: size,
      fileType: mimetype,
      s3Url: url,
      uploadedAt: new Date(),
      downloads: 0,
      description: description || null,
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return res.status(500).json({ error: error.message || "Upload failed" });
  }
});

export default router;
