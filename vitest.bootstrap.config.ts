import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["tests/bootstrap-local/**/*.test.ts"], fileParallelism: false, testTimeout: 45000, hookTimeout: 90000 },
});
