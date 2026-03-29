const { GEMINI_API_KEY } = process.env;
const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

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
    const question = String(body.question || '').trim();
    const currentPage = Math.max(1, parseInt(body.current_page || 1, 10) || 1);

    if(!title || !question) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Faltan datos para consultar el libro.' })
      };
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
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
            Reglas obligatorias:
            1. Tienes estrictamente prohibido revelar hechos, giros, interpretaciones o personajes nuevos posteriores a la pagina ${currentPage}.
            2. Si la pregunta exige informacion posterior, responde que no podes avanzar sin spoilear y ofrece una alternativa segura.
            3. Habla solo de temas, tono, ideas, simbolos o escenas compatibles con lo ya leido.
            4. Responde en espanol claro y util.
            5. No uses markdown complejo ni bloques de codigo.
            6. Si hay duda sobre si algo ocurre despues, elige la opcion mas conservadora.
          ` }]
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `Pregunta sobre ${title}: ${question}\n\nRecorda: responder solo con informacion segura hasta la pagina ${currentPage}.`
          }]
        }],
        generationConfig: {
          temperature: 0.4,
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
        body: JSON.stringify({ error: `Gemini ${response.status}: ${errText || 'No se pudo consultar el libro.'}` })
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
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Error inesperado al consultar el libro.' })
    };
  }
};
