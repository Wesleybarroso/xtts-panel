import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { protectedProcedure } from "./_core/trpc";
import { listJobs, listServers, getJobStats } from "./db";
import { z } from "zod";
import { generateXttsAudio, getXttsHealth, getXttsInfo, getXttsSpeakers } from "./services/xtts";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  servers: router({
    list: protectedProcedure.query(() => listServers()),
    health: protectedProcedure.query(async () => getXttsHealth()),
    info: protectedProcedure.query(async () => getXttsInfo()),
  }),
  voices: router({
    list: protectedProcedure.query(async () => getXttsSpeakers()),
  }),
  tts: router({
    generate: protectedProcedure.input(z.object({
      text: z.string().trim().min(1).max(5000),
      language: z.enum(["pt", "en", "es", "fr", "de", "it", "pl", "tr", "ru", "zh-cn", "ja", "ko", "ar"]),
      speaker: z.string().trim().min(1).max(160),
      format: z.enum(["mp3", "wav"]).default("mp3"),
    })).mutation(({ input }) => generateXttsAudio(input)),
  }),
  jobs: router({
    list: protectedProcedure.input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional()).query(({ input }) => listJobs(input?.limit ?? 20)),
  }),
  stats: router({
    summary: protectedProcedure.query(() => getJobStats()),
  }),
  health: publicProcedure.query(() => {
    const database = Boolean(process.env.DATABASE_URL);
    const redis = Boolean(process.env.REDIS_URL);
    const xtts = Boolean(process.env.XTTS_SERVER_URL);
    return {
      status: database && redis && xtts ? "healthy" as const : "degraded" as const,
      database: database ? "configured" : "missing",
      redis: redis ? "configured" : "missing",
      xtts_servers: xtts ? 1 : 0,
    };
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
