/**
 * The script-tag entry point:
 *
 *   <script src="https://api.example.com/w/v1.js"
 *           data-space="aurora-studio/q3-client-wins"
 *           data-layout="grid" data-theme="light" data-limit="6" async></script>
 *
 * Inserts a <reviewloop-widget> element right after the script tag and mounts
 * into it. The API origin is taken from the script's own URL.
 */
import { mount, type Layout, type MountOptions, type Theme } from "./index";

const LAYOUTS: readonly Layout[] = ["grid", "carousel", "single"];
const THEMES: readonly Theme[] = ["light", "dark"];

function fromScript(script: HTMLScriptElement): void {
  const d = script.dataset;
  if (!d.space || script.dataset.rlMounted) return;
  script.dataset.rlMounted = "1";
  const host = document.createElement("reviewloop-widget");
  script.after(host);
  const opts: MountOptions = {
    space: d.space,
    apiBase: new URL(script.src).origin,
    layout: LAYOUTS.find((l) => l === d.layout) ?? "grid",
    theme: THEMES.find((t) => t === d.theme) ?? "light",
    limit: Number(d.limit) > 0 ? Number(d.limit) : 6,
  };
  mount(host, opts);
}

declare global {
  interface Window {
    ReviewLoop?: { mount: typeof mount; version: string };
  }
}

window.ReviewLoop = { mount, version: "1" };

// currentScript is set for classic scripts, including async ones, while they run.
const current = document.currentScript;
if (current instanceof HTMLScriptElement) fromScript(current);
