import { getRequestContext } from '@cloudflare/next-on-pages'

/**
 * Helper to get the Database instance.
 * For local Next.js dev server, we can't easily mock `getRequestContext().env.DB`.
 * So we inject a fallback mock D1 Database created with `better-sqlite3`.
 */
export async function getDb(): Promise<D1Database> {
    try {
        // Try to get the D1 binding from Cloudflare Pages environment
        const ctx = getRequestContext();
        if (ctx && ctx.env && ctx.env.DB) {
            return ctx.env.DB;
        }
    } catch (error) {
        // getRequestContext throws if outside of Cloudflare worker context
    }

    // Fallback to local mock D1 for `next dev`
    if (process.env.NODE_ENV === 'development') {
        console.log("⚠️ Using local HTTP Mock D1 Database proxy on port 8788");

        const proxyPath = 'http://127.0.0.1:8788';

        const proxyD1 = {
            prepare: (query: string) => {
                return {
                    bind: (...params: any[]) => {
                        return {
                            all: async () => {
                                const res = await fetch(proxyPath, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'prepare_all', query, params })
                                });
                                return res.json();
                            },
                            run: async () => {
                                const res = await fetch(proxyPath, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'prepare_run', query, params })
                                });
                                return res.json();
                            },
                        };
                    },
                    all: async () => {
                        const res = await fetch(proxyPath, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'prepare_all', query, params: [] })
                        });
                        return res.json();
                    },
                    run: async () => {
                        const res = await fetch(proxyPath, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'prepare_run', query, params: [] })
                        });
                        return res.json();
                    },
                    // We attach these so that `batch` can extract them
                    _query: query,
                    _params: []
                };
            },
            batch: async (statements: any[]) => {
                // Statements could be from `.prepare()` or `.prepare().bind()`
                // For a proper mock, we need to pass back the queries to the proxy
                // The tricky part: `statements` array contains the objects returned from `bind()` or `prepare()`.
                // Let's ensure the proxy receives what it needs.

                // Modifying the mock above, we could attach the raw strings if possible, 
                // but for simplicity our D1Proxy just expects `statements = [{ query, params }]`

                // Since JavaScript doesn't allow easy reflection of returned objects unless we attach them... 
                // Let's wrap binding and prepare to always include _query and _params.
                const stmtsToRun = statements.map((stmt: any) => ({
                    query: stmt._query,
                    params: stmt._params || []
                }));

                const res = await fetch(proxyPath, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'batch', statements: stmtsToRun })
                });
                return res.json();
            }
        };

        // Re-override bind to include the private variables for batching
        const originalPrepare = proxyD1.prepare;
        proxyD1.prepare = (query: string) => {
            const stmt: any = originalPrepare(query);
            stmt._query = query;
            stmt._params = [];

            const originalBind = stmt.bind;
            stmt.bind = (...params: any[]) => {
                const boundStmt: any = originalBind(...params);
                boundStmt._query = query;
                boundStmt._params = params;
                // Override the methods on the bound statement to log/debug
                const originalAll = boundStmt.all;
                boundStmt.all = async () => {
                    try {
                        const data = await originalAll();
                        if (!data || !Array.isArray(data.results)) {
                            console.error('[Mock D1] bind().all() returned invalid data for query:', query, '=>', data);
                        }
                        return data;
                    } catch (e) {
                        console.error('[Mock D1] bind().all() fetch failed:', e);
                        throw e;
                    }
                };
                return boundStmt;
            };

            const originalAllUnbound = stmt.all;
            stmt.all = async () => {
                try {
                    const data = await originalAllUnbound();
                    if (!data || !Array.isArray(data.results)) {
                        console.error('[Mock D1] prepare().all() returned invalid data for query:', query, '=>', data);
                    }
                    return data;
                } catch (e) {
                    console.error('[Mock D1] prepare().all() fetch failed:', e);
                    throw e;
                }
            };

            return stmt;
        };

        return proxyD1 as unknown as D1Database;
    }

    throw new Error("D1 Database binding not found and mock is unavailable.");
}
