import type { WidgetItem, WidgetPayload } from "@reviewloop/shared";
import { CSS } from "./styles";

export type Layout = "grid" | "carousel" | "single";
export type Theme = "light" | "dark";

export interface MountOptions {
  /** `${workspace}/${space}`, e.g. "aurora-studio/q3-client-wins". */
  space: string;
  /** Origin of the ReviewLoop API, e.g. "https://api.reviewloop.app". */
  apiBase: string;
  layout?: Layout;
  theme?: Theme;
  /** Grid only. */
  limit?: number;
  /** Wait until the widget is near the viewport before fetching. Default true. */
  lazy?: boolean;
  /** Send an impression beacon the first time it is seen. Default true. */
  track?: boolean;
  /** Revalidate with the server instead of trusting the HTTP cache. For dashboards. */
  revalidate?: boolean;
  /** Shown when nothing is approved. Default: render nothing. */
  emptyText?: string;
}

export interface WidgetHandle {
  /** The (closed) shadow root, for tests. Host-page scripts cannot reach it. */
  readonly root: ShadowRoot;
  /** Resolves once the first render with data (or the empty state) is done. */
  readonly ready: Promise<void>;
  destroy(): void;
}

const TINTS: readonly { bg: string; fg: string }[] = [
  { bg: "#eeebfa", fg: "#4a3aa7" },
  { bg: "#e4f6ee", fg: "#0f7a53" },
  { bg: "#fdf3dd", fg: "#8a5d00" },
  { bg: "#e7effb", fg: "#1c5cab" },
  { bg: "#fdeaea", fg: "#a62f2e" },
  { bg: "#efeeea", fg: "#57544e" },
];

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Builds elements with textContent only. Testimonials are written by the
 * public, so nothing from the payload is ever parsed as HTML.
 */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  ...children: (Node | string | null)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  for (const c of children) if (c !== null) node.append(c);
  return node;
}

function icon(paths: string, fill: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths.split("|")) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    if (fill) p.setAttribute("fill", "currentColor");
    else {
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "currentColor");
      p.setAttribute("stroke-width", "1.6");
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
    }
    svg.append(p);
  }
  return svg;
}

const STAR = "M8 1.3l2 4.2 4.6.6-3.4 3.2.9 4.5L8 11.6l-4.1 2.2.9-4.5L1.4 6.1 6 5.5z";
const PLAY = "M4 2.5v11l9-5.5z";
const ARROW_LEFT = "M10 3L5 8l5 5";
const ARROW_RIGHT = "M6 3l5 5-5 5";

