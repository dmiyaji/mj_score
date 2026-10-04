// PBKDF2 によるパスワードハッシュ（Web Crypto のみ使用。Workers / Node.js の両方で動く）
//
// 保存形式: "pbkdf2:<iterations>:<saltHex>:<hashHex>"
// ハッシュの生成は scripts/generate-hash.mjs で行う（同じ形式を出力する）

// Workers の PBKDF2 は 100,000 回が上限
export const PBKDF2_ITERATIONS = 100_000

const KEY_LENGTH_BITS = 256

function hexEncode(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function hexDecode(hex: string): Uint8Array {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error("Invalid hex string")
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function deriveHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS
  )
  return new Uint8Array(bits)
}

/** 定数時間比較（タイミング攻撃対策） */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveHash(password, salt, iterations)
  return `pbkdf2:${iterations}:${hexEncode(salt)}:${hexEncode(hash)}`
}

/** 保存済みハッシュとパスワードを照合する。形式が不正な場合は false */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.trim().split(":")
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false

  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false

  try {
    const salt = hexDecode(parts[2])
    const expected = hexDecode(parts[3])
    const actual = await deriveHash(password, salt, iterations)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
