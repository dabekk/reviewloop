import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(8787),
  /** Unset in development means an in-memory MongoDB, seeded on boot. */
  MONGODB_URI: z.string().optional(),
  MONGODB_DB: z.string().default("reviewloop"),
  /** Comma-separated origins allowed to call the dashboard API. */
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  /** Where the dashboard lives, used for links in webhook payloads. */
  PUBLIC_APP_URL: z.string().url().default("http://localhost:5173/"),
  /** Unset means AI assist is off and new submissions are marked as unscored. */
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  /** Unset means no webhook is fired. */
  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().default("whsec_dev_only_change_me"),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  const cfg = parsed.data;
  if (cfg.NODE_ENV === "production" && !cfg.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in production");
  }
  return cfg;
}
