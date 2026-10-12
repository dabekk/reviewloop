import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { Config } from "./config.js";
import type { Collections } from "./db.js";
import { runAssist, type Generate } from "./ai/assist.js";
import { errorHandler } from "./http.js";
import { JobQueue } from "./jobs.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { publicRoutes } from "./routes/public.js";
import { widgetRoutes } from "./routes/widget.js";
import { WidgetCache } from "./services.js";
import type { WebhookSender } from "./webhooks.js";

export interface AppDeps {
  c: Collections;
  cfg: Config;
  /** null turns AI assist off; new submissions are stored as unscored. */
  generate: Generate | null;
  webhooks: WebhookSender | null;
  now?: () => Date;
  widgetBundlePath?: string;
  /** Built dashboard to serve at /. Skipped when the folder does not exist. */
  webDistPath?: string;
  /** "memory" when running on the development in-memory MongoDB. Shown on /health. */
  database?: "atlas" | "memory";
}

export interface AppContext {
  c: Collections;
  cfg: Config;
  aiEnabled: boolean;
  webhooks: WebhookSender | null;
  cache: WidgetCache;
  queue: JobQueue;
  now: () => Date;
  widgetBundlePath: string;
}

export function createApp(deps: AppDeps) {
  const { c, generate } = deps;
  const cache = new WidgetCache(c);

  const queue = new JobQueue(async (id) => {
    const t = await c.testimonials.findOne({ _id: id });
    if (!t || t.ai.state !== "queued") return;
    if (!generate) {
      await c.testimonials.updateOne({ _id: id }, { $set: { "ai.state": "off" } });
      return;
    }
    const result = await runAssist(generate, t.body);
    const attempts = t.ai.attempts + result.attempts;
    if (result.ok) {
      const o = result.output;
      await c.testimonials.updateOne(
        { _id: id },
        {
          $set: {
            ai: {
              state: "done",
              pullQuote: o.pull_quote,
              headline: o.headline,
              quality: o.quality,
              spam: o.spam,
              sentiment: o.sentiment,
              topics: o.topics,
              rationale: o.rationale,
              model: deps.cfg.ANTHROPIC_MODEL,
              attempts,
              error: null,
            },
          },
        },
      );
    } else {
      // Parked for a human: the testimonial stays in the queue, unscored,
      // with the reason and a retry button in the dashboard.
      await c.testimonials.updateOne(
        { _id: id },
        { $set: { "ai.state": "failed", "ai.error": result.error, "ai.attempts": attempts } },
      );
    }
    // A re-scored approved testimonial can change its widget pull-quote.
    cache.invalidate(t.spaceId);
  });

  const ctx: AppContext = {
    c,
    cfg: deps.cfg,
    aiEnabled: generate !== null,
    webhooks: deps.webhooks,
    cache,
    queue,
    now: deps.now ?? (() => new Date()),
    // Relative to this module, not the working directory, so it resolves the
    // same whether the host starts the app from the repo root or apps/api.
    // src/app.ts in development and dist/server.mjs in production are both
    // three levels below the repo root.
    widgetBundlePath:
      deps.widgetBundlePath ?? fileURLToPath(new URL("../../../packages/widget/dist/v1.js", import.meta.url)),
  };

  const app = express();
  // Render and Railway sit behind one proxy hop; this makes req.ip the client.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(
    helmet({
      // The widget script and its data are loaded by other sites on purpose.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(express.json({ limit: "32kb" }));

  const origins = deps.cfg.CORS_ORIGINS.split(",").map((o) => o.trim());
  const dashboardCors = cors({ origin: origins });

  // Safe to expose: says which kind of setup is live, never any values.
  app.get("/health", (_req, res) => {
    res.json({ ok: true, database: deps.database ?? "atlas", ai: ctx.aiEnabled, env: deps.cfg.NODE_ENV });
  });
  app.use("/api/public", dashboardCors, publicRoutes(ctx));
  app.use("/api", dashboardCors, dashboardRoutes(ctx));
  app.use("/w", widgetRoutes(ctx));

  // The dashboard and the public collection page, from the same origin as the
  // API. Hashed assets are cached for a year; index.html is always revalidated
  // so a deploy shows up on the next load. Any other GET is a client-side
  // route (/s/<workspace>/<space>), so it gets index.html.
  const webDist = deps.webDistPath ?? fileURLToPath(new URL("../../web/dist", import.meta.url));
  if (existsSync(path.join(webDist, "index.html"))) {
    app.use("/assets", express.static(path.join(webDist, "assets"), { immutable: true, maxAge: "1y" }));
    app.use(express.static(webDist, { index: false, maxAge: "1h" }));
    app.get(/^\/(?!api\/|w\/|health$).*/, (_req, res) => {
      res.set("Cache-Control", "no-cache");
      res.sendFile(path.join(webDist, "index.html"));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(errorHandler);

  return { app, ctx };
}
