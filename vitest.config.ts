import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    // unit: 純粋なロジック / api: API ルートを D1（メモリ上）に対して実行する
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
    // API テストは D1（workerd）の起動に数秒かかる
    testTimeout: 15000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["lib/**", "app/api/**"],
      exclude: ["**/*.d.ts", "lib/utils.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
