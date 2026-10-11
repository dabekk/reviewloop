import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetPayload } from "@reviewloop/shared";
import { mount } from "../src/index";

const payload = (items: WidgetPayload["items"]): WidgetPayload => ({ space: "a/b", version: "v1", items });

const item = (over: Partial<WidgetPayload["items"][number]> = {}): WidgetPayload["items"][number] => ({
  id: "t1",
  name: "Priya Raghunathan",
  byline: "Head of Product, Northwind",
  tint: 0,
  medium: "written",
  duration: null,
  rating: 5,
  quote: "Handoff went from a week to one call.",
  featured: false,
  ...over,
});

function stubFetch(body: WidgetPayload, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

let host: HTMLElement;
beforeEach(() => {
  host = document.createElement("reviewloop-widget");
  document.body.append(host);
});
afterEach(() => {
  host.remove();
  vi.unstubAllGlobals();
});

describe("widget", () => {
  it("mounts into a closed shadow root the host page cannot reach", async () => {
    stubFetch(payload([item()]));
    const w = mount(host, { space: "a/b", apiBase: "https://api.test", lazy: false, track: false });
    await w.ready;
    expect(host.shadowRoot).toBeNull();
    expect(w.root.querySelectorAll("figure")).toHaveLength(1);
    expect(document.querySelectorAll("figure")).toHaveLength(0);
  });

  it("requests the space's payload from the API origin it was given", async () => {
    const fetchMock = stubFetch(payload([item()]));
    const w = mount(host, { space: "aurora-studio/q3-client-wins", apiBase: "https://api.test/", lazy: false, track: false });
    await w.ready;
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/w/spaces/aurora-studio/q3-client-wins", expect.anything());
  });

  it("renders testimonial text as text, never as HTML", async () => {
    stubFetch(payload([item({ name: '<img src=x onerror="alert(1)">', quote: "<script>alert(1)</script>" })]));
    const w = mount(host, { space: "a/b", apiBase: "https://api.test", lazy: false, track: false });
    await w.ready;
    expect(w.root.querySelector("img")).toBeNull();
    expect(w.root.querySelector("script")).toBeNull();
    expect(w.root.querySelector(".name")?.textContent).toBe('<img src=x onerror="alert(1)">');
  });

  it("respects the grid limit", async () => {
    stubFetch(payload(Array.from({ length: 9 }, (_, i) => item({ id: `t${i}` }))));
    const w = mount(host, { space: "a/b", apiBase: "https://api.test", lazy: false, track: false, limit: 4 });
    await w.ready;
    expect(w.root.querySelectorAll("figure")).toHaveLength(4);
  });

  it("pages through the carousel with its buttons", async () => {
    stubFetch(payload([item({ id: "a", name: "First" }), item({ id: "b", name: "Second" })]));
    const w = mount(host, { space: "a/b", apiBase: "https://api.test", lazy: false, track: false, layout: "carousel" });
    await w.ready;
    expect(w.root.querySelector(".name")?.textContent).toBe("First");
    w.root.querySelector<HTMLButtonElement>('button[aria-label="Next testimonial"]')?.click();
    expect(w.root.querySelector(".name")?.textContent).toBe("Second");
  });

  it("renders nothing when the API fails, so the host page is unaffected", async () => {
    stubFetch(payload([]), 500);
    const w = mount(host, { space: "a/b", apiBase: "https://api.test", lazy: false, track: false });
    await w.ready;
    expect(w.root.querySelector(".rl")?.childElementCount).toBe(0);
  });

  it("shows the empty text only when asked to", async () => {
    stubFetch(payload([]));
    const w = mount(host, { space: "a/b", apiBase: "https://api.test", lazy: false, track: false, emptyText: "Nothing yet" });
    await w.ready;
    expect(w.root.querySelector(".empty")?.textContent).toBe("Nothing yet");
  });

  it("sends one impression beacon after rendering", async () => {
    stubFetch(payload([item()]));
    const beacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { ...navigator, sendBeacon: beacon });
    const w = mount(host, { space: "a/b", apiBase: "https://api.test", lazy: false });
    await w.ready;
    expect(beacon).toHaveBeenCalledWith("https://api.test/w/spaces/a/b/impression");
  });
});
