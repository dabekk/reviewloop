import type { ReactNode } from "react";
import { AVATAR_TINTS } from "../lib/data";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(23,22,20,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
          {eyebrow}
        </div>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {sub && <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Avatar({
  name,
  tint,
  size = 40,
}: {
  name: string;
  tint: number;
  size?: number;
}) {
  const t = AVATAR_TINTS[tint % AVATAR_TINTS.length] ?? { bg: "#efeeea", fg: "#57544e" };
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        background: t.bg,
        color: t.fg,
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </div>
  );
}

export function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-px" aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16" aria-hidden>
          <path
            d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6z"
            fill={i < n ? "var(--color-warn)" : "var(--color-line-strong)"}
          />
        </svg>
      ))}
    </span>
  );
}

type Tone = "neutral" | "good" | "warn" | "serious" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2 border-line",
  good: "bg-good-soft text-[#0f7a53] border-[#c4e9d9]",
  warn: "bg-warn-soft text-[#8a5d00] border-[#f0dcae]",
  serious: "bg-serious-soft text-[#a62f2e] border-[#f3caca]",
  accent: "bg-accent-soft text-accent border-[#d8d2f4]",
};

export function Pill({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium leading-none ${TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  className = "",
  title,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "quiet";
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-accent text-white hover:bg-accent-deep border-transparent",
    ghost: "bg-surface text-ink border-line hover:border-line-strong hover:bg-sunken",
    quiet: "bg-transparent text-ink-2 border-transparent hover:bg-sunken hover:text-ink",
  }[variant];
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/* Icons - 1.6px stroke, sized to the text they sit beside. */
const ico = (d: ReactNode, s = 14) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden>
    {d}
  </svg>
);

export const IconCheck = (s?: number) =>
  ico(
    <path d="M3 8.5l3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
    s,
  );
export const IconEyeOff = (s?: number) =>
  ico(
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 8s2.4-4 6-4c1 0 1.9.3 2.7.8M14 8s-2.4 4-6 4c-1 0-1.9-.3-2.7-.8" />
      <path d="M2.5 13.5l11-11" />
    </g>,
    s,
  );
export const IconPlay = (s?: number) =>
  ico(<path d="M5.5 3.8l6.5 4.2-6.5 4.2z" fill="currentColor" />, s);
export const IconSpark = (s?: number) =>
  ico(
    <path
      d="M8 1.5l1.5 4.1 4.1 1.5-4.1 1.5L8 12.7 6.5 8.6 2.4 7.1l4.1-1.5z"
      fill="currentColor"
    />,
    s,
  );
export const IconFlag = (s?: number) =>
  ico(
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14V2.8" />
      <path d="M4 3h8l-1.6 2.6L12 8.2H4z" fill="currentColor" fillOpacity=".18" />
    </g>,
    s,
  );
export const IconClock = (s?: number) =>
  ico(
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 4.8V8l2.2 1.6" />
    </g>,
    s,
  );
export const IconCopy = (s?: number) =>
  ico(
    <g stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" />
      <path d="M10.5 3.5H4.3c-.5 0-.8.4-.8.8v6.2" strokeLinecap="round" />
    </g>,
    s,
  );
export const IconSearch = (s?: number) =>
  ico(
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="7.2" cy="7.2" r="4.4" />
      <path d="M10.6 10.6L14 14" />
    </g>,
    s,
  );
export const IconArrow = (s?: number) =>
  ico(
    <path d="M3.5 8h9M9 4.5L12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
    s,
  );
