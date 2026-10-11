import type { ErrorRequestHandler, Request } from "express";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues?: unknown,
  ) {
    super(message);
  }
}

/** Parses a request body with a shared schema, or throws a 400 the dashboard can display. */
export function parseBody<S extends z.ZodType>(schema: S, req: Request): z.infer<S> {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid request body", z.flattenError(parsed.error));
  }
  return parsed.data;
}

/** Express 5 forwards rejected promises here, so routes just throw. */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, issues: err.issues });
    return;
  }
  // body-parser marks malformed JSON and oversize bodies with a status.
  if (err instanceof Error && "status" in err && typeof err.status === "number" && err.status < 500) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side" });
};
