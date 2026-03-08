declare global {
    interface CloudflareEnv extends Cloudflare.Env {
        DB: D1Database;
    }
}

export { }
