import { useEffect, useRef, useState } from "react";
import { mount, type Layout, type Theme } from "@reviewloop/widget";
import type { Testimonial } from "../lib/types";
import { embedSnippet } from "../lib/data";
import { API_ORIGIN, DEMO_KEY } from "../lib/api";
import { Button, Card, IconArrow, IconCheck, IconCopy, SectionHeading } from "./primitives";
import { useCopy } from "../lib/useCopy";
import { WIDGET_KEY, load, save } from "../lib/persist";

const LAYOUTS: { key: Layout; label: string }[] = [
  { key: "grid", label: "Grid" },
  { key: "carousel", label: "Carousel" },
  { key: "single", label: "Single quote" },
];

/** Host-page colours for the mock site around the widget. The widget brings its own. */
const SKIN = {
  light: { border: "#e4e2dd", ink: "#171614", ink2: "#57544e", ink3: "#8a8680", ground: "#f6f5f3" },
  dark: { border: "#33313d", ink: "#f4f3f7", ink2: "#b6b3c2", ink3: "#86828f", ground: "#111016" },
} as const;

/**
 * Real hostile CSS, injected into this document and aimed at the mock host
 * page. It hits every light-DOM element there, including the widget's host
 * element, and none of it gets into the shadow root.
 */
const HOSTILE_CSS = `
.rl-host, .rl-host * {
  font-family: "Comic Sans MS", "Comic Sans", cursive !important;
  color: #d91e1e !important;
  text-transform: uppercase !important;
  letter-spacing: 0.06em !important;
  line-height: 2.2 !important;
}
.rl-host div, .rl-host reviewloop-widget {
  border: 2px dotted #d91e1e !important;
  background: #fff6a8 !important;
  padding: 8px !important;
}
.rl-host p, .rl-host h3 { font-size: 22px !important; }
`;

const WIDGET_DEFAULTS = { layout: "grid" as Layout, theme: "light" as Theme };

/** Re-keyed by App on Reset demo, so the controls return to their defaults. */
export default function WidgetPreview({ approved }: { approved: Testimonial[] }) {
  const [layout, setLayout] = useState<Layout>(() => load(WIDGET_KEY, WIDGET_DEFAULTS).layout);
  const [theme, setTheme] = useState<Theme>(() => load(WIDGET_KEY, WIDGET_DEFAULTS).theme);
  const [hostile, setHostile] = useState(false);
  const { copied, copy } = useCopy();
  const slot = useRef<HTMLDivElement>(null);
  const s = SKIN[theme];

  useEffect(() => {
    save(WIDGET_KEY, { layout, theme });
  }, [layout, theme]);

  /* Changes whenever moderation changes what the widget should show. The
     widget fetches its own data, exactly as it does on a client's site, so
     it is re-mounted rather than handed the list. */
  const version = approved
    .map((t) => `${t.id}:${Number(t.featured)}:${t.ai.state === "done" ? t.ai.pullQuote.length : 0}`)
    .join(",");

  useEffect(() => {
    const container = slot.current;
    if (!container) return;
    const host = document.createElement("reviewloop-widget");
    container.replaceChildren(host);
    const widget = mount(host, {
      space: DEMO_KEY,
      apiBase: API_ORIGIN,
      layout,
      theme,
      lazy: false,
      track: false,
      revalidate: true,
      emptyText: "Nothing approved yet. Approve a testimonial above and it appears here.",
    });
    return () => {
      widget.destroy();
      host.remove();
    };
  }, [layout, theme, version]);

  useEffect(() => {
    if (!hostile) return;
    const style = document.createElement("style");
    style.textContent = HOSTILE_CSS;
    document.head.append(style);
    return () => style.remove();
  }, [hostile]);

  const snippet = embedSnippet({ origin: API_ORIGIN, space: DEMO_KEY, layout, theme });
  const demoPage = `${API_ORIGIN}/w/demo?layout=${layout}&theme=${theme}`;

  return (
    <section id="widget" className="mx-auto max-w-[1240px] scroll-mt-[128px] px-5 pt-16 lg:scroll-mt-20">
      <SectionHeading
        eyebrow="Embeddable widget"
        title="One script tag, three layouts, no CSS collisions"
        sub="This is the real widget, mounted into a closed shadow root. Flip the hostile-CSS switch: real !important rules hit the host page and the widget's host element, and the widget does not move."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
              {LAYOUTS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  aria-pressed={layout === l.key}
                  onClick={() => setLayout(l.key)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    layout === l.key ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
              {(["light", "dark"] as Theme[]).map((th) => (
                <button
                  key={th}
                  type="button"
                  aria-pressed={theme === th}
                  onClick={() => setTheme(th)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                    theme === th ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken"
                  }`}
                >
                  {th}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <Card className="overflow-hidden">
        {/* Mock browser chrome for the host site */}
        <div className="flex items-center gap-3 border-b border-line bg-sunken px-4 py-2.5">
          <div className="flex gap-1.5">
            {["#e35b5a", "#eab54a", "#54c07a"].map((c) => (
              <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div className="flex-1 truncate rounded-md border border-line bg-surface px-3 py-1 text-center font-mono text-[11.5px] text-ink-3">
            aurorastudio.com/work
          </div>
          <label className="flex cursor-pointer select-none items-center gap-2 text-[12px] font-medium text-ink-2">
            <input
              type="checkbox"
              checked={hostile}
              onChange={(e) => setHostile(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
            Inject hostile host CSS
          </label>
        </div>

        {/* The host page. Everything inside .rl-host is "someone else's site". */}
        <div className="rl-host p-6 sm:p-9" style={{ background: s.ground }}>
          <div className="mx-auto max-w-[880px]">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: s.ink3 }}>
              Host page content
            </p>
            <h3 className="mb-6 text-[24px] font-semibold tracking-[-0.01em]" style={{ color: s.ink }}>
              What our clients say about working with us
            </h3>

            <div
              ref={slot}
              aria-live="polite"
              // Custom properties cross the shadow boundary on purpose: they
              // are the widget's theming API. This one matches the dashboard font.
              style={{ ["--reviewloop-quote-font" as string]: '"Instrument Serif", Georgia, serif' }}
            />

            <p className="mt-6 text-[13.5px] leading-relaxed" style={{ color: s.ink2 }}>
              More host page content sitting below the embed. This paragraph inherits whatever the
              host site's stylesheet says, which is exactly the point.
            </p>
          </div>
        </div>

        {/* Embed snippet */}
        <div className="border-t border-line bg-surface p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-ink">Embed code</div>
              <p className="text-[12.5px] text-ink-3">
                Works on any site. Approved testimonials are cached on the server and at the edge
                with an ETag, and the cache is cleared on every moderation change.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={demoPage}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken"
              >
                Try it on a hostile page
                {IconArrow(12)}
              </a>
              <Button variant="ghost" onClick={() => copy(snippet)}>
                {copied ? IconCheck() : IconCopy()}
                {copied ? "Copied" : "Copy snippet"}
              </Button>
            </div>
          </div>
          <pre className="overflow-auto rounded-xl bg-ink p-4 font-mono text-[12px] leading-relaxed text-[#d8d4ea]">
            {snippet}
          </pre>
        </div>
      </Card>
    </section>
  );
}
