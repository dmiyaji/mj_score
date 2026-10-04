// 管理者パスワードの PBKDF2 ハッシュを生成する（ADMIN_PASSWORD_HASH に設定する値）
// 実行: node scripts/generate-hash.mjs <password>
// 形式・回数は lib/password.ts と揃えること

const ITERATIONS = 100_000

const password = process.argv[2]
if (!password) {
  console.error("Usage: node scripts/generate-hash.mjs <password>")
  process.exit(1)
}

const hexEncode = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")

const salt = crypto.getRandomValues(new Uint8Array(16))
const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
  "deriveBits",
])
const bits = await crypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
  keyMaterial,
  256
)

console.log(`pbkdf2:${ITERATIONS}:${hexEncode(salt)}:${hexEncode(new Uint8Array(bits))}`)
