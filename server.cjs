// Production entry point at the repo root, for hosts that start the app with
// `node <entry file>` or load it with require() (Hostinger, Passenger). The API
// is an ES module with top-level await, which require() cannot load, so this
// CommonJS file hands over with a dynamic import().
import("./apps/api/dist/server.mjs").catch((err) => {
  console.error(err);
  process.exit(1);
});
