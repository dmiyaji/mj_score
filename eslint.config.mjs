import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __dirname = dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "cloudflare-env.d.ts",
      "components/ui/**", // shadcn/ui の生成コード
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      // v0 由来のコードに多数あるため当面は警告に留め、段階的に解消する
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]

export default eslintConfig
