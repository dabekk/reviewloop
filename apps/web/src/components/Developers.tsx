import { useCopy } from "../lib/useCopy";
import { useWebhooks } from "../lib/queries";
import { Button, Card, IconCheck, IconCopy, Pill, SectionHeading } from "./primitives";

const timeFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const KEYS = [
  { name: "Production", prefix: "rl_live_9f2a", scope: "read:testimonials, write:spaces", used: "4 min ago", limit: "600 / min" },
  { name: "Zapier", prefix: "rl_live_c41d", scope: "read:testimonials", used: "1 hour ago", limit: "120 / min" },
  { name: "Staging", prefix: "rl_test_77b0", scope: "read:testimonials", used: "12 Sep", limit: "60 / min" },
];

const WEBHOOK = `POST https://hooks.zapier.com/hooks/catch/...
x-reviewloop-event: testimonial.submitted
x-reviewloop-signature: t=1760216482,v1=6b1f...c07e

{
  "event": "testimonial.submitted",
  "id": "evt_6f0c2a4e-...",
  "created_at": "2026-10-11T21:41:22.000Z",
  "space": { "slug": "aurora-studio/q3-client-wins", "name": "Q3 Client Wins" },
  "testimonial": {
    "id": "0b6e1f9a-...",
    "name": "Priya Raghunathan",
    "role": "Head of Product",
    "company": "Northwind Logistics",
    "rating": 5,
    "body": "We came to Aurora with a half-finished design system...",
    "review_url": "https://automatemonday.com/reviewloop/#moderation"
  }
}`;


export default function Developers() {
  const { copied, copy } = useCopy();
  const hooks = useWebhooks();
  const deliveries = hooks.data?.deliveries ?? [];

  return (
    <section id="developers" className="mx-auto max-w-[1240px] scroll-mt-[128px] px-5 pt-16 lg:scroll-mt-20">
      <SectionHeading
        eyebrow="Developers"
        title="Keys, rate limits, and a signed webhook per submission"
        sub="The submission webhook is live: signed with HMAC-SHA256, retried with backoff, and flat enough for Zapier to map without a code step. API keys are milestone 4; the key list is a preview."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-ink">API keys</span>
            <Pill tone="neutral">Preview, milestone 4</Pill>
          </div>
          <div className="divide-y divide-line">
            {KEYS.map((k) => (
              <div key={k.prefix} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink">{k.name}</div>
                  <code className="break-all font-mono text-[12px] text-ink-3">{k.prefix}&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;</code>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[12.5px] text-ink-2">{k.limit}</div>
                  <div className="text-[11.5px] text-ink-3">used {k.used}</div>
                </div>
                <div className="w-full text-[11.5px] text-ink-3">{k.scope}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.1em] text-ink-3">
              Webhook deliveries, live
            </div>
            {deliveries.length === 0 && (
              <p className="text-[12.5px] leading-relaxed text-ink-3">
                {hooks.data?.configured
                  ? "No deliveries yet. Submit a testimonial through the collection link to fire one."
                  : "No webhook URL is set on this server, so nothing is sent. Set WEBHOOK_URL to a Zapier or webhook.site URL to see deliveries here."}
              </p>
            )}
            <div className="space-y-2">
              {deliveries.map((d) => {
                const ok = d.status !== null && d.status >= 200 && d.status < 300;
                return (
                  <div key={d.id} className="flex items-center gap-3 text-[12.5px]">
                    <span
                      className={`inline-flex w-11 justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                        ok ? "bg-good-soft text-[#0f7a53]" : "bg-serious-soft text-[#a62f2e]"
                      }`}
                    >
                      {d.status ?? "ERR"}
                    </span>
                    <span className="min-w-0 truncate font-mono text-ink-2">
                      {d.event}
                      {d.attempt > 1 && <span className="text-ink-3"> (try {d.attempt})</span>}
                    </span>
                    <span className="ml-auto shrink-0 text-ink-3">{timeFmt.format(new Date(d.at))}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11.5px] text-ink-3">
              A failed delivery is retried twice more, after 2 and 8 seconds. Every attempt is logged here.
            </p>
          </div>
        </Card>

        <Card className="flex min-w-0 flex-col p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-ink">Webhook payload</span>
            <Button variant="ghost" onClick={() => copy(WEBHOOK)}>
              {copied ? IconCheck() : IconCopy()}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="flex-1 overflow-auto rounded-xl bg-ink p-4 font-mono text-[11.5px] leading-relaxed text-[#d8d4ea]">
            {WEBHOOK}
          </pre>
        </Card>
      </div>
    </section>
  );
}
