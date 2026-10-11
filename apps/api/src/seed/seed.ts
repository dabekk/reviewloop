import type { Collections, MetricDayDoc, TestimonialDoc } from "../db.js";
import { SPACE, TESTIMONIALS, WEEKS, WORKSPACE } from "./data.js";

const DAY = 86_400_000;

/** The last date in the original sample set. Sample dates are shifted relative to it. */
const SAMPLE_ANCHOR = Date.UTC(2026, 8, 14);

/** Shares of a week's traffic per weekday, Monday first. Sums to 1. */
const WEEKDAY_SHARE = [0.16, 0.18, 0.17, 0.16, 0.15, 0.09, 0.09];

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Monday 00:00 UTC of the week containing d. */
export function startOfUtcWeek(d: Date): Date {
  const day = startOfUtcDay(d);
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY);
}

/** Splits n across the weekday shares so the parts always add back up to n. */
function spread(n: number): number[] {
  const parts = WEEKDAY_SHARE.map((s) => Math.floor(n * s));
  const short = n - parts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < short; i++) parts[i % 7] = (parts[i % 7] ?? 0) + 1;
  return parts;
}

export function sampleTestimonials(now: Date): TestimonialDoc[] {
  return TESTIMONIALS.map((t) => {
    const daysBeforeAnchor = Math.round((SAMPLE_ANCHOR - Date.parse(t.submittedAt)) / DAY);
    const submittedAt = new Date(now.getTime() - (daysBeforeAnchor + 1) * DAY);
    return {
      _id: t.id,
      spaceId: SPACE._id,
      name: t.name,
      role: t.role,
      company: t.company,
      tint: t.tint,
      medium: t.medium,
      duration: t.duration ?? null,
      rating: t.rating,
      body: t.body,
      answers: [],
      submittedAt,
      status: t.status,
      tags: t.tags,
      featured: t.featured,
      ai: { ...t.ai, state: "done", model: "sample", attempts: 0, error: null },
    };
  });
}

/** Twelve complete weeks of daily buckets, ending the week before `now`. */
export function sampleMetrics(now: Date): MetricDayDoc[] {
  const thisWeek = startOfUtcWeek(now).getTime();
  const docs: MetricDayDoc[] = [];
  WEEKS.forEach((w, i) => {
    const weekStart = thisWeek - (WEEKS.length - i) * 7 * DAY;
    const views = spread(w.views);
    const started = spread(w.started);
    const submitted = spread(w.submitted);
    const impressions = spread(w.impressions);
    for (let d = 0; d < 7; d++) {
      docs.push({
        spaceId: SPACE._id,
        day: new Date(weekStart + d * DAY),
        views: views[d] ?? 0,
        started: started[d] ?? 0,
        submitted: submitted[d] ?? 0,
        impressions: impressions[d] ?? 0,
      });
    }
  });
  return docs;
}

/**
 * Replaces the demo workspace with the sample set. Scoped to the demo IDs, so
 * running it against a shared cluster never touches anything else.
 */
export async function seedDemo(c: Collections, now = new Date()): Promise<void> {
  await Promise.all([
    c.testimonials.deleteMany({ spaceId: SPACE._id }),
    c.metrics.deleteMany({ spaceId: SPACE._id }),
    c.deliveries.deleteMany({ spaceId: SPACE._id }),
  ]);
  await c.workspaces.replaceOne({ _id: WORKSPACE._id }, WORKSPACE, { upsert: true });
  await c.spaces.replaceOne(
    { _id: SPACE._id },
    {
      ...SPACE,
      // Rolling expiry, so the public link never expires on a demo viewer.
      expiresAt: new Date(startOfUtcDay(now).getTime() + 90 * DAY),
      createdAt: new Date(now.getTime() - 120 * DAY),
    },
    { upsert: true },
  );
  await c.testimonials.insertMany(sampleTestimonials(now));
  await c.metrics.insertMany(sampleMetrics(now));
}
