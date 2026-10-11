import { defineConfig } from "vitest/config";

// The first run downloads a MongoDB binary for mongodb-memory-server.
export default defineConfig({ test: { hookTimeout: 120_000, testTimeout: 20_000 } });
