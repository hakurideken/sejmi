const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { player_name, score, wave } = JSON.parse(event.body);

    // Validation
    if (!player_name || !score || !wave) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Chybí povinná pole' })
      };
    }

    if (player_name.length < 2 || player_name.length > 20) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Jméno musí mít 2-20 znaků' })
      };
    }

    if (typeof score !== 'number' || score < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Neplatné skóre' })
      };
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL);
    
    // Insert score
    await sql`
      INSERT INTO leaderboard (player_name, score, wave)
      VALUES (${player_name}, ${score}, ${wave})
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Skóre uloženo' })
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Chyba při ukládání skóre' })
    };
  }
};
