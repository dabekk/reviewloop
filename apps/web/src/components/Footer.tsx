export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-[1240px] px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-md">
            <div className="mb-2 flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden>
                <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
                <path
                  d="M11 10h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5l-5 4v-4a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z"
                  fill="#fff"
                />
              </svg>
              <span className="text-[15px] font-semibold">ReviewLoop</span>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-2">
              Working demo on React, Express and MongoDB Atlas. The starting testimonials, people and
              traffic history are invented sample data. Anything submitted through the collection link
              is real and lands in the queue.
            </p>
          </div>
          <div className="text-[13px] text-ink-2">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Built by
            </div>
            <a
              href="https://automatemonday.com"
              className="font-semibold text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent"
            >
              Automate Monday
            </a>
            <div className="mt-1 text-ink-3">Prototypes and internal tools, shipped fast.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
