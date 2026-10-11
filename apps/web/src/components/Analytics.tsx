import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsWeek } from "@reviewloop/shared";
import { useAnalytics } from "../lib/queries";
import { Card, SectionHeading } from "./primitives";

const fmt = new Intl.NumberFormat("en-GB");

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-semibold ${up ? "text-[#0f7a53]" : "text-[#a62f2e]"}`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
        <path
          d={up ? "M5 1.5l3.2 4.2H1.8z" : "M5 8.5L1.8 4.3h6.4z"}
          fill="currentColor"
        />
      </svg>
      {up ? "+" : ""}
      {value}% vs. the six weeks before
    </span>
  );
}

function Stat({
  label,
  value,
  delta,
  foot,
}: {
  label: string;
  value: string;
  delta: number;
  foot: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink-3">{label}</div>
      <div className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink">
        {value}
      </div>
      <div className="mt-2.5">
        <Delta value={delta} />
      </div>
      <div className="mt-1 text-[12px] text-ink-3">{foot}</div>
    </Card>
  );
}

interface TipPayload {
  active?: boolean;
  payload?: { payload: ChartWeek }[];
}

function ChartTip({ active, payload }: TipPayload) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] shadow-lg">
      <div className="mb-1 font-semibold text-ink">{d.current ? "This week so far" : `Week of ${d.week}`}</div>
      <div className="text-ink-2">
        {d.submitted} submitted &middot; {d.started} started &middot; {d.views} views
      </div>
    </div>
  );
}

type ChartWeek = AnalyticsWeek & { week: string; current: boolean };

const weekFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const growth = (first: number, second: number) =>
  first > 0 ? Math.round((second / first - 1) * 100) : 0;

/**
 * The API returns twelve complete weeks plus the current, partial one. Every
 * delta compares the last six complete weeks with the six before them, so a
 * half-finished week never reads as a drop.
 */
function summarise(weeks: AnalyticsWeek[]) {
  const complete = weeks.slice(0, -1);
  const a = complete.slice(0, 6);
  const b = complete.slice(6);
  const pick = (ws: AnalyticsWeek[], k: keyof Omit<AnalyticsWeek, "weekStart">) => sum(ws.map((w) => w[k]));
  const totals = {
    views: pick(weeks, "views"),
    started: pick(weeks, "started"),
    submitted: pick(weeks, "submitted"),
    impressions: pick(weeks, "impressions"),
  };
  const deltas = {
    views: growth(pick(a, "views"), pick(b, "views")),
    submitted: growth(pick(a, "submitted"), pick(b, "submitted")),
    conversion: growth(pick(a, "submitted") / pick(a, "views"), pick(b, "submitted") / pick(b, "views")),
    impressions: growth(pick(a, "impressions"), pick(b, "impressions")),
  };
  const chart: ChartWeek[] = weeks.map((w, i) => ({
    ...w,
    week: weekFmt.format(new Date(w.weekStart)),
    current: i === weeks.length - 1,
  }));
  return { totals, deltas, chart };
}

export default function Analytics() {
  const { data } = useAnalytics();
  if (!data) {
    return (
      <section id="analytics" className="mx-auto max-w-[1240px] scroll-mt-[128px] px-5 pt-16 lg:scroll-mt-20">
        <SectionHeading eyebrow="Analytics" title="Every link view, start and submission, per space" />
        <Card className="h-[320px] animate-pulse bg-sunken/50">
          <span className="sr-only">Loading analytics</span>
        </Card>
      </section>
    );
  }
  const { totals, deltas, chart } = summarise(data.weeks);
  const conversion = totals.views > 0 ? ((totals.submitted / totals.views) * 100).toFixed(1) : "0.0";
  const spark = data.weeks.map((w, i) => ({ i, v: w.impressions }));
  const FUNNEL = [
    { label: "Link opened", value: totals.views },
    { label: "Form started", value: totals.started },
    { label: "Testimonial submitted", value: totals.submitted },
  ];

  return (
    <section id="analytics" className="mx-auto max-w-[1240px] scroll-mt-[128px] px-5 pt-16 lg:scroll-mt-20">
      <SectionHeading
        eyebrow="Analytics"
        title="Every link view, start and submission, per space"
        sub="Daily counters in MongoDB, rolled into weeks by one aggregation pipeline. Seeded history plus every live view, submission and widget impression from this demo."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Link views"
          value={fmt.format(totals.views)}
          delta={deltas.views}
          foot="Last 12 weeks and this week"
        />
        <Stat
          label="Submissions"
          value={fmt.format(totals.submitted)}
          delta={deltas.submitted}
          foot="Includes seeded history. The queue holds the sample set plus live ones."
        />
        <Stat
          label="Conversion"
          value={`${conversion}%`}
          delta={deltas.conversion}
          foot="View to submission"
        />
        <Stat
          label="Widget impressions"
          value={fmt.format(totals.impressions)}
          delta={deltas.impressions}
          foot="Counted by the widget's beacon"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="mb-1 text-[14px] font-semibold text-ink">Testimonials submitted per week</div>
          <p className="mb-5 text-[12.5px] text-ink-3">
            Hover a bar for the full view-to-submission breakdown.
          </p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart}
                margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
                aria-label="Testimonials submitted per week. Focus the chart and use the arrow keys to read each week."
              >
                <CartesianGrid vertical={false} strokeDasharray="0" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} interval={1} dy={6} />
                <YAxis tickLine={false} axisLine={false} width={44} />
                <Tooltip
                  content={<ChartTip />}
                  cursor={{ fill: "var(--color-sunken)" }}
                />
                <Bar
                  dataKey="submitted"
                  fill="var(--color-accent)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col p-6">
          <div className="mb-1 text-[14px] font-semibold text-ink">Submission funnel</div>
          <p className="mb-5 text-[12.5px] text-ink-3">Last 12 weeks and this week, all sources.</p>
          <div className="space-y-4">
            {FUNNEL.map((f, i) => {
              const pct = totals.views > 0 ? (f.value / totals.views) * 100 : 0;
              return (
                <div key={f.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-ink-2">{f.label}</span>
                    <span className="text-[13px] font-semibold text-ink">
                      {fmt.format(f.value)}
                      {i > 0 && (
                        <span className="ml-1.5 font-medium text-ink-3">{pct.toFixed(0)}%</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${pct}%`, background: "var(--color-accent)", opacity: 1 - i * 0.22 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto border-t border-line pt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] text-ink-2">Widget impressions</span>
              <span className="text-[13px] font-semibold text-ink">{fmt.format(totals.impressions)}</span>
            </div>
            <div className="h-[52px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={spark}
                  margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
                  accessibilityLayer={false}
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="url(#sparkFill)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