function stars(n: number): HTMLElement {
  const wrap = el("span", "stars");
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", `${n} out of 5 stars`);
  for (let i = 0; i < n; i++) wrap.append(icon(STAR, true));
  return wrap;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function card(t: WidgetItem, big: boolean): HTMLElement {
  const meta = el("div", "meta", stars(t.rating));
  if (t.medium === "video" && t.duration) {
    meta.append(el("span", "chip", icon(PLAY, true), `Video ${t.duration}`));
  }
  const tint = TINTS[t.tint % TINTS.length] ?? { bg: "#efeeea", fg: "#57544e" };
  const avatar = el("span", "avatar", initials(t.name));
  avatar.setAttribute("aria-hidden", "true");
  // CSSOM writes are allowed under a strict style-src CSP; style="" attributes are not.
  avatar.style.background = tint.bg;
  avatar.style.color = tint.fg;
  const quote = el("blockquote", "quote", `“${t.quote}”`);
  return el(
    "figure",
    big ? "card big" : "card",
    meta,
    quote,
    el("figcaption", "who", avatar, el("span", undefined, el("div", "name", t.name), el("div", "byline", t.byline))),
  );
}

function renderGrid(items: WidgetItem[], limit: number): HTMLElement {
  const grid = el("div", "grid");
  grid.setAttribute("role", "list");
  for (const t of items.slice(0, limit)) {
    const c = card(t, false);
    c.setAttribute("role", "listitem");
    grid.append(c);
  }
  return grid;
}

function renderSingle(first: WidgetItem): HTMLElement {
  return el("div", "single", card(first, true));
}

function renderCarousel(items: WidgetItem[]): HTMLElement {
  let index = 0;
  const slot = el("div");
  slot.setAttribute("aria-live", "polite");
  const status = el("span", "sr-only");
  const dots = el("div", "dots");

  const show = (i: number) => {
    index = (i + items.length) % items.length;
    const t = items[index];
    if (t) slot.replaceChildren(card(t, true));
    status.textContent = `Testimonial ${index + 1} of ${items.length}`;
    dots.querySelectorAll("button").forEach((d, j) => d.setAttribute("aria-current", String(j === index)));
  };

  items.forEach((t, i) => {
    const dot = el("button", "dot");
    dot.type = "button";
    dot.setAttribute("aria-label", `Show testimonial ${i + 1}: ${t.name}`);
    dot.addEventListener("click", () => show(i));
    dots.append(dot);
  });

  const prev = el("button", "nav", icon(ARROW_LEFT, false));
  prev.type = "button";
  prev.setAttribute("aria-label", "Previous testimonial");
  prev.addEventListener("click", () => show(index - 1));
  const next = el("button", "nav", icon(ARROW_RIGHT, false));
  next.type = "button";
  next.setAttribute("aria-label", "Next testimonial");
  next.addEventListener("click", () => show(index + 1));

  const wrap = el("div", "carousel", slot, status);
  if (items.length > 1) wrap.append(el("div", "controls", prev, dots, next));
  show(0);
  return wrap;
}

function adoptStyles(root: ShadowRoot): void {
  // A constructed stylesheet is shared, cheap, and not blocked by a host
  // page's CSP. Older browsers fall back to a <style> element.
  if ("adoptedStyleSheets" in root && typeof CSSStyleSheet !== "undefined" && "replaceSync" in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    root.adoptedStyleSheets = [sheet];
  } else {
    root.append(el("style", undefined, CSS));
  }
}

function whenVisible(host: HTMLElement, lazy: boolean, cb: () => void): () => void {
  if (!lazy || typeof IntersectionObserver === "undefined") {
    cb();
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        cb();
      }
    },
    { rootMargin: "200px" },
  );
  io.observe(host);
  return () => io.disconnect();
}

export function mount(host: HTMLElement, opts: MountOptions): WidgetHandle {
  const root = host.attachShadow({ mode: "closed" });
  adoptStyles(root);
  const frame = el("div", "rl skeleton");
  frame.dataset.theme = opts.theme ?? "light";
  root.append(frame);

  const api = opts.apiBase.replace(/\/$/, "");
  const path = opts.space.split("/").map(encodeURIComponent).join("/");
  const controller = new AbortController();
  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((r) => (resolveReady = r));

  const render = (payload: WidgetPayload) => {
    frame.classList.remove("skeleton");
    const items = payload.items;
    const first = items[0];
    if (!first) {
      frame.replaceChildren(...(opts.emptyText ? [el("p", "empty", opts.emptyText)] : []));
      return;
    }
    const layout = opts.layout ?? "grid";
    const body =
      layout === "carousel"
        ? renderCarousel(items)
        : layout === "single"
          ? renderSingle(first)
          : renderGrid(items, opts.limit ?? 6);
    const link = el("a", undefined, "Powered by ReviewLoop");
    link.href = "https://reviewloop.automatemonday.com/";
    link.target = "_blank";
    link.rel = "noopener";
    frame.replaceChildren(body, el("div", "foot", link));
  };

  const stopWatching = whenVisible(host, opts.lazy ?? true, () => {
    fetch(`${api}/w/spaces/${path}`, {
      signal: controller.signal,
      credentials: "omit",
      cache: opts.revalidate ? "no-cache" : "default",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`ReviewLoop: ${res.status}`);
        return res.json() as Promise<WidgetPayload>;
      })
      .then((payload) => {
        render(payload);
        if ((opts.track ?? true) && payload.items.length > 0) {
          const url = `${api}/w/spaces/${path}/impression`;
          if (!navigator.sendBeacon?.(url)) {
            void fetch(url, { method: "POST", keepalive: true, credentials: "omit" }).catch(() => {});
          }
        }
      })
      .catch((err: unknown) => {
        // A broken widget must never break the host page: render nothing.
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          frame.classList.remove("skeleton");
          frame.replaceChildren();
        }
      })
      .finally(resolveReady);
  });

  return {
    root,
    ready,
    destroy() {
      stopWatching();
      controller.abort();
      frame.replaceChildren();
    },
  };
}
