import { getCloudflareContext } from "@opennextjs/cloudflare"

/**
 * D1 データベースを取得する。
 * next dev では initOpenNextCloudflareForDev() によりローカル D1（.wrangler/state）が使われる。
 */
export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true })
  if (!env.DB) {
    throw new Error("D1 binding 'DB' is not configured.")
  }
  return env.DB
}
