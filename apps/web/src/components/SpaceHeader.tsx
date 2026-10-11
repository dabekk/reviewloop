import type { SpaceDetail } from "@reviewloop/shared";
import { collectionLink } from "../lib/api";
import { useCopy } from "../lib/useCopy";
import { Button, Card, IconArrow, IconCheck, IconCopy, Pill } from "./primitives";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function SpaceHeader({ detail }: { detail: SpaceDetail }) {
  const { copied, copy } = useCopy();
  const { workspace, space, counts } = detail;
  const link = collectionLink();

  return (
    <section id="space" className="mx-auto max-w-[1240px] scroll-mt-[128px] px-5 pt-10 lg:scroll-mt-24">
      <Card className="overflow-hidden">
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${space.brandColor}, #7a68e0 55%, #1baf7a)` }}
        />
        <div className="grid gap-8 p-7 lg:grid-cols-[1.35fr_1fr]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Pill tone="accent">Collection space</Pill>
              <Pill tone="neutral">{workspace.name}</Pill>
              {space.expiresAt && (
                <Pill tone="neutral">Link expires {dateFmt.format(new Date(space.expiresAt))}</Pill>
              )}
            </div>

            <h2 className="font-serif text-[28px] leading-[1.12] tracking-[-0.015em] text-ink">
              {space.name}
            </h2>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-2.5">
                <span className="shrink-0 text-ink-3">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M6.6 9.4a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 1 0-4-4l-.6.6" />
                      <path d="M9.4 6.6a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 1 0 4 4l.6-.6" />
                    </g>
                  </svg>
                </span>
                <code className="truncate font-mono text-[12.5px] text-ink-2">{link}</code>
              </div>
              <Button variant="ghost" onClick={() => copy(link)}>
                {copied ? IconCheck() : IconCopy()}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <a
                href={link}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-deep"
              >
                Open as a client
                {IconArrow(12)}
              </a>
            </div>
            <p className="mt-2 text-[12px] text-ink-3">
              This link works. Submit a testimonial there and it lands in the queue below as Needs
              review.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-sunken/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                What clients are asked
              </span>
              <span className="text-[11.5px] text-ink-3">{space.questions.length} questions</span>
            </div>
            <ol className="space-y-2.5">
              {space.questions.map((q, i) => (
                <li key={q} className="flex gap-3 text-[13.5px] leading-snug text-ink-2">
                  <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[11px] font-semibold text-accent">
                    {i + 1}
                  </span>
                  {q}
                </li>
              ))}
            </ol>
            <div className="mt-5 flex items-center gap-4 border-t border-line pt-4 text-[12.5px] text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-good" aria-hidden />
                {counts.approved} approved
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warn" aria-hidden />
                {counts.pending} awaiting review
              </span>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
