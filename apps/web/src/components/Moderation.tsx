import { useMemo, useState } from "react";
import type { Status, Testimonial } from "../lib/types";
import {
  Avatar,
  Button,
  Card,
  IconCheck,
  IconEyeOff,
  IconFlag,
  IconPlay,
  IconSearch,
  IconSpark,
  Pill,
  SectionHeading,
  Stars,
} from "./primitives";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const FILTERS: { key: Status | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Needs review" },
  { key: "approved", label: "Approved" },
  { key: "hidden", label: "Hidden" },
];

/**
 * Spam is an AI verdict, not a status. The status pill reports the real state
 * and the spam flag rides alongside it, so the row can never contradict itself.
 */
function StatusPill({ status }: { status: Status }) {
  if (status === "approved") return <Pill tone="good" icon={IconCheck(12)}>Approved</Pill>;
  if (status === "hidden") return <Pill tone="neutral" icon={IconEyeOff(12)}>Hidden</Pill>;
  return <Pill tone="warn">Needs review</Pill>;
}

function Row({
  t,
  selected,
  onSelect,
  onAssist,
  onStatus,
  onFeature,
}: {
  t: Testimonial;
  selected: boolean;
  onSelect: () => void;
  onAssist: () => void;
  onStatus: (s: Status) => void;
  onFeature: () => void;
}) {
  /** Spam rows need a second, deliberate click before they can be published. */
  const [confirming, setConfirming] = useState(false);

  function approve() {
    if (t.status === "approved") {
      onStatus("pending");
      return;
    }
    if (t.ai.spam && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onStatus("approved");
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        /* keydown bubbles up from the buttons nested in this row. Acting on
           those events cancels their own default activation, so the row must
           only handle keys aimed at the row itself. */
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-xl border p-4 transition-all ${
        selected
          ? "border-accent bg-accent-soft/30 shadow-[0_0_0_3px_rgba(74,58,167,0.08)]"
          : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <div className="flex gap-3.5">
        <Avatar name={t.name} tint={t.tint} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[14px] font-semibold text-ink">{t.name}</span>
            <span className="text-[13px] text-ink-3">
              {[t.role, t.company].filter((x) => x && x !== "-").join(", ") || "no details given"}
            </span>
            <Stars n={t.rating} />
            {t.featured && <Pill tone="accent" icon={IconSpark(11)}>Featured</Pill>}
          </div>

          <p className={`mt-2 text-[13.5px] leading-relaxed ${t.ai.spam ? "text-ink-3 italic" : "text-ink-2"}`}>
            {t.body.length > 210 && !selected ? `${t.body.slice(0, 210)}...` : t.body}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill status={t.status} />
            {t.ai.spam && <Pill tone="serious" icon={IconFlag(12)}>AI: spam</Pill>}
            {t.ai.state === "queued" && <Pill tone="accent" icon={IconSpark(11)}>AI scoring</Pill>}
            {t.ai.state === "failed" && <Pill tone="warn">AI could not score</Pill>}
            {t.medium === "video" && t.duration && (
              <Pill tone="neutral" icon={IconPlay(11)}>Video {t.duration}</Pill>
            )}
            {t.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-sunken px-2 py-1 text-[11.5px] text-ink-3">
                {tag}
              </span>
            ))}
            <time dateTime={t.submittedAt} className="ml-auto text-[11.5px] text-ink-3">
              {dateFmt.format(new Date(t.submittedAt))}
            </time>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Button
              variant={t.status === "approved" ? "primary" : "ghost"}
              onClick={approve}
              className={confirming ? "border-serious text-[#a62f2e]" : ""}
              title={
                t.ai.spam && t.status !== "approved"
                  ? "This one was flagged as spam. Publishing it puts it in the live widget."
                  : undefined
              }
            >
              {IconCheck()}
              {t.status === "approved"
                ? "Approved"
                : confirming
                  ? "Publish spam?"
                  : t.ai.spam
                    ? "Approve anyway"
                    : "Approve"}
            </Button>
            {confirming && (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[12px] font-medium text-ink-3 underline underline-offset-2 hover:text-ink"
              >
                Cancel
              </button>
            )}
            <Button
              variant="ghost"
              onClick={() => onStatus(t.status === "hidden" ? "pending" : "hidden")}
            >
              {IconEyeOff()}
              {t.status === "hidden" ? "Unhide" : "Hide"}
            </Button>
            {t.status === "approved" && !t.ai.spam && (
              <Button variant="quiet" onClick={onFeature} title="Show first in the widget">
                {IconSpark()}
                {t.featured ? "Featured" : "Feature"}
              </Button>
            )}
            <Button variant="quiet" onClick={onAssist} className="ml-auto">
              {IconSpark()}
              AI assist
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Heading plus the filter and search bar. Rendered by App above the two-column
 * grid so the queue and the AI panel start at the same y at every width.
 */
export function ModerationControls({
  items,
  filter,
  setFilter,
  q,
  setQ,
  onReset,
  resetting,
}: {
  items: Testimonial[];
  filter: Status | "all";
  setFilter: (f: Status | "all") => void;
  q: string;
  setQ: (q: string) => void;
  onReset: () => void;
  resetting: boolean;
}) {
  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((t) => t.status === "pending").length,
      approved: items.filter((t) => t.status === "approved").length,
      hidden: items.filter((t) => t.status === "hidden").length,
    }),
    [items],
  );

  return (
    <>
      <SectionHeading
        eyebrow="Moderation"
        title="Approve one and watch the widget below change"
        sub="Approve, hide or feature. Each click is a PATCH to the API; the widget below reads the same MongoDB documents."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                filter === f.key ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${filter === f.key ? "text-white/60" : "text-ink-3"}`}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={resetting}
          className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-50"
          title="Reseed the database: restores the sample queue and removes anything submitted"
        >
          {resetting ? "Resetting..." : "Reset demo"}
        </button>

        <label className="ml-auto flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 focus-within:border-accent sm:max-w-[260px]">
          <span className="text-ink-3">{IconSearch()}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, role, company, text"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
          />
        </label>
      </div>
    </>
  );
}

export default function Moderation({
  items,
  selectedId,
  onSelect,
  onAssist,
  onStatus,
  onFeature,
}: {
  items: Testimonial[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAssist: (id: string) => void;
  onStatus: (id: string, s: Status) => void;
  onFeature: (id: string) => void;
}) {
  return (
    <Card className="space-y-3 bg-ground/60 p-3">
      {items.map((t) => (
        <Row
          key={t.id}
          t={t}
          selected={t.id === selectedId}
          onSelect={() => onSelect(t.id)}
          onAssist={() => onAssist(t.id)}
          onStatus={(s) => onStatus(t.id, s)}
          onFeature={() => onFeature(t.id)}
        />
      ))}
      {items.length === 0 && (
        <p className="px-4 py-12 text-center text-[13.5px] text-ink-3">
          Nothing matches that filter.
        </p>
      )}
    </Card>
  );
}
