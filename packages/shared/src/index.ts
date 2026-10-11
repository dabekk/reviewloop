/**
 * The contract between the API, the dashboard and the widget. Every request
 * body is parsed with these schemas on the server, and every response is
 * parsed with them in the dashboard, so the two ends cannot drift apart.
 */
import { z } from "zod";

export const Status = z.enum(["pending", "approved", "hidden"]);
export type Status = z.infer<typeof Status>;

export const Medium = z.enum(["written", "video"]);
export type Medium = z.infer<typeof Medium>;

export const Sentiment = z.enum(["positive", "mixed", "negative"]);
export type Sentiment = z.infer<typeof Sentiment>;

/* ------------------------------------------------------------------------ */
/* AI assist                                                                */
/* ------------------------------------------------------------------------ */

/**
 * What the model is asked to return. Kept flat and small: structured outputs
 * guarantee the shape, and checkAssist() below covers what a schema cannot.
 */
export const AssistOutput = z.object({
  pull_quote: z
    .string()
    .describe("One or two sentences copied word for word from the testimonial. Empty if spam."),
  headline: z.string().describe("A headline of at most 60 characters. Empty if spam."),
  quality: z.number().int().min(0).max(100).describe("0-100: how usable this is as public proof."),
  spam: z.boolean().describe("True for solicitations, links, gibberish or no reference to real work."),
  sentiment: Sentiment,
  topics: z.array(z.string()).max(5).describe("Up to five short topic labels."),
  rationale: z.string().describe("One or two sentences explaining the score, for the moderator."),
});
export type AssistOutput = z.infer<typeof AssistOutput>;

/** Lower-cases and collapses punctuation so curly quotes and spacing do not cause false misses. */
export function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();
}

/**
 * The checks a JSON schema cannot express. A valid shape is not a valid
 * answer: a pull-quote that is not in the testimonial would put words in a
 * client's mouth on someone's website. Returns the problems found, or [].
 */
export function checkAssist(out: AssistOutput, body: string): string[] {
  const problems: string[] = [];
  if (!out.spam) {
    if (!out.pull_quote.trim()) problems.push("pull_quote is empty but spam is false");
    else if (!normaliseForMatch(body).includes(normaliseForMatch(out.pull_quote)))
      problems.push("pull_quote is not a word-for-word excerpt of the testimonial");
    if (!out.headline.trim()) problems.push("headline is empty but spam is false");
  }
  if (out.headline.length > 60) problems.push("headline is longer than 60 characters");
  return problems;
}

export const AiState = z.enum(["queued", "done", "failed", "off"]);
export type AiState = z.infer<typeof AiState>;

export const Assist = z.object({
  state: AiState,
  pullQuote: z.string(),
  headline: z.string(),
  quality: z.number().int().min(0).max(100).nullable(),
  spam: z.boolean(),
  sentiment: Sentiment.nullable(),
  topics: z.array(z.string()),
  rationale: z.string(),
  /** Which model produced this, or "sample" for seeded rows. */
  model: z.string().nullable(),
  attempts: z.number().int(),
  error: z.string().nullable(),
});
export type Assist = z.infer<typeof Assist>;

/* ------------------------------------------------------------------------ */
/* Testimonials                                                             */
/* ------------------------------------------------------------------------ */

export const Testimonial = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  company: z.string(),
  /** Deterministic avatar tint index. Identity only, never data encoding. */
  tint: z.number().int(),
  medium: Medium,
  /** mm:ss, video only. */
  duration: z.string().nullable(),
  rating: z.number().int().min(1).max(5),
  body: z.string(),
  submittedAt: z.iso.datetime(),
  status: Status,
  tags: z.array(z.string()),
  featured: z.boolean(),
  ai: Assist,
});
export type Testimonial = z.infer<typeof Testimonial>;

export const TestimonialList = z.array(Testimonial);

export const PatchTestimonial = z
  .object({ status: Status.optional(), featured: z.boolean().optional() })
  .strict()
  .refine((p) => p.status !== undefined || p.featured !== undefined, {
    message: "Send status, featured, or both",
  });
