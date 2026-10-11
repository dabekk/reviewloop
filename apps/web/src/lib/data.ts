/** Deterministic avatar tints - identity only, never data encoding. */
export const AVATAR_TINTS = [
  { bg: "#eeebfa", fg: "#4a3aa7" },
  { bg: "#e4f6ee", fg: "#0f7a53" },
  { bg: "#fdf3dd", fg: "#8a5d00" },
  { bg: "#e7effb", fg: "#1c5cab" },
  { bg: "#fdeaea", fg: "#a62f2e" },
  { bg: "#efeeea", fg: "#57544e" },
];

export function embedSnippet(o: { origin: string; space: string; layout: string; theme: string }) {
  return `<script
  src="${o.origin}/w/v1.js"
  data-space="${o.space}"
  data-layout="${o.layout}"
  data-theme="${o.theme}"
  data-limit="6"
  async
></script>`;
}

export const AI_TOOL_SCHEMA = `// apps/api/src/ai/anthropic.ts - structured outputs, so the
// response is constrained to the schema while it is generated.
const res = await client.beta.messages.parse({
  model: "claude-opus-5-5",
  max_tokens: 4000,
  system: SYSTEM, // testimonial text is data, never instructions
  messages: [{ role: "user", content: \`<testimonial>\${body}</testimonial>\` }],
  output_config: { effort: "low", format: betaZodOutputFormat(AssistOutput) },
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
});

// apps/api/src/ai/assist.ts - a valid shape is not a valid answer.
const parsed = AssistOutput.safeParse(res.parsed_output);
const problems = parsed.success ? checkAssist(parsed.data, body) : [...];
// e.g. "pull_quote is not a word-for-word excerpt of the testimonial"
// One retry with the problems attached, then ai.state = "failed":
// the testimonial waits in the queue for a human, unscored.`;
