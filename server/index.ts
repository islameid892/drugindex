import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ✅ REDIRECT MIDDLEWARE - CRITICAL FOR GSC
  // Priority: HTTP → HTTPS → WWW → non-WWW
  app.use((req, res, next) => {
    // 1️⃣ Force HTTPS (HTTP → HTTPS with 301)
    if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
      return res.redirect(301, `https://${req.header('host')}${req.originalUrl}`);
    }

    // 2️⃣ Force non-WWW (www → non-www with 301)
    if (req.hostname.startsWith('www.')) {
      const newHost = req.hostname.slice(4);
      return res.redirect(301, `https://${newHost}${req.originalUrl}`);
    }

    next();
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // ✅ Add security headers for SEO
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
