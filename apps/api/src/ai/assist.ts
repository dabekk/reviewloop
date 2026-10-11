import { z } from "zod";
import { AssistOutput, checkAssist } from "@reviewloop/shared";

/**
 * One model call. `retryReason` is set on the second attempt and carries the
 * validation problems from the first, so the model can correct itself.
 * Returns the parsed JSON, or null when the response could not be parsed.
 */
export type Generate = (input: { body: string; retryReason?: string }) => Promise<unknown>;

export type AssistResult =
  | { ok: true; output: AssistOutput; attempts: number }
  | { ok: false; error: string; attempts: number };

/**
 * Structured outputs make the shape reliable. This makes the answer reliable:
 * every response is re-parsed with Zod and checked against the testimonial,
 * and a failure gets exactly one retry with the reason attached. After that
 * the caller parks the testimonial for a human. AI never blocks a submission.
 */
export async function runAssist(generate: Generate, body: string, maxAttempts = 2): Promise<AssistResult> {
  let reason: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let raw: unknown;
    try {
      raw = await generate({ body, retryReason: reason });
    } catch (err) {
      // The SDK has already retried rate limits and 5xx responses with
      // backoff. Anything that reaches here will not be fixed by asking again.
      return { ok: false, error: err instanceof Error ? err.message : String(err), attempts: attempt };
    }
    const parsed = AssistOutput.safeParse(raw);
    if (!parsed.success) {
      reason = raw === null ? "the response was not valid JSON" : z.prettifyError(parsed.error);
      continue;
    }
    const problems = checkAssist(parsed.data, body);
    if (problems.length > 0) {
      reason = problems.join("; ");
      continue;
    }
    return { ok: true, output: parsed.data, attempts: attempt };
  }
  return { ok: false, error: `Failed validation twice: ${reason ?? "unknown"}`, attempts: maxAttempts };
}
