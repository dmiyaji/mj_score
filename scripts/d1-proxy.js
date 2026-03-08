const { Miniflare, Log, LogLevel } = require('miniflare');
const path = require('path');

async function startProxy() {
    const mf = new Miniflare({
        log: new Log(LogLevel.INFO),
        modules: true,
        script: `
      export default {
        async fetch(request, env) {
          if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
          
          try {
            const body = await request.json();
            const { action, query, params, statements } = body;
            
            if (action === 'prepare_all') {
              const stmt = env.DB.prepare(query).bind(...(params || []));
              const result = await stmt.all();
              return Response.json(result);
            }
            
            if (action === 'prepare_run') {
              const stmt = env.DB.prepare(query).bind(...(params || []));
              const result = await stmt.run();
              return Response.json(result);
            }
            
            if (action === 'batch') {
              const stmtsToRun = statements.map(s => env.DB.prepare(s.query).bind(...(s.params || [])));
              const results = await env.DB.batch(stmtsToRun);
              return Response.json(results);
            }
            
            return new Response('Unknown action', { status: 400 });
          } catch (error) {
            return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
          }
        }
      }
    `,
        d1Databases: {
            DB: 'mj-score-db'
        },
        d1Persist: path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'mj-score-db'),
        port: 8788
    });

    console.log('Starting D1 Proxy Server on http://127.0.0.1:8788');
    await mf.ready;
    console.log('D1 Proxy is ready!');
}

startProxy().catch(console.error);
