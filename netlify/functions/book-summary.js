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
    const body = JSON.parse(event.body || '{}');
    const title = String(body.title || '').trim();
    const author = String(body.author || '').trim();
    const currentPage = Math.max(1, parseInt(body.current_page || 1, 10) || 1);

    if(!title) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Faltan datos del libro.' })
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
            Rol: asistente literario en espanol neutro.
            Libro: ${title}${author ? ` de ${author}` : ''}.
            Limite critico: el usuario solo leyo hasta la pagina ${currentPage}.
            Tarea: crear un resumen seguro de lo leido hasta esa pagina.
            Reglas obligatorias:
            1. Tienes estrictamente prohibido revelar hechos, giros, interpretaciones o personajes nuevos posteriores a la pagina ${currentPage}.
            2. Resume solo lo compatible con lo ya leido.
            3. Escribe 5 puntos maximo y un cierre breve.
            4. Habla en espanol claro.
            5. No uses markdown complejo ni bloques de codigo.
            6. Si hay duda sobre si algo ocurre despues, elige la opcion mas conservadora.
          ` }]
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `Dame un resumen seguro de ${title} hasta la pagina ${currentPage}, con ideas principales, tono y conflictos visibles hasta ese punto.`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 450
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if(!response.ok) {
      const errText = typeof data === 'object' ? JSON.stringify(data).slice(0, 300) : '';
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Gemini ${response.status}: ${errText || 'No se pudo resumir el libro.'}` })
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
        body: JSON.stringify({ error: 'La IA no devolvio un resumen utilizable.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };
  } catch(error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Error inesperado al resumir el libro.' })
    };
  }
};
