/**
 * Sample data for the demo workspace. Every person, company and quote here is
 * invented, and the dashboard says so. Dates are offsets from the seed time so
 * the demo never looks stale.
 */
import type { Medium, Sentiment, Status } from "@reviewloop/shared";

export const WORKSPACE = {
  _id: "ws_aurora",
  slug: "aurora-studio",
  name: "Aurora Studio",
  members: [
    { name: "Kamil D.", role: "owner" as const, tint: 0 },
    { name: "Elena M.", role: "editor" as const, tint: 2 },
    { name: "Jonah R.", role: "editor" as const, tint: 4 },
  ],
};

export const SPACE = {
  _id: "sp_q3wins",
  workspaceId: WORKSPACE._id,
  slug: "q3-client-wins",
  name: "Q3 Client Wins",
  brandColor: "#4A3AA7",
  questions: [
    "What was the problem before you worked with Aurora?",
    "What did we build, and how long did it take?",
    "What changed for your team afterwards?",
  ],
};

interface SampleTestimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  tint: number;
  medium: Medium;
  duration?: string;
  rating: number;
  /** Seed-time placeholder; the seed replaces it with a relative date. */
  submittedAt: string;
  status: Status;
  tags: string[];
  featured: boolean;
  body: string;
  ai: {
    pullQuote: string;
    headline: string;
    quality: number;
    spam: boolean;
    rationale: string;
    sentiment: Sentiment;
    topics: string[];
  };
}

