const { neon } = require('@neondatabase/serverless');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

function ok(body) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(body) };
}
function err(code, msg) {
    return { statusCode: code, headers: HEADERS, body: JSON.stringify({ error: msg }) };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

    const sql = neon(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL);

    // ──────────────────────── GET: dotaz na místnost ────────────────────────
    if (event.httpMethod === 'GET') {
        const { action, room } = event.queryStringParameters || {};
        if (action !== 'poll' || !room) return err(400, 'Chybí akce nebo kód místnosti');

        const code = room.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        const rows = await sql`SELECT room_code, offer, answer, status FROM pvp_rooms WHERE room_code = ${code}`;
        if (rows.length === 0) return err(404, 'Místnost nenalezena');
        return ok(rows[0]);
    }

    // ──────────────────────── POST: akce ────────────────────────
    if (event.httpMethod === 'POST') {
        let body;
        try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Neplatné JSON'); }

        const { action } = body;

        // Vytvořit místnost
        if (action === 'create') {
            // Vygenerovat unikátní 6-místný kód
            let code;
            let attempts = 0;
            while (attempts < 10) {
                code = Math.random().toString(36).substring(2, 8).toUpperCase();
                try {
                    await sql`INSERT INTO pvp_rooms (room_code) VALUES (${code})`;
                    break;
                } catch { attempts++; } // kolize kódu, zkusit znovu
            }
            if (attempts >= 10) return err(500, 'Nepodařilo se vytvořit místnost');

            // Smazat staré místnosti (>2 hodiny)
            await sql`DELETE FROM pvp_rooms WHERE created_at < NOW() - INTERVAL '2 hours'`;

            return ok({ code });
        }

        // Uložit offer (špion)
        if (action === 'offer') {
            const { room, offer } = body;
            if (!room || !offer) return err(400, 'Chybí kód nebo offer');
            const code = room.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            const result = await sql`
                UPDATE pvp_rooms SET offer = ${offer}, status = 'offered'
                WHERE room_code = ${code}
                RETURNING room_code
            `;
            if (result.length === 0) return err(404, 'Místnost nenalezena');
            return ok({ ok: true });
        }

        // Uložit answer (strážce)
        if (action === 'answer') {
            const { room, answer } = body;
            if (!room || !answer) return err(400, 'Chybí kód nebo answer');
            const code = room.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            const result = await sql`
                UPDATE pvp_rooms SET answer = ${answer}, status = 'connected'
                WHERE room_code = ${code}
                RETURNING room_code
            `;
            if (result.length === 0) return err(404, 'Místnost nenalezena');
            return ok({ ok: true });
        }

        return err(400, 'Neznámá akce');
    }

    return err(405, 'Metoda není povolena');
};
