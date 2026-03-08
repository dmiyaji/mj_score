const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
const proxyUrl = 'http://127.0.0.1:8788';

async function init() {
    console.log('Reading schema...');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split statements by semicolon, being careful about empty statements
    let statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s + ';');

    const drops = [
        'DROP TABLE IF EXISTS player_game_results;',
        'DROP TABLE IF EXISTS game_results;',
        'DROP TABLE IF EXISTS players;',
        'DROP TABLE IF EXISTS teams;',
        'DROP TABLE IF EXISTS seasons;'
    ];

    statements = [...drops, ...statements];

    console.log(`Sending ${statements.length} statements to proxy proxy...`);

    const stmtsToRun = statements.map(s => ({ query: s, params: [] }));

    try {
        const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'batch', statements: stmtsToRun })
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Proxy replied with status ${res.status}: ${text}`);
        }

        const data = await res.json();
        console.log('Successfully initialized mock database!', data);
    } catch (err) {
        console.error('Failed to initialize mock database:', err);
        process.exit(1);
    }
}

init();
