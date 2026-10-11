import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { Generate } from "../src/ai/assist.js";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { collections, ensureIndexes } from "../src/db.js";
import { seedDemo } from "../src/seed/seed.js";
import type { WebhookSender } from "../src/webhooks.js";

export const SPACE = "aurora-studio/q3-client-wins";

let mem: MongoMemoryServer | undefined;
let client: MongoClient | undefined;

export async function startDb() {
  mem = await MongoMemoryServer.create();
  client = new MongoClient(mem.getUri());
  await client.connect();
}

export async function stopDb() {
  await client?.close();
  await mem?.stop();
}

/** A fresh, seeded database per test, so tests never share state. */
export async function makeApp(opts: { generate?: Generate | null; webhooks?: WebhookSender | null } = {}) {
  if (!client) throw new Error("call startDb() first");
  const db = client.db(`t_${Math.random().toString(36).slice(2)}`);
  const c = collections(db);
  await ensureIndexes(c);
  await seedDemo(c);
  const cfg = loadConfig({ NODE_ENV: "test" });
  const { app, ctx } = createApp({
    c,
    cfg,
    generate: opts.generate ?? null,
    webhooks: opts.webhooks ?? null,
    widgetBundlePath: "/nonexistent/v1.js",
  });
  return { app, ctx, c };
}

export const validSubmission = {
  name: "Ada Lovelace",
  role: "CTO",
  company: "Analytical Engines",
  rating: 5,
  answers: [
    "Our release process took two days and broke every other week.",
    "They rebuilt the pipeline in three weeks.",
    "We now ship every afternoon without anyone staying late.",
  ],
  consent: true,
};
