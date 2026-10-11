/** `npm run seed`: resets the demo workspace in the database MONGODB_URI points at. */
import { loadConfig } from "../config.js";
import { collections, connect, ensureIndexes } from "../db.js";
import { seedDemo } from "./seed.js";

const cfg = loadConfig();
if (!cfg.MONGODB_URI) {
  console.error("Set MONGODB_URI (in apps/api/.env) to seed a real database.");
  process.exit(1);
}
const { client, db } = await connect(cfg.MONGODB_URI, cfg.MONGODB_DB);
try {
  const c = collections(db);
  await ensureIndexes(c);
  await seedDemo(c);
  console.log(`Seeded the demo workspace into "${cfg.MONGODB_DB}".`);
} finally {
  await client.close();
}
