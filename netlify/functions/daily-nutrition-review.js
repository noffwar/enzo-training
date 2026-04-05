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

function extractFirstJsonObject(text) {
  if(!text) return null;
  try { return JSON.parse(text); } catch(_) {}
  const start = text.indexOf('{');
  if(start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for(let i = start; i < text.length; i++) {
    const ch = text[i];
    if(inString) {
      if(escaped) escaped = false;
      else if(ch === '\\') escaped = true;
      else if(ch === '"') inString = false;
      continue;
    }
    if(ch === '"') { inString = true; continue; }
    if(ch === '{') depth++;
    if(ch === '}') depth--;
    if(depth === 0) {
      try { return JSON.parse(text.slice(start, i + 1)); } catch(_) { return null; }
    }
  }
  return null;
}

function collectResponseText(data) {
  const candidate = data?.candidates?.[0];
  const texts = (candidate?.content?.parts || [])
    .map(part => typeof part?.text === 'string' ? part.text : '')
    .filter(Boolean);
  return texts.join('\n').trim();
}

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if(!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY no configurada en Netlify' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const meals = Array.isArray(body.meals) ? body.meals : [];
    const totals = body.totals || {};
    const reviewDate = String(body.date || '').trim();
    if(meals.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No hay comidas para revisar.' }) };
    }

    const prompt = `
Analiza este dia de comida de forma ESTIMATIVA, conservadora y orientada a recomendacion deportiva.
No des consejo medico. No inventes precision falsa.

Fecha: ${reviewDate || 'sin fecha'}
Totales macros: ${JSON.stringify(totals)}
Comidas/items: ${JSON.stringify(meals)}

Devuelve SOLO JSON con este schema exacto:
{
  "day_summary": "string corto",
  "nutrients": {
    "grasas": "low|ok|high",
    "fibra": "low|ok|high",
    "hierro": "low|ok|high",
    "magnesio": "low|ok|high",
    "zinc": "low|ok|high",
    "potasio": "low|ok|high",
    "calcio": "low|ok|high",
    "vitaminas": "low|ok|high",
    "sodio": "low|ok|high"
  },
  "tomorrow_recommendations": [
    "string corto 1",
    "string corto 2",
    "string corto 3"
  ],
  "fat_advice": "string corto",
  "fasting_advice": {
    "recommendation": "si|no|cautela",
    "reason": "string corto",
    "hunger_window": "HH:MM-HH:MM o estimado"
  }
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 900,
          responseMimeType: 'application/json'
        }
      })
    });

    if(!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini ${response.status}: ${errText.slice(0, 300)}`);
    }
    const data = await response.json();
    const raw = collectResponseText(data);
    const parsed = extractFirstJsonObject(raw);
    if(!parsed) throw new Error('La IA no devolvio JSON valido.');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch(error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'No se pudo revisar la nutricion diaria.' })
    };
  }
};
