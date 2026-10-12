# ReviewLoop

Collect client testimonials through a branded link, moderate them, and publish the approved ones anywhere with one script tag.

This repo is a working slice of the MVP: the core loop runs end to end on a real database. A client opens the collection link and submits. The testimonial lands in the moderation queue, where AI assist scores it. Approve it and it appears in the embeddable widget on any site.

## What runs today

| Area | State |
|---|---|
| Public collection page | Live. Zod-validated on both ends, honeypot, rate limit, link expiry, view and start tracking |
| Moderation | Live. Approve, hide, feature (one per space), filter, search, optimistic updates |
| AI assist | Live when `ANTHROPIC_API_KEY` is set. Background job, structured outputs, Zod re-validation, one retry, then parked for a human |
| Embeddable widget | Live. One script tag, closed Shadow DOM, three layouts, two themes, lazy-loaded, 3.6 kB gzipped |
| Widget caching | In-memory per space, invalidated on moderation, ETag + `Cache-Control` for the browser and CDN |
| Analytics | Live. Daily counters in MongoDB rolled into weeks by one aggregation pipeline |
| Webhook on new submission | Live when `WEBHOOK_URL` is set. HMAC-signed, retried with backoff, every attempt logged |
| Auth, workspaces, roles | Milestone 1. The dashboard API is open in this demo |
| Video recording, S3 upload, transcripts | Milestone 2. The seeded video rows are sample data |
| Drag-and-drop ordering, tags, bulk actions | Milestone 3 |
| API keys, rate limits per key | Milestone 4. The key list in the dashboard is a preview |

The starting testimonials, people and twelve weeks of traffic are invented sample data, seeded by `apps/api/src/seed`. Anything submitted through the link is real.

## Layout

```
apps/api         Express + MongoDB native driver. Routes, jobs, AI, webhooks, seed
apps/web         React + React Query + Tailwind. Dashboard and the public collection page
packages/shared  Zod schemas: the one contract the API, dashboard and widget all use
packages/widget  The embed. Plain TypeScript, no framework, built to a single IIFE
```

TypeScript is strict everywhere, with `noUncheckedIndexedAccess` and no `any`. Lint (oxlint) rejects `any` and non-null assertions outside tests.

## Run it locally

```bash
npm install
npm run dev        # API on :8787, dashboard on :5173
```

With no `MONGODB_URI`, the API starts an in-memory MongoDB and seeds it, so nothing else is needed. To use Atlas, copy `apps/api/.env.example` to `apps/api/.env` and set `MONGODB_URI`. An empty database is seeded on first boot.

- Dashboard: http://localhost:5173
- Collection page: http://localhost:5173/s/aurora-studio/q3-client-wins
- Widget on a hostile page: http://localhost:8787/w/demo

```bash
npm test           # API (against an in-memory MongoDB) and widget (happy-dom)
npm run typecheck
npm run lint
```

## How the hard parts work

### The widget cannot be broken by host CSS

`packages/widget/src/styles.ts` explains each rule. In short:

- It mounts into a **closed** shadow root on a `<reviewloop-widget>` element, so host selectors cannot reach anything inside it.
- Shadow DOM does not stop rules aimed at the host element itself (a page-wide `*` or `div` rule), or inherited properties like `font`, `color` and `line-height`. `:host { all: initial !important }` handles both. For `!important` declarations, the shadow tree's own rule beats the outer page's.
- No `rem` units, because `rem` follows the host page's root font size.
- Styles go in through a constructed stylesheet, which a host page's CSP does not block. Avatar colours are set through the CSSOM rather than `style=""` attributes for the same reason.
- Theming uses CSS custom properties (`--reviewloop-accent`, `--reviewloop-radius`, `--reviewloop-font`, `--reviewloop-quote-font`), which cross the boundary on purpose.
- Everything from the payload is written with `textContent`, so a testimonial can never inject HTML into a customer's site. There is a test for it.
- If the API fails, the widget renders nothing rather than an error box on someone else's page.

`/w/demo` serves a page with deliberately hostile CSS (`!important` everywhere, a 9px root font size, `button { all: unset }`) and the real embed on it.

### AI calls return valid JSON, and what happens when they do not

`apps/api/src/ai/`:

1. **Structured outputs** constrain the response to the `AssistOutput` Zod schema while it is generated (`output_config.format`).
2. **Zod re-validates anyway**, and `checkAssist()` covers what a schema cannot: the pull-quote must appear word for word in the testimonial, so the widget can never put words in a client's mouth.
3. **One retry**, with the validation problems sent back to the model.
4. **Then it is parked**: `ai.state = "failed"` with the reason. The testimonial stays in the queue for a human, with a retry button. AI never blocks a submission.

The testimonial is untrusted input, so the system prompt treats everything inside `<testimonial>` as data, not instructions. API errors are not retried by our code, because the SDK has already retried rate limits and 5xx responses with backoff. The prompt is versioned in the repo (`PROMPT_VERSION`).

Scoring runs in `apps/api/src/jobs.ts`, a small in-process queue with the same contract as a BullMQ worker. Queue state lives in MongoDB (`ai.state = "queued"`), so jobs survive a restart. Milestone 2 swaps that one file for BullMQ on Redis.

### Analytics

Daily bucket documents per space (`metrics_daily`, unique on `spaceId + day`), incremented with one upsert per event. The dashboard's 13 weeks come from one `$group` on `$dateTrunc` over at most 91 small documents, however busy the widget is.

## Deploy

One Node app serves everything: the dashboard at `/`, the collection page at `/s/<workspace>/<space>`, the API at `/api`, and the widget at `/w`. Same origin, so the dashboard needs no API URL and no CORS.

```bash
npm ci
npm run build      # widget, dashboard, then the API bundle
npm start          # node server.cjs
```

`server.cjs` is a CommonJS entry point for hosts that load apps with `require()` (LiteSpeed, Passenger). `PORT` may be a number or a socket path.

Environment variables are listed in `apps/api/.env.example`. In production `MONGODB_URI` is required; the rest are optional. An empty database is seeded on first boot, and `npm run seed` resets it. `GET /health` reports the database kind, whether AI assist is on, and the environment, without any values.

The live demo runs as a Hostinger Node.js web app built from `main`, on a MongoDB Atlas M0. Atlas network access is open to all IPs, because shared hosting has no fixed outbound IP, so the database user has a strong password.
