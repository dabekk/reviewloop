import { MongoClient, type Collection, type Db } from "mongodb";
import type { AiState, Medium, Sentiment, Status } from "@reviewloop/shared";

export interface WorkspaceDoc {
  _id: string;
  slug: string;
  name: string;
  members: { name: string; role: "owner" | "editor"; tint: number }[];
}

export interface SpaceDoc {
  _id: string;
  workspaceId: string;
  /** Unique per workspace. The public key is `${workspace.slug}/${space.slug}`. */
  slug: string;
  name: string;
  brandColor: string;
  questions: string[];
  expiresAt: Date | null;
  createdAt: Date;
}

export interface AssistDoc {
  state: AiState;
  pullQuote: string;
  headline: string;
  quality: number | null;
  spam: boolean;
  sentiment: Sentiment | null;
  topics: string[];
  rationale: string;
  model: string | null;
  attempts: number;
  error: string | null;
}

export interface TestimonialDoc {
  _id: string;
  spaceId: string;
  name: string;
  role: string;
  company: string;
  tint: number;
  medium: Medium;
  duration: string | null;
  rating: number;
  body: string;
  answers: { question: string; answer: string }[];
  submittedAt: Date;
  status: Status;
  tags: string[];
  featured: boolean;
  ai: AssistDoc;
}

/**
 * Bucket pattern: one document per space per UTC day, incremented in place.
 * A busy widget does one upsert per impression instead of one insert, and the
 * analytics pipeline reads at most 84 small documents for a 12-week chart.
 */
export interface MetricDayDoc {
  spaceId: string;
  day: Date;
  views: number;
  started: number;
  submitted: number;
  impressions: number;
}

export interface WebhookDeliveryDoc {
  _id: string;
  spaceId: string;
  event: string;
  /** Host only. The full URL can carry a secret path segment. */
  target: string;
  status: number | null;
  attempt: number;
  at: Date;
}

export interface Collections {
  workspaces: Collection<WorkspaceDoc>;
  spaces: Collection<SpaceDoc>;
  testimonials: Collection<TestimonialDoc>;
  metrics: Collection<MetricDayDoc>;
  deliveries: Collection<WebhookDeliveryDoc>;
}

export function collections(db: Db): Collections {
  return {
    workspaces: db.collection<WorkspaceDoc>("workspaces"),
    spaces: db.collection<SpaceDoc>("spaces"),
    testimonials: db.collection<TestimonialDoc>("testimonials"),
    metrics: db.collection<MetricDayDoc>("metrics_daily"),
    deliveries: db.collection<WebhookDeliveryDoc>("webhook_deliveries"),
  };
}

export async function ensureIndexes(c: Collections): Promise<void> {
  await Promise.all([
    c.workspaces.createIndex({ slug: 1 }, { unique: true }),
    c.spaces.createIndex({ workspaceId: 1, slug: 1 }, { unique: true }),
    // Moderation queue, newest first, and the widget's approved list.
    c.testimonials.createIndex({ spaceId: 1, submittedAt: -1 }),
    c.testimonials.createIndex({ spaceId: 1, status: 1, featured: -1, submittedAt: -1 }),
    // Recovers queued AI jobs after a restart.
    c.testimonials.createIndex({ "ai.state": 1 }),
    c.metrics.createIndex({ spaceId: 1, day: 1 }, { unique: true }),
    c.deliveries.createIndex({ spaceId: 1, at: -1 }),
  ]);
}

export async function connect(uri: string, dbName: string): Promise<{ client: MongoClient; db: Db }> {
  const client = new MongoClient(uri, { appName: "reviewloop-api" });
  await client.connect();
  return { client, db: client.db(dbName) };
}
