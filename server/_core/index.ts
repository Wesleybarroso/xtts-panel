import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
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
