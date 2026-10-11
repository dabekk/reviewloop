import type { SpaceDetail } from "@reviewloop/shared";
import { Avatar } from "./primitives";

const NAV = [
  { label: "Spaces", href: "#space" },
  { label: "Analytics", href: "#analytics" },
  { label: "Moderation", href: "#moderation" },
  { label: "Widget", href: "#widget" },
  { label: "Developers", href: "#developers" },
];

export default function TopBar({ workspace }: { workspace?: SpaceDetail["workspace"] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5">
        <div className="flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
            <path
              d="M11 10h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5l-5 4v-4a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z"
              fill="#fff"
            />
            <circle cx="13.5" cy="15.5" r="1.4" fill="var(--color-accent)" />
            <circle cx="18.5" cy="15.5" r="1.4" fill="var(--color-accent)" />
          </svg>
          <span className="text-[16px] font-semibold tracking-[-0.015em]">ReviewLoop</span>
        </div>

        <div className="hidden h-6 w-px bg-line md:block" />

        {workspace && (
          <span className="hidden items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-medium md:inline-flex">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-ink text-[10px] font-bold text-white">
              {workspace.name.charAt(0)}
            </span>
            {workspace.name}
          </span>
        )}

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="rounded-lg px-3 py-1.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-4">
          <div className="hidden gap-1 sm:flex">
            {workspace?.members.map((m) => (
              <div key={m.name} className="rounded-full" title={`${m.name} - ${m.role}`}>
                <Avatar name={m.name} tint={m.tint} size={28} />
              </div>
            ))}
          </div>
          <span className="rounded-full border border-line bg-sunken px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Demo
          </span>
        </div>
      </div>

      {/* Below lg the desktop nav is hidden, so the page would have no way to
          move between sections. A scrollable chip row costs one header row. */}
      <nav
        aria-label="Sections"
        className="rl-noscrollbar flex gap-1 overflow-x-auto border-t border-line px-5 py-2 lg:hidden"
      >
        {NAV.map((n) => (
          <a
            key={n.label}
            href={n.href}
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
          >
            {n.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
