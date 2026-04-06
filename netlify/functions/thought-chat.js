const { GEMINI_API_KEY } = process.env;
const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const FETCH_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function safeJsonParse(raw) {
  try {
    return { value: JSON.parse(raw || '{}'), error: null };
  } catch(_) {
    return { value: null, error: 'JSON invalido en la solicitud.' };
  }
}

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  if(!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'GEMINI_API_KEY no configurada en Netlify' })
    };
  }

  try {
    const parsedBody = safeJsonParse(event.body);
    if(parsedBody.error) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: parsedBody.error })
      };
    }
    const body = parsedBody.value || {};
    const thought = String(body.thought || '').trim();
    const question = String(body.question || '').trim();

    if(!thought) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Falta el pensamiento para debatir.' })
      };
    }

    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `
            Rol: interlocutor intelectual en espanol, claro y util.
            Tarea: debatir un pensamiento del usuario con respeto y precision.
            Reglas:
            1. Responde en espanol neutro.
            2. Resume primero la idea del usuario en una frase.
            3. Presenta un argumento a favor y un argumento en contra si aplica.
            4. Si el pensamiento toca fisica, logica, psicologia o percepcion, usalo para razonar mejor.
            5. No inventes certezas. Cuando algo sea incierto, dilo.
            6. Cierra con una conclusion provisoria y una pregunta util para seguir pensando.
            7. Devuelve texto plano, sin markdown complejo ni bloques de codigo.
          ` }]
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `Pensamiento: ${thought}\n\nPregunta o enfoque: ${question || 'Quiero debatir esta idea con argumentos claros.'}`
          }]
        }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if(!response.ok) {
      const errText = typeof data === 'object' ? JSON.stringify(data).slice(0, 300) : '';
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Gemini ${response.status}: ${errText || 'No se pudo debatir el pensamiento.'}` })
      };
    }

    const reply = (data?.candidates?.[0]?.content?.parts || [])
      .map(part => typeof part?.text === 'string' ? part.text : '')
      .filter(Boolean)
      .join('\n')
      .trim();

    if(!reply) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'La IA no devolvio una respuesta utilizable.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };
  } catch(error) {
    const isTimeout = error?.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: isTimeout ? 'La IA tardo demasiado. Intenta de nuevo.' : (error.message || 'Error inesperado al debatir el pensamiento.') })
    };
  }
};
