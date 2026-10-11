import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SubmissionInput } from "@reviewloop/shared";
import { z } from "zod";
import { ApiError, api } from "./lib/api";

type Errors = Record<string, string | undefined>;

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
      {hint && <span className="mt-0.5 block text-[12.5px] text-ink-3">{hint}</span>}
      <span className="mt-2 block">{children}</span>
      {error && (
        <span className="mt-1.5 block text-[12.5px] font-medium text-[#a62f2e]" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

const input =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent";

/**
 * The page a client opens from the shared link. Validates with the same Zod
 * schema as the API, so the errors here are the errors the server would give.
 */
export default function SubmitPage({ ws, space }: { ws: string; space: string }) {
  const info = useQuery({ queryKey: ["public", ws, space], queryFn: () => api.publicSpace(ws, space) });
  const submit = useMutation({ mutationFn: (v: SubmissionInput) => api.submit(ws, space, v) });

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [rating, setRating] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  /* One view per page load, and one start on the first interaction. Refs,
     not state, so StrictMode's double effect run does not count twice. */
  const viewed = useRef(false);
  const started = useRef(false);
  useEffect(() => {
    if (viewed.current || !info.data || info.data.expired) return;
    viewed.current = true;
    void api.event(ws, space, "view").catch(() => {});
  }, [info.data, ws, space]);
  const onStart = () => {
    if (started.current) return;
    started.current = true;
    void api.event(ws, space, "start").catch(() => {});
  };

  useEffect(() => {
    if (info.data) document.title = `${info.data.name} - ${info.data.workspaceName}`;
  }, [info.data]);

  if (info.isPending) {
    return (
      <Frame>
        <p className="py-16 text-center text-[14px] text-ink-2" role="status">
          Loading...
        </p>
      </Frame>
    );
  }

  if (info.isError) {
    const notFound = info.error instanceof ApiError && info.error.status === 404;
    return (
      <Frame>
        <div className="py-16 text-center">
          <h1 className="text-[20px] font-semibold text-ink">
            {notFound ? "This link does not exist" : "This page could not load"}
          </h1>
          <p className="mt-2 text-[14px] text-ink-2">
            {notFound
              ? "Check the address with whoever sent it to you."
              : "The server may be waking up. Try again in a minute."}
          </p>
        </div>
      </Frame>
    );
  }

  const s = info.data;
  const brand = s.brandColor;

  if (s.expired) {
    return (
      <Frame brand={brand}>
        <div className="py-16 text-center">
          <h1 className="text-[20px] font-semibold text-ink">This link has expired</h1>
          <p className="mt-2 text-[14px] text-ink-2">Ask {s.workspaceName} for a new one.</p>
        </div>
      </Frame>
    );
  }

  if (submit.isSuccess) {
    const first = name.trim().split(/\s+/)[0] ?? "";
    return (
      <Frame brand={brand}>
        <div className="py-14 text-center">
          <div
            className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ background: brand }}
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-serif text-[30px] leading-tight text-ink">Thank you, {first}</h1>
          <p className="mx-auto mt-3 max-w-[420px] text-[14.5px] leading-relaxed text-ink-2">
            {s.workspaceName} will read it before anything goes on their website.
          </p>
          <a
            href={`${import.meta.env.BASE_URL}#moderation`}
            className="mt-8 inline-block rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-sunken"
          >
            Demo: see it arrive in the moderation queue
          </a>
        </div>
      </Frame>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // One entry per question, so an untouched optional box is "" rather than missing.
    const candidate = {
      name,
      role,
      company,
      rating,
      answers: s.questions.map((_, i) => answers[i] ?? ""),
      consent,
      website,
    };
    const parsed = SubmissionInput.safeParse(candidate);
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors;
      setErrors(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0]])));
      return;
    }
    setErrors({});
    submit.mutate(parsed.data, {
      onError: (err) => {
        if (err instanceof ApiError) {
          setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v?.[0]])));
        }
      },
    });
  }

  const serverError =
    submit.error instanceof ApiError && Object.keys(submit.error.fieldErrors).length === 0
      ? submit.error.status === 429
        ? "Too many submissions from this connection. Try again in a few minutes."
        : submit.error.message
      : submit.isError && !(submit.error instanceof ApiError)
        ? "Could not reach the server. Check your connection and try again."
        : null;

  return (
    <Frame brand={brand}>
      <header className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: brand }}>
          {s.workspaceName}
        </div>
        <h1 className="mt-2 font-serif text-[32px] leading-[1.1] tracking-[-0.01em] text-ink">
          How was working with us?
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
          A few sentences in your own words is perfect. It takes about two minutes, and nothing is
          published until the team has read it.
        </p>
      </header>

      <form onSubmit={onSubmit} onFocus={onStart} noValidate className="space-y-6">
        <fieldset>
          <legend className="text-[13.5px] font-semibold text-ink">Your rating</legend>
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating out of 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)}
                className="rounded-md p-1 transition-transform hover:scale-110"
              >
                <svg width="28" height="28" viewBox="0 0 16 16" aria-hidden>
                  <path
                    d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6z"
                    fill={n <= rating ? "var(--color-warn)" : "var(--color-line-strong)"}
                  />
                </svg>
              </button>
            ))}
          </div>
          {errors.rating && (
            <p className="mt-1.5 text-[12.5px] font-medium text-[#a62f2e]" role="alert">
              {errors.rating}
            </p>
          )}
        </fieldset>

        {s.questions.map((q, i) => (
          <Field
            key={q}
            label={q}
            hint={i === 0 ? undefined : "Optional"}
            error={i === 0 ? errors.answers : undefined}
          >
            <textarea
              rows={i === 0 ? 4 : 3}
              maxLength={1500}
              value={answers[i] ?? ""}
              onChange={(e) =>
                setAnswers((a) => {
                  const next = [...a];
                  next[i] = e.target.value;
                  return next;
                })
              }
              className={input}
            />
          </Field>
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Your name" error={errors.name}>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={input} />
            </Field>
          </div>
          <Field label="Your role" hint="Optional">
            <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} autoComplete="organization-title" className={input} />
          </Field>
          <Field label="Company" hint="Optional">
            <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} autoComplete="organization" className={input} />
          </Field>
        </div>

        {/* Honeypot: off-screen and out of the tab order, so only bots fill it. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>

        <div>
          <label className="flex items-start gap-3 text-[13.5px] leading-snug text-ink-2">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
            {s.workspaceName} can publish this with my name, role and company on their website.
          </label>
          {errors.consent && (
            <p className="mt-1.5 text-[12.5px] font-medium text-[#a62f2e]" role="alert">
              {errors.consent}
            </p>
          )}
        </div>

        {serverError && (
          <p className="rounded-xl border border-[#f3caca] bg-serious-soft px-4 py-3 text-[13px] text-[#8d2c2b]" role="alert">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={submit.isPending}
          className="w-full rounded-xl px-4 py-3 text-[14.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: brand }}
        >
          {submit.isPending ? "Sending..." : "Send my testimonial"}
        </button>
      </form>
    </Frame>
  );
}

function Frame({ brand = "var(--color-accent)", children }: { brand?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <main className="mx-auto max-w-[600px] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(23,22,20,0.04)]">
        <div className="h-1.5" style={{ background: brand }} />
        <div className="px-6 py-8 sm:px-10 sm:py-10">{children}</div>
      </main>
      <p className="mt-6 text-center text-[12px] text-ink-3">Collected with ReviewLoop</p>
    </div>
  );
}
