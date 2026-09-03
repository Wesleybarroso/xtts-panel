import "dotenv/config";
import { randomUUID } from "node:crypto";
import express from "express";
import multer from "multer";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { generateXttsAudio, uploadXttsVoice } from "../services/xtts";
import { saveAudio } from "../services/storage";
import { createJob, getJobById } from "../db";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    const origins = (process.env.CORS_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean);
    const requestOrigin = _req.headers.origin;
    if (requestOrigin && origins.includes(requestOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    }
    if (_req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/health", (_req, res) => {
    const database = Boolean(process.env.DATABASE_URL);
    res.status(database ? 200 : 503).json({ status: database ? "healthy" : "degraded", service: "xtts-panel", database: database ? "configured" : "missing" });
  });
  app.get("/api/v1/health", (_req, res) => {
    const database = Boolean(process.env.DATABASE_URL);
    const redis = Boolean(process.env.REDIS_URL);
    const xtts = Boolean(process.env.XTTS_SERVER_URL);
    const healthy = database && redis && xtts;
    res.status(healthy ? 200 : 503).json({ success: healthy, data: { status: healthy ? "healthy" : "degraded", database: database ? "configured" : "missing", redis: redis ? "configured" : "missing", xtts_servers: xtts ? 1 : 0 }, message: healthy ? "Operation completed successfully" : "One or more dependencies are not configured" });
  });
  const upload = multer({ limits: { fields: 4, fieldSize: 5000 } });
  const voiceUpload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: 25 * 1024 * 1024, fields: 2, fieldSize: 160 },
  });
  app.post("/api/v1/voices", voiceUpload.single("file"), async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication is required" } });
    }
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const file = req.file;
    if (!name || name.length > 120 || !file || !file.buffer.length) {
      return res.status(400).json({ success: false, error: { code: "INVALID_REQUEST", message: "name and an audio file are required" } });
    }
    if (!/^audio\/(wav|mpeg|mp3|x-wav|wave|webm)$/.test(file.mimetype) && !/\.(wav|mp3|mpeg|webm)$/i.test(file.originalname)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_FILE", message: "Only WAV, MP3 or WebM audio files are accepted" } });
    }
    try {
      const result = await uploadXttsVoice({ name, filename: file.originalname || `${name}.wav`, contentType: file.mimetype || "audio/wav", bytes: file.buffer });
      console.info(`[XTTS] Voice uploaded by user ${user.id}: ${name}`);
      return res.status(201).json({ success: true, data: result, voice: { name, filename: file.originalname, size: file.size } });
    } catch (error) {
      console.error("[XTTS] Voice upload failed:", error instanceof Error ? error.message : "unknown error");
      return res.status(502).json({ success: false, error: { code: "XTTS_UNAVAILABLE", message: "The XTTS server could not save the voice" } });
    }
  });
  app.post("/api/v1/tts", upload.none(), async (req, res) => {
    const startedAt = Date.now();
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication is required" } });
    }
    const { text, language, speaker, format = "mp3" } = req.body as Record<string, string>;
    const languages = ["pt", "en", "es", "fr", "de", "it", "pl", "tr", "ru", "zh-cn", "ja", "ko", "ar"];
    if (!text?.trim() || text.length > 5000 || !languages.includes(language) || !speaker?.trim() || !["mp3", "wav"].includes(format)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_REQUEST", message: "text, language, speaker and format are required" } });
    }
    try {
      const result = await generateXttsAudio({ text, language, speaker, format: format as "mp3" | "wav" });
      const audio = Buffer.from(result.audioBase64, "base64");
      const jobId = randomUUID().replace(/-/g, "").slice(0, 32);
      const storedPath = await saveAudio(jobId, result.format, audio);
      await createJob({ id: jobId, userId: user.id, serverId: null, text, language, format: result.format, status: "completed", processingTime: (Date.now() - startedAt) / 1000, filePath: storedPath, createdAt: new Date(), completedAt: new Date() });
      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Length", audio.length);
      res.setHeader("Content-Disposition", `inline; filename=xtts-${Date.now()}.${result.format}`);
      res.setHeader("X-Job-ID", jobId);
      return res.status(200).send(audio);
    } catch (error) {
      console.error("[XTTS] TTS generation failed:", error instanceof Error ? error.message : "unknown error");
      return res.status(502).json({ success: false, error: { code: "XTTS_UNAVAILABLE", message: "The XTTS server could not generate the audio" } });
    }
  });
  app.get("/api/v1/jobs/:id/download", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const job = await getJobById(req.params.id);
      if (!job || job.userId !== user.id || !job.filePath) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Audio not found" } });
      return res.download(job.filePath, `${job.id}.${job.format}`);
    } catch {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication is required" } });
    }
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch(console.error);
