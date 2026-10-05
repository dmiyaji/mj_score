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
      "hooks/use-toast.ts", // shadcn/ui の生成コード
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // 分割代入で不要なキーを除くとき（const { teams: _teams, ...rest } = row）は、先頭が _ の変数を無視する
      "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },
]

export default eslintConfig
