import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { WebhookPayload } from "@reviewloop/shared";
import type { Generate } from "../src/ai/assist.js";
import { makeApp, SPACE, startDb, stopDb, validSubmission } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);

const goodAssist = {
  pull_quote: "We now ship every afternoon without anyone staying late.",
  headline: "From fortnightly breakage to daily releases",
  quality: 92,
  spam: false,
  sentiment: "positive",
  topics: ["release process"],
  rationale: "Concrete before and after.",
};

describe("public submission flow", () => {
  it("stores a valid submission as pending and counts it", async () => {
    const { app, c } = await makeApp();
    const res = await request(app).post(`/api/public/spaces/${SPACE}/submissions`).send(validSubmission);
    expect(res.status).toBe(201);

    const doc = await c.testimonials.findOne({ _id: res.body.id });
    expect(doc?.status).toBe("pending");
    expect(doc?.answers).toHaveLength(3);
    expect(doc?.body).toContain("ship every afternoon");
    expect(doc?.ai.state).toBe("off"); // no Anthropic key in this test

    const today = await c.metrics.find({}).sort({ day: -1 }).limit(1).toArray();
    expect(today[0]?.submitted).toBe(1);
  });

  it("rejects an invalid submission with field errors", async () => {
    const { app } = await makeApp();
    const res = await request(app)
      .post(`/api/public/spaces/${SPACE}/submissions`)
      .send({ ...validSubmission, rating: 9, answers: ["too short"], consent: false });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.issues.fieldErrors)).toEqual(expect.arrayContaining(["rating", "answers", "consent"]));
  });

  it("accepts a honeypot hit without storing anything", async () => {
    const { app, c } = await makeApp();
    const before = await c.testimonials.countDocuments();
    const res = await request(app)
      .post(`/api/public/spaces/${SPACE}/submissions`)
      .send({ ...validSubmission, website: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(await c.testimonials.countDocuments()).toBe(before);
  });

  it("refuses submissions to an expired link", async () => {
    const { app, c } = await makeApp();
    await c.spaces.updateOne({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app).post(`/api/public/spaces/${SPACE}/submissions`).send(validSubmission);
    expect(res.status).toBe(410);
  });

  it("scores the submission in the background when AI is on", async () => {
    const generate = vi.fn<Generate>(async () => goodAssist);
    const { app, c, ctx } = await makeApp({ generate });
    const res = await request(app).post(`/api/public/spaces/${SPACE}/submissions`).send(validSubmission);
    await ctx.queue.idle();
    const doc = await c.testimonials.findOne({ _id: res.body.id });
    expect(doc?.ai.state).toBe("done");
    expect(doc?.ai.pullQuote).toBe(goodAssist.pull_quote);
    expect(doc?.status).toBe("pending"); // AI suggests, a human approves
  });

  it("parks the submission for a human when the AI answer fails validation twice", async () => {
    const generate = vi.fn<Generate>(async () => ({ ...goodAssist, pull_quote: "Words the client never wrote." }));
    const { app, c, ctx } = await makeApp({ generate });
    const res = await request(app).post(`/api/public/spaces/${SPACE}/submissions`).send(validSubmission);
    await ctx.queue.idle();
    const doc = await c.testimonials.findOne({ _id: res.body.id });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0].retryReason).toMatch(/word-for-word/);
    expect(doc?.ai.state).toBe("failed");
    expect(doc?.ai.error).toMatch(/word-for-word/);
  });

  it("fires the webhook with a Zapier-friendly payload", async () => {
    const send = vi.fn(async (_spaceId: string, _payload: WebhookPayload) => {});
    const { app } = await makeApp({ webhooks: { send } });
    await request(app).post(`/api/public/spaces/${SPACE}/submissions`).send(validSubmission);
    expect(send).toHaveBeenCalledOnce();
    const payload = send.mock.calls[0]![1];
    expect(payload.event).toBe("testimonial.submitted");
    expect(payload.testimonial).toMatchObject({ name: "Ada Lovelace", rating: 5 });
  });
});
