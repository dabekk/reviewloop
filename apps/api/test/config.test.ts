import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("treats empty optional variables as unset", () => {
    const cfg = loadConfig({ NODE_ENV: "test", WEBHOOK_URL: "", ANTHROPIC_API_KEY: "" });
    expect(cfg.WEBHOOK_URL).toBeUndefined();
    expect(cfg.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("refuses to start in production without a database", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/MONGODB_URI/);
  });
});
