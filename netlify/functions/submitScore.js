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

    if (typeof wave !== 'number' || wave < 1) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Neplatná vlna' })
      };
    }

    // Anti-cheat: Přesný výpočet maximálního možného skóre
    const POINTS_PER_ENEMY = 100;
    const MAX_ENEMIES_PER_WAVE = 12;
    
    let maxPossibleScore;
    if (wave <= MAX_ENEMIES_PER_WAVE) {
      // Vlny 1-12: součet 1+2+3+...+wave
      maxPossibleScore = POINTS_PER_ENEMY * (wave * (wave + 1) / 2);
    } else {
      // Vlny 13+: součet do vlny 12 + (wave-12) vln po 12 nepřátelích
      const scoreUpTo12 = POINTS_PER_ENEMY * (12 * 13 / 2); // 7,800
      const scoreAfter12 = POINTS_PER_ENEMY * MAX_ENEMIES_PER_WAVE * (wave - 12);
      maxPossibleScore = scoreUpTo12 + scoreAfter12;
    }
    
    // Kontrola, že skóre není vyšší než maximum
    if (score > maxPossibleScore) {
      console.warn(`Invalid score: ${score} exceeds max ${maxPossibleScore} for wave ${wave} (player: ${player_name})`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Neplatné skóre pro danou vlnu' })
      };
    }

    // Anti-cheat: Nerealistická vlna (nikdo nedosáhne vlny 200+)
    if (wave > 200) {
      console.warn(`Suspicious wave: ${wave} from ${player_name}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Podezřelá vlna' })
      };
    }

    // Anti-cheat: Minimální čas na vlnu
    // Každá vlna vyžaduje minimálně ~10 sekund (hledání, boj, pohyb)
    // Přidáme timestamp do requestu pro kontrolu
    const { game_duration } = JSON.parse(event.body);
    
    if (game_duration !== undefined) {
      // Minimální čas: 10 sekund na vlnu (velmi velkorysé)
      const minTimeSeconds = wave * 10;
      
      if (game_duration < minTimeSeconds) {
        console.warn(`Suspicious time: ${game_duration}s for wave ${wave} (min ${minTimeSeconds}s) from ${player_name}`);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Podezřelý herní čas' })
        };
      }

      // Maximální čas: 10 minut na vlnu (AFK detection)
      const maxTimeSeconds = wave * 600;
      if (game_duration > maxTimeSeconds) {
        console.warn(`Suspicious long time: ${game_duration}s for wave ${wave} from ${player_name}`);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Příliš dlouhý herní čas' })
        };
      }
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
