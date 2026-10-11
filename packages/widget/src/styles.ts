/**
 * Every rule here lives inside the shadow root, so host selectors cannot
 * reach it. Three things still cross the boundary, and each is handled:
 *
 * 1. Rules on the host element itself (a page-wide `*` or `div` rule). The
 *    `:host` reset is !important because, for important declarations, the
 *    shadow tree's own rule beats the outer page's.
 * 2. Inherited properties (font, color, line-height). The reset above sets
 *    them back to initial, and .rl sets every one it uses explicitly.
 * 3. rem units, which follow the host page's root font size. None are used.
 *
 * Custom properties do inherit through the boundary, which is what makes
 * them the theming API: --reviewloop-accent, --reviewloop-radius,
 * --reviewloop-font and --reviewloop-quote-font, set on the host page.
 */
export const CSS = `
:host {
  all: initial !important;
  display: block !important;
  contain: content;
}
:host([hidden]) { display: none !important; }

.rl {
  --accent: var(--reviewloop-accent, #4a3aa7);
  --radius: var(--reviewloop-radius, 16px);
  --font: var(--reviewloop-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif);
  --quote-font: var(--reviewloop-quote-font, Georgia, "Times New Roman", serif);
  box-sizing: border-box;
  font-family: var(--font);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: normal;
  text-transform: none;
  text-align: left;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
.rl *, .rl *::before, .rl *::after { box-sizing: inherit; }

.rl[data-theme="light"] {
  --card: #ffffff; --border: #e4e2dd; --ink: #171614; --ink-2: #57544e; --ink-3: #8a8680; --chip: #efeeea;
}
.rl[data-theme="dark"] {
  --card: #201f27; --border: #33313d; --ink: #f4f3f7; --ink-2: #b6b3c2; --ink-3: #86828f; --chip: #2c2a36;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
}
.card.big { padding: 28px; }

.meta { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; }
.stars { display: inline-flex; gap: 2px; color: #eda100; }
.stars svg { display: block; width: 13px; height: 13px; }
.big .stars svg { width: 16px; height: 16px; }
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 999px;
  background: var(--chip); color: var(--ink-3);
  font-size: 10.5px; font-weight: 500;
}
.chip svg { display: block; width: 9px; height: 9px; }

.quote {
  margin: 0;
  font-family: var(--quote-font);
  font-size: 17px;
  line-height: 1.35;
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 8;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.big .quote { font-size: 26px; -webkit-line-clamp: 10; }

.who { display: flex; align-items: center; gap: 12px; margin-top: auto; padding-top: 20px; }
.avatar {
  display: flex; align-items: center; justify-content: center; flex: none;
  width: 36px; height: 36px; border-radius: 999px;
  font-size: 12.5px; font-weight: 600;
}
.big .avatar { width: 44px; height: 44px; font-size: 15px; }
.name { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.byline { font-size: 12.5px; color: var(--ink-3); }
.big .name { font-size: 15px; }
.big .byline { font-size: 13.5px; }

.carousel { max-width: 640px; margin: 0 auto; }
.controls { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.nav {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0; margin: 0;
  border: 1px solid var(--border); border-radius: 999px;
  background: transparent; color: var(--ink-2);
  font: inherit; cursor: pointer;
}
.nav:hover { color: var(--ink); }
.nav svg { display: block; width: 13px; height: 13px; }
.nav:focus-visible, .dot:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dots { display: flex; gap: 6px; }
.dot {
  width: 6px; height: 6px; padding: 0; margin: 0;
  border: 0; border-radius: 999px;
  background: var(--border); cursor: pointer;
  transition: width .2s;
}
.dot[aria-current="true"] { width: 20px; background: var(--accent); }

.single { max-width: 720px; margin: 0 auto; }

.empty { padding: 48px 16px; text-align: center; font-size: 13.5px; color: var(--ink-3); }
.skeleton { min-height: 180px; }
.foot { margin-top: 16px; text-align: center; font-size: 11px; color: var(--ink-3); }
.foot a { color: inherit; text-decoration: none; }
.foot a:hover { text-decoration: underline; }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) { .dot { transition: none; } }
`;
