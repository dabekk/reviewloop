// Bundles the API for production. Workspace packages (@reviewloop/*) ship as
// TypeScript source, so they are bundled in; every npm dependency stays
// external and is loaded from node_modules at runtime.
import { build } from "esbuild";

await build({
  entryPoints: ["src/server.ts", "src/seed/cli.ts"],
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  plugins: [
    {
      name: "externalize-npm",
      setup(b) {
        b.onResolve({ filter: /^[^./]/ }, (args) =>
          args.path.startsWith("@reviewloop/") ? undefined : { path: args.path, external: true },
        );
      },
    },
  ],
});
