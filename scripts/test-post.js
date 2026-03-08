const https = require('https');

async function fetchPlayers() {
    return new Promise((resolve, reject) => {
        https.get('https://mj-score.pages.dev/api/players', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function postGameResult(payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            hostname: 'mj-score.pages.dev',
            port: 443,
            path: '/api/game-results',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(options, (res) => {
            let responseBody = '';
            res.setEncoding('utf8');
            res.on('data', chunk => responseBody += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: responseBody });
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function runTest() {
    try {
        const players = await fetchPlayers();
        if (players.length < 4) {
            console.log('Not enough players in DB to run test.');
            return;
        }

        // Pick first 4 players
        const selected = players.slice(0, 4);

        const payload = {
            gameDate: "2026-03-08",
            playerResults: [
                {
                    playerId: selected[0].id,
                    teamId: selected[0].team_id || "00000000-0000-0000-0000-000000000001",
                    score: 30000,
                    points: 10,
                    penaltyPoints: 0,
                    rank: 1
                },
                {
                    playerId: selected[1].id,
                    teamId: selected[1].team_id || "00000000-0000-0000-0000-000000000001",
                    score: 25000,
                    points: -10,
                    penaltyPoints: 0,
                    rank: 2
                },
                {
                    playerId: selected[2].id,
                    teamId: selected[2].team_id || "00000000-0000-0000-0000-000000000001",
                    score: 25000,
                    points: -10,
                    penaltyPoints: 0,
                    rank: 3
                },
                {
                    playerId: selected[3].id,
                    teamId: selected[3].team_id || "00000000-0000-0000-0000-000000000001",
                    score: 20000,
                    points: -30,
                    penaltyPoints: 0,
                    rank: 4
                }
            ]
        };

        console.log('Sending payload without seasonId to test fallback logic...');
        const result = await postGameResult(payload);
        console.log(`STATUS: ${result.status}`);
        console.log(`BODY: ${result.body}`);
    } catch (err) {
        console.error(err);
    }
}

runTest();
