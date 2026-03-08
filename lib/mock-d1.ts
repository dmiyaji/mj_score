import Database from 'better-sqlite3';

// A simple mock of the Cloudflare D1 API using better-sqlite3
export function createMockD1() {
    const db = new Database('./local_dev.sqlite');

    return {
        prepare: (query: string) => {
            return {
                bind: (...params: any[]) => {
                    return {
                        all: async () => {
                            const stmt = db.prepare(query);
                            const results = stmt.all(...params);
                            return { success: true, results };
                        },
                        run: async () => {
                            const stmt = db.prepare(query);
                            const info = stmt.run(...params);
                            return { success: true, meta: info };
                        },
                        first: async () => {
                            const stmt = db.prepare(query);
                            const result = stmt.get(...params);
                            return result;
                        }
                    };
                },
                all: async () => {
                    const stmt = db.prepare(query);
                    const results = stmt.all();
                    return { success: true, results };
                },
                run: async () => {
                    const stmt = db.prepare(query);
                    const info = stmt.run();
                    return { success: true, meta: info };
                },
                first: async () => {
                    const stmt = db.prepare(query);
                    const result = stmt.get();
                    return result;
                }
            };
        },
        batch: async (statements: any[]) => {
            // Very simple batch implementation
            const results = [];
            const transaction = db.transaction((stmts) => {
                for (const stmt of stmts) {
                    // In our mock, stmt is the object returned from bind() or prepare()
                    // We need to extract the raw sql and params
                    // For a hacky simple local dev setup, we could just execute the run() method of the bound statement
                }
            });
            // A better way for our specific codebase is:
            for (const stmt of statements) {
                results.push(await stmt.run());
            }
            return results;
        }
    } as unknown as D1Database;
}
