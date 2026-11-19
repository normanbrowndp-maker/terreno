import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["tests/inspection-local/**/*.test.ts"], setupFiles: ["tests/setup-integration.ts"], fileParallelism: false },
});
