/**
 * A deliberately hostile host page with the real embed on it. The stylesheet
 * below is the kind of thing found on real sites: universal selectors,
 * !important everywhere, a tiny root font size, global resets. The widget
 * has to come through untouched.
 */
const HOSTILE_CSS = `
  html { font-size: 9px !important; }
  * {
    font-family: "Comic Sans MS", "Comic Sans", cursive !important;
    color: #d91e1e !important;
    text-transform: uppercase !important;
    letter-spacing: 0.08em !important;
    line-height: 2.4 !important;
  }
  div { border: 2px dotted #d91e1e !important; padding: 10px !important; background: #fff6a8 !important; }
  p, h1, h2, h3, blockquote, figure { margin: 36px !important; font-size: 2.6rem !important; }
  svg { display: none !important; }
  button { all: unset !important; }
  img { filter: invert(1) !important; }
`;

const CALM_CSS = `
  body { font-family: system-ui, sans-serif; color: #222; }
`;

export function hostilePage(o: { layout: string; theme: string; hostile: boolean }): string {
  const q = (next: Partial<typeof o>) => {
    const v = { ...o, ...next };
    return `?layout=${v.layout}&theme=${v.theme}&hostile=${v.hostile ? 1 : 0}`;
  };
  const link = (label: string, href: string, on: boolean) =>
    on ? `<strong>${label}</strong>` : `<a href="${href}">${label}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ReviewLoop widget on a hostile page</title>
<style>${o.hostile ? HOSTILE_CSS : CALM_CSS}
  body { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
  nav a, nav strong { margin-right: 14px; }
</style>
</head>
<body>
<h1>A host site with hostile CSS</h1>
<p>Every element on this page is forced into red Comic Sans with !important rules, a 9px root font size and global resets. The embed below is the real widget, loaded by one script tag.</p>
<nav>
  ${link("Grid", q({ layout: "grid" }), o.layout === "grid")}
  ${link("Carousel", q({ layout: "carousel" }), o.layout === "carousel")}
  ${link("Single quote", q({ layout: "single" }), o.layout === "single")}
  ${link("Light", q({ theme: "light" }), o.theme === "light")}
  ${link("Dark", q({ theme: "dark" }), o.theme === "dark")}
  ${link(o.hostile ? "Turn hostile CSS off" : "Turn hostile CSS on", q({ hostile: !o.hostile }), false)}
</nav>
<script src="/w/v1.js" data-space="aurora-studio/q3-client-wins" data-layout="${o.layout}" data-theme="${o.theme}" async></script>
<p>More host content below the embed, which inherits the host stylesheet as it should.</p>
</body>
</html>`;
}
