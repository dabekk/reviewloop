import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { PublicEvent, SubmissionInput, type PublicSpace, type WebhookPayload } from "@reviewloop/shared";
import type { AppContext } from "../app.js";

type SpaceParams = { ws: string; space: string };
import type { TestimonialDoc } from "../db.js";
import { HttpError, parseBody } from "../http.js";
import { bumpMetric, findSpace, tintFor } from "../services.js";

/** The collection page a client opens from the shared link. No auth by design. */
export function publicRoutes(ctx: AppContext): Router {
  const { c, queue } = ctx;
  const r = Router();

  const limited = (limit: number, windowMs = 60_000) =>
    rateLimit({ windowMs, limit, standardHeaders: "draft-8", legacyHeaders: false });

  r.get("/spaces/:ws/:space", limited(120), async (req: Request<SpaceParams>, res: Response) => {
    const { workspace, space } = await findSpace(c, req.params.ws, req.params.space);
    const body: PublicSpace = {
      workspaceName: workspace.name,
      name: space.name,
      brandColor: space.brandColor,
      questions: space.questions,
      expired: space.expiresAt !== null && space.expiresAt.getTime() < ctx.now().getTime(),
    };
    res.json(body);
  });

  r.post("/spaces/:ws/:space/events", limited(60), async (req: Request<SpaceParams>, res: Response) => {
    const { type } = parseBody(PublicEvent, req);
    const { space } = await findSpace(c, req.params.ws, req.params.space);
    await bumpMetric(c, space._id, type === "view" ? "views" : "started", ctx.now());
    res.status(204).end();
  });

  r.post("/spaces/:ws/:space/submissions", limited(5, 10 * 60_000), async (req: Request<SpaceParams>, res: Response) => {
    const input = parseBody(SubmissionInput, req);
    const { space } = await findSpace(c, req.params.ws, req.params.space);
    if (space.expiresAt && space.expiresAt.getTime() < ctx.now().getTime()) {
      throw new HttpError(410, "This collection link has expired");
    }
    // A filled honeypot gets the same response as a real submission, so a
    // bot learns nothing, but nothing is stored.
    if (input.website) {
      res.status(201).json({ id: randomUUID() });
      return;
    }

    const answers = space.questions
      .map((question, i) => ({ question, answer: input.answers[i] ?? "" }))
      .filter((a) => a.answer.length > 0);
    const doc: TestimonialDoc = {
      _id: randomUUID(),
      spaceId: space._id,
      name: input.name,
      role: input.role,
      company: input.company,
      tint: tintFor(input.name),
      medium: "written",
      duration: null,
      rating: input.rating,
      body: answers.map((a) => a.answer).join("\n\n"),
      answers,
      submittedAt: ctx.now(),
      status: "pending",
      tags: [],
      featured: false,
      ai: {
        state: ctx.aiEnabled ? "queued" : "off",
        pullQuote: "",
        headline: "",
        quality: null,
        spam: false,
        sentiment: null,
        topics: [],
        rationale: "",
        model: null,
        attempts: 0,
        error: null,
      },
    };
    await c.testimonials.insertOne(doc);
    await bumpMetric(c, space._id, "submitted", ctx.now());
    if (ctx.aiEnabled) queue.enqueue(doc._id);

    if (ctx.webhooks) {
      const payload: WebhookPayload = {
        event: "testimonial.submitted",
        id: `evt_${randomUUID()}`,
        created_at: doc.submittedAt.toISOString(),
        space: { slug: req.params.ws + "/" + req.params.space, name: space.name },
        testimonial: {
          id: doc._id,
          name: doc.name,
          role: doc.role,
          company: doc.company,
          rating: doc.rating,
          body: doc.body,
          review_url: new URL("#moderation", ctx.cfg.PUBLIC_APP_URL).toString(),
        },
      };
      // Fire and forget: the submitter never waits on a third party.
      void ctx.webhooks.send(space._id, payload).catch((err: unknown) => console.error("webhook", err));
    }

    res.status(201).json({ id: doc._id });
  });

  return r;
}
