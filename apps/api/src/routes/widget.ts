import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import type { AppContext } from "../app.js";

type SpaceParams = { ws: string; space: string };
import { bumpMetric, findSpace } from "../services.js";
import { hostilePage } from "./hostile-page.js";

function loadBundle(path: string): { js: string; etag: string } | null {
  try {
    const js = readFileSync(path, "utf8");
    return { js, etag: `"${createHash("sha1").update(js).digest("base64url").slice(0, 16)}"` };
  } catch {
    return null;
  }
}

/**
 * Everything a third-party page touches: the script, the data it renders,
 * and the impression beacon. All of it is CORS-open and cacheable.
 */
export function widgetRoutes(ctx: AppContext): Router {
  const { c, cache } = ctx;
  const r = Router();

  r.use((_req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    next();
  });

  r.get("/v1.js", (req, res) => {
    // Read per request in development so a widget rebuild shows up at once.
    const bundle = loadBundle(ctx.widgetBundlePath);
    if (!bundle) {
      res.status(503).type("text/plain").send("Widget bundle not built. Run: npm run build -w @reviewloop/widget");
      return;
    }
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
    res.set("ETag", bundle.etag);
    if (req.headers["if-none-match"] === bundle.etag) {
      res.status(304).end();
      return;
    }
    res.type("application/javascript").send(bundle.js);
  });

  r.get("/spaces/:ws/:space", async (req, res) => {
    const { space } = await findSpace(c, req.params.ws, req.params.space);
    const payload = await cache.get(space, `${req.params.ws}/${req.params.space}`);
    const etag = `"${payload.version}"`;
    // A minute fresh at the browser and CDN, then served stale while it
    // revalidates. The ETag makes revalidation a 304 with no body.
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
    res.set("ETag", etag);
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    res.json(payload);
  });

  r.post(
    "/spaces/:ws/:space/impression",
    rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }),
    async (req: Request<SpaceParams>, res: Response) => {
      const { space } = await findSpace(c, req.params.ws, req.params.space);
      await bumpMetric(c, space._id, "impressions", ctx.now());
      res.status(204).end();
    },
  );

  r.get("/demo", (req, res) => {
    const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
      allowed.includes(v as T) ? (v as T) : fallback;
    res.type("html").send(
      hostilePage({
        layout: pick(req.query.layout, ["grid", "carousel", "single"] as const, "grid"),
        theme: pick(req.query.theme, ["light", "dark"] as const, "light"),
        hostile: req.query.hostile !== "0",
      }),
    );
  });

  return r;
}
