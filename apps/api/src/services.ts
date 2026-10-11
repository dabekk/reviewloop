import { createHash } from "node:crypto";
import type { Testimonial, WidgetItem, WidgetPayload } from "@reviewloop/shared";
import type { Collections, MetricDayDoc, SpaceDoc, TestimonialDoc, WorkspaceDoc } from "./db.js";
import { HttpError } from "./http.js";
import { startOfUtcDay } from "./seed/seed.js";

export function toTestimonial(d: TestimonialDoc): Testimonial {
  return {
    id: d._id,
    name: d.name,
    role: d.role,
    company: d.company,
    tint: d.tint,
    medium: d.medium,
    duration: d.duration,
    rating: d.rating,
    body: d.body,
    submittedAt: d.submittedAt.toISOString(),
    status: d.status,
    tags: d.tags,
    featured: d.featured,
    ai: d.ai,
  };
}

export async function findSpace(
  c: Collections,
  wsSlug: string,
  spaceSlug: string,
): Promise<{ workspace: WorkspaceDoc; space: SpaceDoc }> {
  const workspace = await c.workspaces.findOne({ slug: wsSlug });
  const space = workspace && (await c.spaces.findOne({ workspaceId: workspace._id, slug: spaceSlug }));
  if (!workspace || !space) throw new HttpError(404, "No collection space at that address");
  return { workspace, space };
}

type Metric = keyof Omit<MetricDayDoc, "spaceId" | "day">;

/** One upsert into today's bucket. See MetricDayDoc for why it is bucketed. */
export async function bumpMetric(c: Collections, spaceId: string, metric: Metric, now = new Date()) {
  await c.metrics.updateOne(
    { spaceId, day: startOfUtcDay(now) },
    {
      $inc: { [metric]: 1 },
      $setOnInsert: Object.fromEntries(
        (["views", "started", "submitted", "impressions"] as const)
          .filter((m) => m !== metric)
          .map((m) => [m, 0]),
      ),
    },
    { upsert: true },
  );
}

/** Stable avatar tint from a name, so the same person always gets the same colour. */
export function tintFor(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 6;
}

const WIDGET_LIMIT = 24;

function toWidgetItem(d: TestimonialDoc): WidgetItem {
  const byline = [d.role, d.company].filter((x) => x && x !== "-").join(", ");
  return {
    id: d._id,
    name: d.name,
    byline: byline || "Verified client",
    tint: d.tint,
    medium: d.medium,
    duration: d.duration,
    rating: d.rating,
    quote: d.ai.state === "done" && d.ai.pullQuote ? d.ai.pullQuote : d.body,
    featured: d.featured,
  };
}

/**
 * Server-side cache of each space's widget payload. Built once, served from
 * memory with an ETag until a moderation change invalidates it. In front of
 * this, Cache-Control lets a CDN and the browser hold it for a minute.
 */
export class WidgetCache {
  private readonly entries = new Map<string, WidgetPayload>();

  constructor(private readonly c: Collections) {}

  async get(space: SpaceDoc, key: string): Promise<WidgetPayload> {
    const hit = this.entries.get(space._id);
    if (hit) return hit;
    const docs = await this.c.testimonials
      .find({ spaceId: space._id, status: "approved" })
      .sort({ featured: -1, submittedAt: -1 })
      .limit(WIDGET_LIMIT)
      .toArray();
    const items = docs.map(toWidgetItem);
    const version = createHash("sha1").update(JSON.stringify(items)).digest("base64url").slice(0, 16);
    const payload: WidgetPayload = { space: key, version, items };
    this.entries.set(space._id, payload);
    return payload;
  }

  invalidate(spaceId?: string): void {
    if (spaceId) this.entries.delete(spaceId);
    else this.entries.clear();
  }
}
