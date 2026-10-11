import { createHmac, randomUUID } from "node:crypto";
import type { WebhookPayload } from "@reviewloop/shared";
import type { Collections } from "./db.js";

/** Delays before each attempt. Three attempts, then the failure stays in the log. */
const BACKOFF_MS = [0, 2_000, 8_000];

/**
 * Stripe-style signature: HMAC-SHA256 over `${timestamp}.${body}`. The
 * receiver recomputes it with the shared secret and rejects stale timestamps.
 */
export function sign(secret: string, timestamp: number, body: string): string {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

export interface WebhookSender {
  send(spaceId: string, payload: WebhookPayload): Promise<void>;
}

export function webhookSender(
  c: Collections,
  url: string,
  secret: string,
  fetchImpl: typeof fetch = fetch,
  backoff: number[] = BACKOFF_MS,
): WebhookSender {
  const target = new URL(url).host;
  return {
    async send(spaceId, payload) {
      const body = JSON.stringify(payload);
      for (let i = 0; i < backoff.length; i++) {
        if (backoff[i]) await new Promise((r) => setTimeout(r, backoff[i]));
        let status: number | null = null;
        try {
          const res = await fetchImpl(url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "user-agent": "ReviewLoop-Webhooks/1",
              "x-reviewloop-event": payload.event,
              "x-reviewloop-signature": sign(secret, Math.floor(Date.now() / 1000), body),
            },
            body,
            signal: AbortSignal.timeout(5_000),
          });
          status = res.status;
        } catch {
          status = null; // timeout or network failure
        }
        await c.deliveries.insertOne({
          _id: randomUUID(),
          spaceId,
          event: payload.event,
          target,
          status,
          attempt: i + 1,
          at: new Date(),
        });
        if (status !== null && status >= 200 && status < 300) return;
      }
    },
  };
}
