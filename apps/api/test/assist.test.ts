import { describe, expect, it, vi } from "vitest";
import { checkAssist, type AssistOutput } from "@reviewloop/shared";
import { runAssist, type Generate } from "../src/ai/assist.js";

const body = "They rebuilt the pipeline in three weeks. We now ship every afternoon.";
const ok: AssistOutput = {
  pull_quote: "We now ship every afternoon.",
  headline: "Daily releases in three weeks",
  quality: 90,
  spam: false,
  sentiment: "positive",
  topics: [],
  rationale: "Specific.",
};

describe("runAssist", () => {
  it("returns the first valid answer", async () => {
    const generate = vi.fn<Generate>(async () => ok);
    const r = await runAssist(generate, body);
    expect(r).toMatchObject({ ok: true, attempts: 1 });
  });

  it("retries once with the reason when the shape is wrong", async () => {
    const generate = vi.fn<Generate>().mockResolvedValueOnce({ quality: "high" }).mockResolvedValueOnce(ok);
    const r = await runAssist(generate, body);
    expect(r).toMatchObject({ ok: true, attempts: 2 });
    expect(generate.mock.calls[1]?.[0].retryReason).toBeTruthy();
  });

  it("treats an unparseable response as a retryable failure", async () => {
    const generate = vi.fn<Generate>().mockResolvedValueOnce(null).mockResolvedValueOnce(ok);
    expect(await runAssist(generate, body)).toMatchObject({ ok: true, attempts: 2 });
  });

  it("does not retry an API error, which the SDK has already retried", async () => {
    const generate = vi.fn<Generate>(async () => {
      throw new Error("401 invalid x-api-key");
    });
    const r = await runAssist(generate, body);
    expect(r).toMatchObject({ ok: false, attempts: 1 });
    expect(generate).toHaveBeenCalledOnce();
  });
});

describe("checkAssist", () => {
  it("accepts a quote that differs only in curly quotes and spacing", () => {
    expect(checkAssist({ ...ok, pull_quote: "We now  ship every\nafternoon" }, body)).toEqual([]);
  });

  it("rejects a quote the client did not write", () => {
    expect(checkAssist({ ...ok, pull_quote: "Best agency ever." }, body)).toHaveLength(1);
  });

  it("allows empty fields when the submission is spam", () => {
    expect(checkAssist({ ...ok, spam: true, pull_quote: "", headline: "" }, "buy backlinks")).toEqual([]);
  });
});
