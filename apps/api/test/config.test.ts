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

describe("PORT", () => {
  it("accepts a number or the socket path some hosts pass instead", () => {
    expect(loadConfig({ NODE_ENV: "test", PORT: "3000" }).PORT).toBe(3000);
    expect(loadConfig({ NODE_ENV: "test", PORT: "/tmp/lsnode.sock" }).PORT).toBe("/tmp/lsnode.sock");
    expect(loadConfig({ NODE_ENV: "test" }).PORT).toBe(8787);
  });
});
