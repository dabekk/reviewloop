import { z } from "zod";
import {
  Analytics,
  PublicSpace,
  SpaceDetail,
  Testimonial,
  TestimonialList,
  WebhookInfo,
  type PatchTestimonial,
  type SubmissionInput,
} from "@reviewloop/shared";

/** Empty in development: Vite proxies /api and /w to the local API. */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/** The origin third-party pages load the widget from. */
export const API_ORIGIN = API_BASE || window.location.origin;

/** The one workspace and space this demo runs on. */
export const DEMO = { ws: "aurora-studio", space: "q3-client-wins" } as const;
export const DEMO_KEY = `${DEMO.ws}/${DEMO.space}`;

/** The public collection page lives in this same app, under /s/<workspace>/<space>. */
export const collectionLink = () =>
  new URL(`${import.meta.env.BASE_URL}s/${DEMO_KEY}`, window.location.origin).toString();

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[] | undefined>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[] | undefined> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const ErrorBody = z.object({
  error: z.string(),
  issues: z.object({ fieldErrors: z.record(z.string(), z.array(z.string()).optional()) }).optional(),
});

/**
 * Every response is parsed with the same Zod schema the API was written
 * against, so a contract change fails loudly here instead of rendering junk.
 */
async function call<S extends z.ZodType>(schema: S | null, path: string, init?: RequestInit): Promise<z.infer<S>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const parsed = ErrorBody.safeParse(await res.json().catch(() => null));
    throw new ApiError(
      res.status,
      parsed.success ? parsed.data.error : `Request failed (${res.status})`,
      parsed.success ? (parsed.data.issues?.fieldErrors ?? {}) : {},
    );
  }
  if (schema === null || res.status === 204) return undefined as z.infer<S>;
  return schema.parse(await res.json());
}

const space = `/api/spaces/${DEMO_KEY}`;
const json = (body: unknown) => JSON.stringify(body);

export const api = {
  space: () => call(SpaceDetail, space),
  testimonials: () => call(TestimonialList, `${space}/testimonials`),
  analytics: () => call(Analytics, `${space}/analytics`),
  webhooks: () => call(WebhookInfo, `${space}/webhooks`),
  patch: (id: string, patch: PatchTestimonial) =>
    call(Testimonial, `/api/testimonials/${encodeURIComponent(id)}`, { method: "PATCH", body: json(patch) }),
  rescore: (id: string) =>
    call(Testimonial, `/api/testimonials/${encodeURIComponent(id)}/assist`, { method: "POST" }),
  reset: () => call(null, "/api/demo/reset", { method: "POST" }),

  publicSpace: (ws: string, sp: string) => call(PublicSpace, `/api/public/spaces/${ws}/${sp}`),
  event: (ws: string, sp: string, type: "view" | "start") =>
    call(null, `/api/public/spaces/${ws}/${sp}/events`, { method: "POST", body: json({ type }), keepalive: true }),
  submit: (ws: string, sp: string, input: SubmissionInput) =>
    call(z.object({ id: z.string() }), `/api/public/spaces/${ws}/${sp}/submissions`, {
      method: "POST",
      body: json(input),
    }),
};

export const keys = {
  space: ["space"] as const,
  testimonials: ["testimonials"] as const,
  analytics: ["analytics"] as const,
  webhooks: ["webhooks"] as const,
};
