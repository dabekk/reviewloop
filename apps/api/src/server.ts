import type { Server } from "node:http";
import { anthropicGenerate } from "./ai/anthropic.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { collections, connect, ensureIndexes } from "./db.js";
import { seedDemo } from "./seed/seed.js";
import { webhookSender } from "./webhooks.js";

const cfg = loadConfig();

let uri = cfg.MONGODB_URI;
let stopMemoryServer: (() => Promise<unknown>) | undefined;
if (!uri) {
  // Local development without Atlas: a throwaway MongoDB, seeded on boot.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mem = await MongoMemoryServer.create();
  uri = mem.getUri();
  stopMemoryServer = () => mem.stop();
  console.log("MONGODB_URI not set: using an in-memory MongoDB with the demo data.");
}

const { client, db } = await connect(uri, cfg.MONGODB_DB);
const c = collections(db);
await ensureIndexes(c);
if (stopMemoryServer || (await c.workspaces.countDocuments()) === 0) await seedDemo(c);

const { app, ctx } = createApp({
  c,
  cfg,
  database: stopMemoryServer ? "memory" : "atlas",
  generate: cfg.ANTHROPIC_API_KEY ? anthropicGenerate(cfg.ANTHROPIC_API_KEY, cfg.ANTHROPIC_MODEL) : null,
  webhooks: cfg.WEBHOOK_URL ? webhookSender(c, cfg.WEBHOOK_URL, cfg.WEBHOOK_SECRET) : null,
});

// Jobs left queued by a restart or deploy are picked up again.
const leftover = await c.testimonials.find({ "ai.state": "queued" }, { projection: { _id: 1 } }).toArray();
leftover.forEach((t) => ctx.queue.enqueue(t._id));

const server: Server = app.listen(cfg.PORT, () => {
  console.log(`ReviewLoop API on http://localhost:${cfg.PORT} (AI assist ${ctx.aiEnabled ? "on" : "off"})`);
});

async function shutdown() {
  server.close();
  await ctx.queue.idle();
  await client.close();
  await stopMemoryServer?.();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
