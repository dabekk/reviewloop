import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  PatchTestimonial,
  type Analytics,
  type AnalyticsWeek,
  type SpaceDetail,
  type Status,
  type WebhookInfo,
} from "@reviewloop/shared";
import type { AppContext } from "../app.js";
import { HttpError, parseBody } from "../http.js";
import { seedDemo, startOfUtcWeek } from "../seed/seed.js";
import { findSpace, toTestimonial } from "../services.js";

const WEEK = 7 * 86_400_000;
/** Twelve complete weeks plus the current one. */
const WEEKS_SHOWN = 13;

/**
 * The dashboard API. In this demo it is open so anyone with the link can try
 * moderation. Milestone 1 puts it behind JWT auth with workspace roles.
 */
export function dashboardRoutes(ctx: AppContext): Router {
  const { c, cache, queue } = ctx;
  const r = Router();

  r.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: "draft-8", legacyHeaders: false }));

  r.get("/spaces/:ws/:space", async (req, res) => {
    const { workspace, space } = await findSpace(c, req.params.ws, req.params.space);
    const grouped = await c.testimonials
      .aggregate<{ _id: Status; n: number }>([
        { $match: { spaceId: space._id } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ])
      .toArray();
    const count = (s: Status) => grouped.find((g) => g._id === s)?.n ?? 0;
    const body: SpaceDetail = {
      workspace: { name: workspace.name, slug: workspace.slug, members: workspace.members },
      space: {
        name: space.name,
        slug: space.slug,
        brandColor: space.brandColor,
        questions: space.questions,
        expiresAt: space.expiresAt?.toISOString() ?? null,
      },
      counts: { pending: count("pending"), approved: count("approved"), hidden: count("hidden") },
      aiEnabled: ctx.aiEnabled,
      aiModel: ctx.aiEnabled ? ctx.cfg.ANTHROPIC_MODEL : null,
    };
    res.json(body);
  });

  r.get("/spaces/:ws/:space/testimonials", async (req, res) => {
    const { space } = await findSpace(c, req.params.ws, req.params.space);
    const docs = await c.testimonials.find({ spaceId: space._id }).sort({ submittedAt: -1 }).limit(200).toArray();
    res.json(docs.map(toTestimonial));
  });

  r.get("/spaces/:ws/:space/analytics", async (req, res) => {
    const { space } = await findSpace(c, req.params.ws, req.params.space);
    const thisWeek = startOfUtcWeek(ctx.now()).getTime();
    const from = new Date(thisWeek - (WEEKS_SHOWN - 1) * WEEK);
    const rows = await c.metrics
      .aggregate<Omit<AnalyticsWeek, "weekStart"> & { _id: Date }>([
        { $match: { spaceId: space._id, day: { $gte: from } } },
        {
          $group: {
            _id: { $dateTrunc: { date: "$day", unit: "week", startOfWeek: "monday", timezone: "UTC" } },
            views: { $sum: "$views" },
            started: { $sum: "$started" },
            submitted: { $sum: "$submitted" },
            impressions: { $sum: "$impressions" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    // Weeks with no traffic have no documents, so fill the gaps with zeros.
    const byWeek = new Map(rows.map((row) => [row._id.getTime(), row]));
    const weeks: AnalyticsWeek[] = Array.from({ length: WEEKS_SHOWN }, (_, i) => {
      const t = from.getTime() + i * WEEK;
      const row = byWeek.get(t);
      return {
        weekStart: new Date(t).toISOString().slice(0, 10),
        views: row?.views ?? 0,
        started: row?.started ?? 0,
        submitted: row?.submitted ?? 0,
        impressions: row?.impressions ?? 0,
      };
    });
    const body: Analytics = { weeks };
    res.json(body);
  });

  r.get("/spaces/:ws/:space/webhooks", async (req, res) => {
    const { space } = await findSpace(c, req.params.ws, req.params.space);
    const docs = await c.deliveries.find({ spaceId: space._id }).sort({ at: -1 }).limit(8).toArray();
    const body: WebhookInfo = {
      configured: ctx.webhooks !== null,
      deliveries: docs.map((d) => ({
        id: d._id,
        event: d.event,
        target: d.target,
        status: d.status,
        attempt: d.attempt,
        at: d.at.toISOString(),
      })),
    };
    res.json(body);
  });

  r.patch("/testimonials/:id", async (req, res) => {
    const patch = parseBody(PatchTestimonial, req);
    const current = await c.testimonials.findOne({ _id: req.params.id });
    if (!current) throw new HttpError(404, "Testimonial not found");

    const status = patch.status ?? current.status;
    // Only approved testimonials can be featured; leaving approved clears it.
    const featured = status === "approved" ? (patch.featured ?? current.featured) : false;
    if (patch.featured && status !== "approved") {
      throw new HttpError(409, "Approve a testimonial before featuring it");
    }
    if (featured && !current.featured) {
      // One featured testimonial per space.
      await c.testimonials.updateMany(
        { spaceId: current.spaceId, featured: true },
        { $set: { featured: false } },
      );
    }
    const updated = await c.testimonials.findOneAndUpdate(
      { _id: current._id },
      { $set: { status, featured } },
      { returnDocument: "after" },
    );
    if (!updated) throw new HttpError(404, "Testimonial not found");
    cache.invalidate(current.spaceId);
    res.json(toTestimonial(updated));
  });

  r.post("/testimonials/:id/assist", async (req, res) => {
    if (!ctx.aiEnabled) throw new HttpError(409, "AI assist is not configured on this server");
    const updated = await c.testimonials.findOneAndUpdate(
      { _id: req.params.id, "ai.state": { $ne: "queued" } },
      { $set: { "ai.state": "queued", "ai.error": null } },
      { returnDocument: "after" },
    );
    if (!updated) throw new HttpError(409, "Already being scored, or not found");
    queue.enqueue(updated._id);
    res.status(202).json(toTestimonial(updated));
  });

  r.post(
    "/demo/reset",
    rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false }),
    async (_req, res) => {
      await seedDemo(c, ctx.now());
      cache.invalidate();
      res.status(204).end();
    },
  );

  return r;
}
