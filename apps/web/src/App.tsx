import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Status, Testimonial } from "./lib/types";
import { WIDGET_KEY, clear } from "./lib/persist";
import { useModerate, useResetDemo, useSpace, useTestimonials } from "./lib/queries";
import TopBar from "./components/TopBar";
import SpaceHeader from "./components/SpaceHeader";
import Analytics from "./components/Analytics";
import Moderation, { ModerationControls } from "./components/Moderation";
import AiPanel from "./components/AiPanel";
import WidgetPreview from "./components/WidgetPreview";
import Developers from "./components/Developers";
import Footer from "./components/Footer";

/** Filter plus free-text search. Role is searchable because the row displays it. */
function matches(t: Testimonial, filter: Status | "all", q: string) {
  if (filter !== "all" && t.status !== filter) return false;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [t.name, t.role, t.company, t.body, ...t.tags].join(" ").toLowerCase().includes(needle);
}

export default function App() {
  const space = useSpace();
  const list = useTestimonials();
  const moderate = useModerate();
  const reset = useResetDemo();
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  /** Below lg the AI panel is a bottom sheet, so it needs an open state. */
  const [panelOpen, setPanelOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const ready = Boolean(space.data && list.data);

  /* A hash in the URL resolves before React has mounted the target, so the
     browser lands at the top. Re-run it once the tree exists - and again once
     the layout has settled, because the web fonts reflow the page by about
     90px after first paint and a single rAF lands against the pre-settle
     height. Stops the moment the reader scrolls for themselves. Waits for
     the first API response, since the sections do not exist before it. */
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id || !ready) return;
    let live = true;
    const stop = () => {
      live = false;
    };
    const land = () => {
      if (!live) return;
      document.getElementById(id)?.scrollIntoView({ behavior: "auto" });
    };
    requestAnimationFrame(land);
    const timers = [setTimeout(land, 150), setTimeout(land, 500)];
    document.fonts?.ready.then(() => requestAnimationFrame(land));
    addEventListener("wheel", stop, { passive: true });
    addEventListener("touchstart", stop, { passive: true });
    addEventListener("keydown", stop);
    return () => {
      live = false;
      timers.forEach(clearTimeout);
      removeEventListener("wheel", stop);
      removeEventListener("touchstart", stop);
      removeEventListener("keydown", stop);
    };
  }, [ready]);

  /* Below lg the AI panel is a modal bottom sheet, so it has to contain focus.
     It cannot be portalled out of the grid - the lg:contents chain is what
     keeps the panel aligned to the top of the queue - so the containment is
     done here instead of with inert on a layout wrapper. */
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isSheet, setIsSheet] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const sync = () => setIsSheet(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!isSheet || !panelOpen || !sheet) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    const stops = () =>
      Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0);

    /* The sheet is visibility:hidden while closed, and focus() is a no-op on a
       hidden element, so wait one frame for the open state to take effect. */
    const raf = requestAnimationFrame(() => stops()[0]?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPanelOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const f = stops();
      const first = f[0];
      const last = f[f.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (!active || !sheet.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      restoreTo?.focus?.();
    };
  }, [isSheet, panelOpen]);

  const items: Testimonial[] = useMemo(() => list.data ?? [], [list.data]);

  const shown = useMemo(() => items.filter((t) => matches(t, filter, q)), [items, filter, q]);

  /** Approved, featured first - this is exactly what the widget renders. */
  const approved = useMemo(
    () =>
      items
        .filter((t) => t.status === "approved")
        .sort((a, b) => Number(b.featured) - Number(a.featured)),
    [items],
  );

  const selectedItem = items.find((t) => t.id === selected) ?? items[0];

  function onStatus(id: string, next: Status) {
    moderate.mutate({ id, patch: { status: next } });
    setSelected(id);
    setPanelOpen(true);
  }

  function onFeature(id: string) {
    const t = items.find((x) => x.id === id);
    if (t) moderate.mutate({ id, patch: { featured: !t.featured } });
  }

  function onReset() {
    reset.mutate();
    clear(WIDGET_KEY);
    setFilter("all");
    setQ("");
    setPanelOpen(false);
    setResetKey((n) => n + 1);
  }

  if (space.isError || list.isError) {
    return (
      <Shell>
        <div className="mx-auto max-w-[560px] px-5 py-24 text-center">
          <h1 className="text-[22px] font-semibold text-ink">The demo API is not answering</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            It runs on a free instance that sleeps when idle and can take up to a minute to wake.
          </p>
          <button
            type="button"
            onClick={() => {
              void space.refetch();
              void list.refetch();
            }}
            className="mt-5 rounded-lg bg-accent px-4 py-2 text-[13.5px] font-medium text-white hover:bg-accent-deep"
          >
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  if (!space.data || !list.data || !selectedItem) {
    return (
      <Shell>
        <div className="mx-auto max-w-[560px] px-5 py-24 text-center" role="status">
          <p className="text-[14px] text-ink-2">Loading the demo workspace...</p>
          <p className="mt-1 text-[12.5px] text-ink-3">
            The API sleeps when idle. The first load can take up to a minute.
          </p>
        </div>
      </Shell>
    );
  }

  const detail = space.data;

  return (
    <div className="min-h-screen">
      <TopBar workspace={detail.workspace} />

      <div className="border-b border-line bg-accent text-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-[12.5px]">
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
            Try it
          </span>
          <span className="text-white/90">
            Open the collection link and submit a testimonial, then approve it and watch the
            embedded widget change. Everything here reads and writes a real MongoDB database.
          </span>
        </div>
      </div>

      <main className="pb-4">
        <section className="mx-auto max-w-[720px] px-5 pb-2 pt-14 text-center">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            For freelancers and small agencies
          </div>
          <h1 className="font-serif text-[38px] leading-[1.08] tracking-[-0.015em] text-ink sm:text-[46px]">
            Turn a client's kind words into proof on your site
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-relaxed text-ink-2">
            One link collects the testimonial. You approve it. It appears in your embed everywhere,
            no redeploy.
          </p>
        </section>

        <SpaceHeader detail={detail} />
        <Analytics />

        <section
          id="moderation"
          className="mx-auto max-w-[1240px] scroll-mt-[128px] px-5 pt-16 lg:scroll-mt-20"
        >
          <ModerationControls
            items={items}
            filter={filter}
            setFilter={setFilter}
            q={q}
            setQ={setQ}
            onReset={onReset}
            resetting={reset.isPending}
          />

          <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
            <Moderation
              items={shown}
              selectedId={selectedItem.id}
              onSelect={setSelected}
              onAssist={(id) => {
                setSelected(id);
                setPanelOpen(true);
              }}
              onStatus={onStatus}
              onFeature={onFeature}
            />

            <div>
              {panelOpen && (
                <button
                  type="button"
                  aria-label="Close AI assist"
                  onClick={() => setPanelOpen(false)}
                  className="fixed inset-0 z-40 cursor-default bg-ink/40 lg:hidden"
                />
              )}
              <div
                id="ai-panel"
                ref={sheetRef}
                data-open={panelOpen}
                role={isSheet ? "dialog" : undefined}
                aria-modal={isSheet ? true : undefined}
                aria-label={isSheet ? "AI assist" : undefined}
                className={`rl-sheet lg:contents max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:max-h-[78vh] max-lg:overflow-y-auto max-lg:rounded-t-2xl max-lg:border-t max-lg:border-line max-lg:bg-surface max-lg:shadow-2xl max-lg:transition-transform ${
                  panelOpen
                    ? "max-lg:translate-y-0"
                    : "max-lg:pointer-events-none max-lg:translate-y-full"
                }`}
              >
                <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface px-4 pb-2 pt-3 lg:hidden">
                  <span className="mx-auto h-1 w-10 rounded-full bg-line-strong" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className="absolute right-3 top-2 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-2 hover:bg-sunken"
                  >
                    Close
                  </button>
                </div>
                <div className="lg:contents max-lg:p-3">
                  <AiPanel t={selectedItem} aiEnabled={detail.aiEnabled} aiModel={detail.aiModel} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <WidgetPreview key={resetKey} approved={approved} />
        <Developers />
      </main>

      <Footer />
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopBar />
      {children}
    </div>
  );
}
