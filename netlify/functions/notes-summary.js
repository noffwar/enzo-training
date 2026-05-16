const { GEMINI_API_KEY } = process.env;
const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const FETCH_TIMEOUT_MS = 8000;

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
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if(!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY no configurada' }) };
  }

  try {
    const parsedBody = safeJsonParse(event.body);
    if(parsedBody.error) return { statusCode: 400, body: JSON.stringify({ error: parsedBody.error }) };
    
    const { title, author, notes } = parsedBody.value || {};
    if(!notes || !Array.isArray(notes) || notes.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No hay notas para resumir.' }) };
    }

    const notesText = notes.map(n => `- [Pag ${n.current_page}]: ${n.question || n.answer}`).join('\n');

    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `
            Rol: Asistente de aprendizaje y lectura.
            Tarea: Analizar las notas personales del usuario sobre el libro "${title}"${author ? ` de ${author}` : ''} y generar un resumen estructurado de los aprendizajes clave.
            Reglas:
            1. No inventes informacion del libro que no este en las notas.
            2. Agrupa los aprendizajes en conceptos o temas.
            3. Identifica preguntas abiertas o dudas si las hay.
            4. Escribe en espanol neutro y claro.
            5. Formato: maximo 6 puntos con una conclusion breve.
          ` }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: `A continuacion mis notas del libro:\n\n${notesText}\n\nResumi mis aprendizajes principales de forma estructurada.` }]
        }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 }
      })
    });

    const data = await response.json();
    if(!response.ok) throw new Error('Error en Gemini');

    const reply = (data?.candidates?.[0]?.content?.parts || [])
      .map(p => p.text).join('\n').trim();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };
  } catch(error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
