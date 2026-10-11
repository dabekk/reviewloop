import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { WidgetPayload } from "@reviewloop/shared";
import { makeApp, SPACE, startDb, stopDb } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);

describe("widget endpoint", () => {
  it("serves only approved testimonials, featured first, without moderation data", async () => {
    const { app, c } = await makeApp();
    const res = await request(app).get(`/w/spaces/${SPACE}`);
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    const body = res.body as WidgetPayload;
    const approved = await c.testimonials.countDocuments({ status: "approved" });
    expect(body.items).toHaveLength(approved);
    expect(body.items[0]?.featured).toBe(true);
    expect(Object.keys(body.items[0]!)).not.toContain("ai");
    expect(Object.keys(body.items[0]!)).not.toContain("body");
  });

  it("answers a matching ETag with 304 and no body", async () => {
    const { app } = await makeApp();
    const first = await request(app).get(`/w/spaces/${SPACE}`);
    expect(first.headers["cache-control"]).toContain("max-age=60");
    const again = await request(app).get(`/w/spaces/${SPACE}`).set("If-None-Match", first.headers.etag!);
    expect(again.status).toBe(304);
  });

  it("drops the server-side cache when moderation changes what it shows", async () => {
    const { app } = await makeApp();
    const before = (await request(app).get(`/w/spaces/${SPACE}`)).body as WidgetPayload;
    const patch = await request(app).patch("/api/testimonials/t_02").send({ status: "approved" });
    expect(patch.status).toBe(200);
    const after = (await request(app).get(`/w/spaces/${SPACE}`)).body as WidgetPayload;
    expect(after.version).not.toBe(before.version);
    expect(after.items.map((i) => i.id)).toContain("t_02");
  });

  it("keeps one featured testimonial per space", async () => {
    const { app, c } = await makeApp();
    await request(app).patch("/api/testimonials/t_03").send({ featured: true }).expect(200);
    const featured = await c.testimonials.find({ featured: true }).toArray();
    expect(featured.map((f) => f._id)).toEqual(["t_03"]);
  });

  it("refuses to feature a testimonial that is not approved", async () => {
    const { app } = await makeApp();
    await request(app).patch("/api/testimonials/t_02").send({ featured: true }).expect(409);
  });

  it("counts impressions into today's bucket", async () => {
    const { app, c } = await makeApp();
    await request(app).post(`/w/spaces/${SPACE}/impression`).expect(204);
    await request(app).post(`/w/spaces/${SPACE}/impression`).expect(204);
    const [today] = await c.metrics.find({}).sort({ day: -1 }).limit(1).toArray();
    expect(today?.impressions).toBe(2);
  });
});

describe("analytics", () => {
  it("rolls daily buckets into 13 weeks with the seeded history intact", async () => {
    const { app } = await makeApp();
    const res = await request(app).get(`/api/spaces/${SPACE}/analytics`).expect(200);
    expect(res.body.weeks).toHaveLength(13);
    const submitted = res.body.weeks.reduce((n: number, w: { submitted: number }) => n + w.submitted, 0);
    expect(submitted).toBe(280); // the sum of the seeded weekly figures
  });
});
