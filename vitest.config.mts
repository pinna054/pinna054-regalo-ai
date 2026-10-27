import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Test automatici della logica (npm test)
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only-vuoto.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
