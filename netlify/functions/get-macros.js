const { GEMINI_API_KEY } = process.env;
const GEMINI_MODEL = 'gemini-3-flash-preview';

function extractFirstJsonObject(text) {
  if(!text) return null;

  try {
    return JSON.parse(text);
  } catch(_) {}

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

    if(ch === '"') {
      inString = true;
      continue;
    }

    if(ch === '{') depth++;
    if(ch === '}') depth--;

    if(depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch(_) {
        return null;
      }
    }
  }

  return null;
}

function tryParseLooseJson(text) {
  if(!text) return null;

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if(start === -1 || end === -1 || end <= start) return null;

  const candidate = text.slice(start, end + 1)
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
    .trim();

  try {
    return JSON.parse(candidate);
  } catch(_) {
    return null;
  }
}

function collectResponseText(data) {
  const candidate = data?.candidates?.[0];
  const partTexts = (candidate?.content?.parts || [])
    .map(part => typeof part?.text === 'string' ? part.text : '')
    .filter(Boolean);

  const merged = [
    typeof data?.text === 'string' ? data.text : '',
    partTexts.join('\n')
  ].filter(Boolean).join('\n').trim();

  if(!merged) return '';

  const fenced = merged.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() || merged;
}

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  // Fail-fast si no hay API key configurada
  if(!GEMINI_API_KEY) return {
    statusCode: 500,
    body: JSON.stringify({ error: 'GEMINI_API_KEY no configurada en Netlify' })
  };

  try {
    const body = JSON.parse(event.body);
    const meal = (body.meal || body.text || '').trim();
    if(!meal) return { statusCode: 400, body: JSON.stringify({ error: 'Falta descripción del alimento' }) };
    if(meal.length > 500) return { statusCode: 400, body: JSON.stringify({ error: 'Descripción demasiado larga' }) };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const payload = {
      systemInstruction: {
        parts: [{ text: `
          ROL: Extractor técnico de nutrición deportiva para Argentina.
          REGLAS DE CÁLCULO Y ESTIMACIÓN:
          1. CRUDO VS COCIDO (CRÍTICO): Si el usuario no especifica, asume "cocido" para platos listos (fideos, asado) y "crudo" para ingredientes crudos.
          2. FORMATO VISUAL (qty): Devuelve SIEMPRE el número, la unidad y el estado entre paréntesis. Ejemplos de formato estricto: 500g (cocido), 210g (crudo). Tienes prohibido usar comillas dentro de este texto.
          3. ORTOGRAFÍA Y CORRECCIÓN (name): Funciona como corrector ortográfico de diccionario. Corrige errores de tipeo del usuario (ej: "fioeos" -> "Fideos", "arros" -> "Arroz"). Respeta tildes, acentos y usa SIEMPRE la primera letra en mayúscula.
          4. ESTIMACIÓN VISUAL:
             - 'Un puño' (arroz, pasta): 190g (cocido).
             - 'Una palma' (carnes): 210g (crudo).
             - 'Una palma' (carne molida): 180g (crudo).
             - 'Un pulgar' (frutos secos): 10g.
             - 'Un pulgar' (aceites, manteca): 15g.
             - 'Cucharada ras/colmada': 9g / 23g.
             - 'Cucharadita ras/colmada': 3g / 8g.
             - 'Plato hondo': 400g.
          5. PREVENCIÓN DE ERROR JSON (nota): Para la nota explicativa, USA ÚNICAMENTE LETRAS, NÚMEROS Y ESPACIOS. Tienes ESTRICTAMENTE PROHIBIDO usar comillas (simples o dobles) o saltos de línea aquí.
        `}]
      },
      contents: [{ role: 'user', parts: [{ text: meal }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 800,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            qty:  { type: 'STRING' },
            cals: { type: 'INTEGER' },
            prot: { type: 'INTEGER' },
            carb: { type: 'INTEGER' },
            fat:  { type: 'INTEGER' },
            nota: { type: 'STRING' }
          },
          required: ['name','qty','cals','prot','carb','fat','nota']
        }
      }
    };

    // Timeout de 6 segundos para ganar de mano al límite de Netlify
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if(!response.ok) {
      const errText = await response.text();
      const upstreamError = new Error(`Gemini ${response.status}: ${errText.slice(0, 400)}`);
      upstreamError.statusCode = response.status;
      throw upstreamError;
    }

    const data = await response.json();

    if(!data.candidates?.[0]?.content) {
      const reason = data.candidates?.[0]?.finishReason || 'desconocido';
      throw new Error(`IA bloqueó la respuesta (${reason}). Reformulá el alimento.`);
    }

    const rawText = collectResponseText(data);
    const parsed = extractFirstJsonObject(rawText) || tryParseLooseJson(rawText);
    if(!parsed) throw new Error(`La IA no devolvió JSON válido: ${rawText.slice(0, 120)}`);

    // Validación y sanitización de rangos
    const cals = Math.max(0, Math.min(5000, parseInt(parsed.cals) || 0));
    const prot = Math.max(0, Math.min(500, parseInt(parsed.prot) || 0));
    const carb = Math.max(0, Math.min(500, parseInt(parsed.carb) || 0));
    const fat = Math.max(0, Math.min(500, parseInt(parsed.fat) || 0));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(parsed.name || meal).slice(0, 100),
        qty: String(parsed.qty || '1 porción').slice(0, 50),
        cals, prot, carb, fat,
        nota: String(parsed.nota || '').slice(0, 200)
      })
    };

  } catch(error) {
    const isTimeout = error.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : (error.statusCode || 500),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: isTimeout ? 'La IA tardó demasiado. Intentá de nuevo.' : error.message })
    };
  }
};
