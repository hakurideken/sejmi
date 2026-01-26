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

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL);
    
    const scores = await sql`
      SELECT player_name, score, wave, created_at
      FROM leaderboard
      ORDER BY score DESC, wave DESC
      LIMIT 10
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ scores })
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Chyba při načítání žebříčku' })
    };
  }
};