export const TESTIMONIALS: SampleTestimonial[] = [
  {
    id: "t_01",
    name: "Priya Raghunathan",
    role: "Head of Product",
    company: "Northwind Logistics",
    tint: 0,
    medium: "written",
    rating: 5,
    submittedAt: "2026-09-11",
    status: "approved",
    tags: ["design system", "enterprise"],
    featured: true,
    body:
      "We came to Aurora with a half-finished design system and three teams quietly building their own buttons. They rebuilt the component library in six weeks and wrote documentation our engineers actually read. Design-to-dev handoff went from a week of back-and-forth to a single review call, and we have not shipped a one-off component since.",
    ai: {
      pullQuote:
        "Design-to-dev handoff went from a week of back-and-forth to a single review call.",
      headline: "Six weeks to a design system engineers actually use",
      quality: 96,
      spam: false,
      rationale:
        "Names a concrete before/after, a timeframe, and a measurable change in process. Strong candidate for the featured slot.",
      sentiment: "positive",
      topics: ["design system", "handoff speed", "documentation"],
    },
  },
  {
    id: "t_02",
    name: "Tom Beckett",
    role: "Founder",
    company: "Kettle & Co",
    tint: 2,
    medium: "video",
    duration: "1:12",
    rating: 5,
    submittedAt: "2026-09-10",
    status: "pending",
    tags: ["ecommerce", "rebrand"],
    featured: false,
    body:
      "Honestly I was dreading the rebrand because we had done one before and it took nine months. Aurora had the new storefront live in five weeks. The thing I keep telling people is that conversion on the product page went up 22% and we did not touch the pricing.",
    ai: {
      pullQuote:
        "Conversion on the product page went up 22% and we did not touch the pricing.",
      headline: "A five-week rebrand that moved conversion 22%",
      quality: 91,
      spam: false,
      rationale:
        "Transcribed from video. Contains a specific, attributable metric - verify the 22% figure with the client before publishing it.",
      sentiment: "positive",
      topics: ["rebrand speed", "conversion", "ecommerce"],
    },
  },
  {
    id: "t_03",
    name: "Marguerite Osei",
    role: "VP Marketing",
    company: "Halcyon Health",
    tint: 1,
    medium: "written",
    rating: 5,
    submittedAt: "2026-09-08",
    status: "approved",
    tags: ["healthcare", "brand"],
    featured: false,
    body:
      "Working in regulated health marketing means most agencies hand you something beautiful that legal immediately kills. Aurora sat in the compliance reviews with us. Every asset they delivered cleared review first time, which has never happened here.",
    ai: {
      pullQuote: "Every asset they delivered cleared review first time, which has never happened here.",
      headline: "Brand work that clears compliance first time",
      quality: 93,
      spam: false,
      rationale: "Specific to a regulated vertical and answers an objection prospects in that vertical will have.",
      sentiment: "positive",
      topics: ["compliance", "brand", "healthcare"],
    },
  },
  {
    id: "t_04",
    name: "Dan Whitfield",
    role: "CTO",
    company: "Brightpath",
    tint: 3,
    medium: "video",
    duration: "0:48",
    rating: 4,
    submittedAt: "2026-09-06",
    status: "pending",
    tags: ["platform"],
    featured: false,
    body:
      "The build quality was genuinely good - typed end to end, sensible tests, no surprises when we took it over. I would have liked more written handover at the end, but two calls sorted it and the repo speaks for itself.",
    ai: {
      pullQuote: "Typed end to end, sensible tests, no surprises when we took it over.",
      headline: "A codebase a CTO was happy to inherit",
      quality: 84,
      spam: false,
      rationale:
        "Credible because it includes a mild criticism. Consider publishing it in full rather than as a pull-quote - the caveat adds trust.",
      sentiment: "mixed",
      topics: ["code quality", "handover", "testing"],
    },
  },
  {
    id: "t_05",
    name: "Sofia Lindqvist",
    role: "Operations Lead",
    company: "Tern Freight",
    tint: 4,
    medium: "written",
    rating: 5,
    submittedAt: "2026-09-03",
    status: "approved",
    tags: ["internal tools", "logistics"],
    featured: false,
    body:
      "Our dispatchers were running the whole operation out of a spreadsheet with 40 tabs. The tool Aurora built replaced all of it. Onboarding a new dispatcher used to take two weeks of shadowing and now takes an afternoon.",
    ai: {
      pullQuote: "Onboarding a new dispatcher used to take two weeks of shadowing and now takes an afternoon.",
      headline: "From a 40-tab spreadsheet to an afternoon of onboarding",
      quality: 95,
      spam: false,
      rationale: "Vivid before state plus a hard time saving. Reads well as a standalone quote.",
      sentiment: "positive",
      topics: ["internal tools", "onboarding time"],
    },
  },
  {
    id: "t_06",
    name: "gr8deals",
    role: "-",
    company: "-",
    tint: 5,
    medium: "written",
    rating: 5,
    submittedAt: "2026-09-02",
    status: "pending",
    tags: [],
    featured: false,
    body:
      "best servcie ever!!! 5 stars amazing team check out my offer at bit.ly/cheap-seo-now we do backlinks for cheap dm me",
    ai: {
      pullQuote: "",
      headline: "",
      quality: 4,
      spam: true,
      rationale:
        "Contains a shortened outbound link and a solicitation, no reference to any delivered work, and generic superlatives. Auto-held before it reached the queue.",
      sentiment: "positive",
      topics: [],
    },
  },
  {
    id: "t_07",
    name: "Ravi Menon",
    role: "Product Design Manager",
    company: "Cobalt",
    tint: 0,
    medium: "written",
    rating: 4,
    submittedAt: "2026-08-29",
    status: "approved",
    tags: ["design system"],
    featured: false,
    body:
      "They embedded two designers with my team for a quarter and left us better than they found us. My juniors still reference the critique format Aurora introduced, six months on.",
    ai: {
      pullQuote: "They embedded two designers with my team for a quarter and left us better than they found us.",
      headline: "An embedded team that left a process behind",
      quality: 88,
      spam: false,
      rationale: "Speaks to capability transfer rather than a single deliverable - useful for retainer prospects.",
      sentiment: "positive",
      topics: ["embedded team", "mentoring"],
    },
  },
  {
    id: "t_08",
    name: "Hannah Doyle",
    role: "Marketing Director",
    company: "Stillwater",
    tint: 1,
    medium: "video",
    duration: "1:34",
    rating: 5,
    submittedAt: "2026-08-27",
    status: "approved",
    tags: ["campaign", "brand"],
    featured: false,
    body:
      "We had six weeks to launch a campaign that normally takes a quarter. Aurora ran it like they had done it a hundred times. We hit the date, and the landing page is still the highest converting one we own.",
    ai: {
      pullQuote: "We hit the date, and the landing page is still the highest converting one we own.",
      headline: "A quarter's campaign delivered in six weeks",
      quality: 92,
      spam: false,
      rationale: "Deadline pressure plus a durable outcome. Good fit for the carousel layout alongside t_02.",
      sentiment: "positive",
      topics: ["campaign", "deadline", "conversion"],
    },
  },
  {
    id: "t_09",
    name: "Jonas Brekke",
    role: "Head of Growth",
    company: "Lofoten Labs",
    tint: 3,
    medium: "written",
    rating: 3,
    submittedAt: "2026-08-24",
    status: "hidden",
    tags: ["growth"],
    featured: false,
    body:
      "Good work overall. The first two weeks were slow while we sorted out access to our analytics, which was partly on us. Once that was resolved things moved quickly.",
    ai: {
      pullQuote: "Once that was resolved things moved quickly.",
      headline: "Solid delivery after a slow start",
      quality: 61,
      spam: false,
      rationale:
        "Lukewarm and leads with the problem. Not recommended for the widget, but worth keeping for internal reference.",
      sentiment: "mixed",
      topics: ["kickoff delay", "analytics access"],
    },
  },
  {
    id: "t_10",
    name: "Amara Okafor",
    role: "COO",
    company: "Verdant Supply",
    tint: 2,
    medium: "written",
    rating: 5,
    submittedAt: "2026-08-21",
    status: "approved",
    tags: ["internal tools", "operations"],
    featured: false,
    body:
      "I have hired a lot of agencies and the difference here was the questions they asked in week one. They found a workflow problem we had stopped noticing, fixed that first, and the software came second. That order mattered.",
    ai: {
      pullQuote: "They found a workflow problem we had stopped noticing, fixed that first, and the software came second.",
      headline: "The questions asked in week one",
      quality: 94,
      spam: false,
      rationale: "Differentiates on process rather than output. Strong opener for the single-quote layout.",
      sentiment: "positive",
      topics: ["discovery", "process", "operations"],
    },
  },
];

/**
 * Twelve weeks of link views, form starts, submissions and widget
 * impressions, oldest first. Seeded as daily buckets so the analytics
 * pipeline does real work, and live events add to the current week.
 */
export const WEEKS = [
  { views: 61, started: 24, submitted: 11, impressions: 1840 },
  { views: 74, started: 31, submitted: 14, impressions: 2010 },
  { views: 58, started: 22, submitted: 9, impressions: 1960 },
  { views: 96, started: 44, submitted: 19, impressions: 2380 },
  { views: 88, started: 39, submitted: 17, impressions: 2290 },
  { views: 112, started: 53, submitted: 24, impressions: 2740 },
  { views: 104, started: 47, submitted: 21, impressions: 2610 },
  { views: 131, started: 63, submitted: 29, impressions: 3120 },
  { views: 127, started: 61, submitted: 28, impressions: 3040 },
  { views: 149, started: 74, submitted: 34, impressions: 3480 },
  { views: 163, started: 82, submitted: 38, impressions: 3810 },
  { views: 158, started: 79, submitted: 36, impressions: 3720 },
];
