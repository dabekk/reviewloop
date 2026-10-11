import path from "node:path";
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
    widgetBundlePath:
      deps.widgetBundlePath ?? path.resolve(process.cwd(), "../../packages/widget/dist/v1.js"),
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

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/public", dashboardCors, publicRoutes(ctx));
  app.use("/api", dashboardCors, dashboardRoutes(ctx));
  app.use("/w", widgetRoutes(ctx));
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(errorHandler);

  return { app, ctx };
}