export type PatchTestimonial = z.infer<typeof PatchTestimonial>;

/* ------------------------------------------------------------------------ */
/* Spaces and workspaces                                                    */
/* ------------------------------------------------------------------------ */

export const Member = z.object({
  name: z.string(),
  role: z.enum(["owner", "editor"]),
  tint: z.number().int(),
});

export const SpaceDetail = z.object({
  workspace: z.object({ name: z.string(), slug: z.string(), members: z.array(Member) }),
  space: z.object({
    name: z.string(),
    slug: z.string(),
    brandColor: z.string(),
    questions: z.array(z.string()),
    expiresAt: z.iso.datetime().nullable(),
  }),
  counts: z.object({ pending: z.number().int(), approved: z.number().int(), hidden: z.number().int() }),
  /** True when the API has an Anthropic key and scores new submissions. */
  aiEnabled: z.boolean(),
  aiModel: z.string().nullable(),
});
export type SpaceDetail = z.infer<typeof SpaceDetail>;

/** What the public collection page needs, and nothing more. */
export const PublicSpace = z.object({
  workspaceName: z.string(),
  name: z.string(),
  brandColor: z.string(),
  questions: z.array(z.string()),
  expired: z.boolean(),
});
export type PublicSpace = z.infer<typeof PublicSpace>;

const text = (max: number) => z.string().trim().max(max);

export const SubmissionInput = z.object({
  name: text(80).min(1, "Add your name"),
  role: text(80),
  company: text(80),
  rating: z.number().int().min(1, "Pick a rating").max(5),
  /** One answer per question, in order. The first is required. */
  answers: z
    .array(text(1500))
    .min(1, "Write at least a sentence or two")
    .max(10)
    .refine((a) => (a[0] ?? "").length >= 20, { message: "Write at least a sentence or two" }),
  consent: z.literal(true, { error: "Tick the box so it can be published" }),
  /** Honeypot. Hidden from people, filled in by naive bots. Checked by the route. */
  website: z.string().max(200).optional(),
});
export type SubmissionInput = z.infer<typeof SubmissionInput>;

export const PublicEvent = z.object({ type: z.enum(["view", "start"]) });

/* ------------------------------------------------------------------------ */
/* Analytics and webhooks                                                   */
/* ------------------------------------------------------------------------ */

export const AnalyticsWeek = z.object({
  /** ISO date of the Monday that starts the week. */
  weekStart: z.iso.date(),
  views: z.number().int(),
  started: z.number().int(),
  submitted: z.number().int(),
  impressions: z.number().int(),
});
export type AnalyticsWeek = z.infer<typeof AnalyticsWeek>;

export const Analytics = z.object({ weeks: z.array(AnalyticsWeek) });
export type Analytics = z.infer<typeof Analytics>;

export const WebhookDelivery = z.object({
  id: z.string(),
  event: z.string(),
  target: z.string(),
  status: z.number().int().nullable(),
  attempt: z.number().int(),
  at: z.iso.datetime(),
});
export type WebhookDelivery = z.infer<typeof WebhookDelivery>;

export const WebhookInfo = z.object({
  configured: z.boolean(),
  deliveries: z.array(WebhookDelivery),
});
export type WebhookInfo = z.infer<typeof WebhookInfo>;

/** Flat on purpose, so Zapier can map every field without a code step. */
export interface WebhookPayload {
  event: "testimonial.submitted";
  id: string;
  created_at: string;
  space: { slug: string; name: string };
  testimonial: {
    id: string;
    name: string;
    role: string;
    company: string;
    rating: number;
    body: string;
    review_url: string;
  };
}

/* ------------------------------------------------------------------------ */
/* Widget                                                                   */
/* ------------------------------------------------------------------------ */

/** The public widget payload. Deliberately excludes AI rationale and moderation data. */
export interface WidgetItem {
  id: string;
  name: string;
  byline: string;
  tint: number;
  medium: Medium;
  duration: string | null;
  rating: number;
  quote: string;
  featured: boolean;
}

export interface WidgetPayload {
  space: string;
  /** Changes whenever moderation changes what the widget should show. */
  version: string;
  items: WidgetItem[];
}
