import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Unmodified distribution worker from the pinned maplibre-gl package, with its license alongside.
  globalIgnores(['public/geodata/maplibre-worker.mjs', '.next/**', 'node_modules/**', '.agents/**', '.local/**', 'docs/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts']),
]);
