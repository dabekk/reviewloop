import { useState } from "react";
import { AI_TOOL_SCHEMA } from "../lib/data";
import type { Testimonial } from "../lib/types";
import { Button, Card, IconCheck, IconCopy, IconFlag, IconSpark, Pill } from "./primitives";
import { useCopy } from "../lib/useCopy";
import { useRescore } from "../lib/queries";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function QualityMeter({ score }: { score: number }) {
  const band = score >= 80 ? "Publish-ready" : score >= 60 ? "Usable with edits" : "Not recommended";
  const tone = score >= 80 ? "var(--color-good)" : score >= 60 ? "var(--color-warn)" : "var(--color-serious)";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-3">
          Quality score
        </span>
        <span className="text-[13px] font-semibold text-ink">
          {score}
          <span className="font-medium text-ink-3">/100 &middot; {band}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${score}%`, background: tone }}
        />
      </div>
    </div>
  );
}

export default function AiPanel({
  t,
  aiEnabled,
  aiModel,
}: {
  t: Testimonial;
  aiEnabled: boolean;
  aiModel: string | null;
}) {
  const [showSchema, setShowSchema] = useState(false);
  const { copied, copy } = useCopy();
  const rescore = useRescore();
  const modelLabel = t.ai.model === "sample" ? "sample output" : (t.ai.model ?? aiModel ?? "not configured");
  const canRescore = aiEnabled && t.ai.state !== "queued";

  return (
    <div className="lg:sticky lg:top-24">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line bg-accent-soft/50 px-5 py-3.5">
          <span className="text-accent">{IconSpark(15)}</span>
          <span className="text-[13.5px] font-semibold text-ink">AI assist</span>
          <span className="ml-auto font-mono text-[11px] text-ink-3">{modelLabel}</span>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="text-[12px] text-ink-3">Reviewing</div>
            <div className="text-[14px] font-semibold text-ink">{t.name}</div>
            <div className="text-[12.5px] text-ink-3">
              {t.company && t.company !== "-" ? t.company : "no company given"} &middot;{" "}
              {dateFmt.format(new Date(t.submittedAt))}
            </div>
          </div>

          {t.ai.state === "queued" && (
            <div className="rounded-xl border border-line bg-sunken/60 p-4" role="status">
              <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
                Scoring with {aiModel}
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                This runs as a background job after submission. The panel fills in by itself.
              </p>
            </div>
          )}

          {t.ai.state === "off" && (
            <div className="rounded-xl border border-line bg-sunken/60 p-4">
              <div className="mb-1 text-[13px] font-semibold text-ink">Not scored</div>
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                {aiEnabled
                  ? "This arrived while AI assist was switched off."
                  : "AI assist is switched off on this server, so new submissions are stored unscored and moderated by hand."}
              </p>
            </div>
          )}

          {t.ai.state === "failed" && (
            <div className="rounded-xl border border-[#f0dcae] bg-warn-soft p-4">
              <div className="mb-1 text-[13px] font-semibold text-[#8a5d00]">Parked for a human</div>
              <p className="text-[12.5px] leading-relaxed text-[#6e4a00]">
                The model's answer failed validation after {t.ai.attempts}{" "}
                {t.ai.attempts === 1 ? "attempt" : "attempts"}, so nothing was saved from it. The
                testimonial stays in the queue for you to review.
              </p>
              {t.ai.error && (
                <p className="mt-2 break-words font-mono text-[11.5px] text-[#6e4a00]">{t.ai.error}</p>
              )}
            </div>
          )}

          {t.ai.state === "done" && t.ai.quality !== null && <QualityMeter score={t.ai.quality} />}

          {t.ai.state === "done" &&
            (t.ai.spam ? (
            <div className="rounded-xl border border-[#f3caca] bg-serious-soft p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[#a62f2e]">
                {IconFlag(13)} Held as spam
              </div>
              <p className="text-[13px] leading-relaxed text-[#8d2c2b]">{t.ai.rationale}</p>
            </div>
          ) : (
            <>
              <div>
                <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.1em] text-ink-3">
                  Suggested headline
                </div>
                <p className="text-[15px] font-semibold leading-snug text-ink">{t.ai.headline}</p>
              </div>

              <div>
                <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.1em] text-ink-3">
                  Pull-quote for the widget
                </div>
                <blockquote className="rounded-xl border border-line bg-sunken/70 p-4 font-serif text-[16px] leading-snug text-ink">
                  &ldquo;{t.ai.pullQuote}&rdquo;
                </blockquote>
              </div>

              <div>
                <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.1em] text-ink-3">
                  Why
                </div>
                <p className="text-[13px] leading-relaxed text-ink-2">{t.ai.rationale}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {t.ai.sentiment && (
                  <Pill tone={t.ai.sentiment === "positive" ? "good" : "warn"} icon={IconCheck(11)}>
                    {t.ai.sentiment}
                  </Pill>
                )}
                {t.ai.topics.map((x) => (
                  <Pill key={x} tone="neutral">
                    {x}
                  </Pill>
                ))}
              </div>
            </>
          ))}

          {canRescore && (
            <Button
              variant="ghost"
              onClick={() => rescore.mutate(t.id)}
              disabled={rescore.isPending}
              title="Queue this testimonial for a fresh AI pass"
            >
              {IconSpark()}
              {t.ai.state === "done" ? "Score again" : "Score now"}
            </Button>
          )}

          <div className="border-t border-line pt-4">
            <Button variant="quiet" onClick={() => setShowSchema((s) => !s)} className="px-0">
              {showSchema ? "Hide" : "Show"} how this call is made
            </Button>
            {showSchema && (
              <div className="rl-enter mt-3">
                <p className="mb-2 text-[12.5px] leading-relaxed text-ink-2">
                  Structured outputs constrain the response to the schema. The API then re-parses
                  it with Zod and checks the pull-quote really is in the testimonial. One retry
                  with the reason attached, then the submission is parked for a human.
                </p>
                <div className="relative">
                  <pre className="max-h-[300px] overflow-auto rounded-xl bg-ink p-4 font-mono text-[11.5px] leading-relaxed text-[#d8d4ea]">
                    {AI_TOOL_SCHEMA}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copy(AI_TOOL_SCHEMA)}
                    className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11.5px] font-medium text-white transition-colors hover:bg-white/20"
                  >
                    {copied ? IconCheck(12) : IconCopy(12)}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
