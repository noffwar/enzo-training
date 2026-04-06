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
    .map((part) => typeof part?.text === 'string' ? part.text : '')
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
    const meal = String(body.meal || body.text || '').trim();
    if(!meal) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Falta descripcion del alimento' })
      };
    }
    if(meal.length > 500) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Descripcion demasiado larga' })
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const payload = {
      systemInstruction: {
        parts: [{ text: `
          ROL: Extractor tecnico de nutricion deportiva para Argentina.
          REGLAS DE CALCULO Y ESTIMACION:
          1. CRUDO VS COCIDO (CRITICO): Si el usuario no especifica, asume "cocido" para platos listos (fideos, asado) y "crudo" para ingredientes crudos.
          2. FORMATO VISUAL (qty): Devuelve SIEMPRE el numero, la unidad y el estado entre parentesis. Ejemplos: 500g (cocido), 210g (crudo). No uses comillas dentro de este texto.
          3. ORTOGRAFIA Y CORRECCION (name): Corrige errores de tipeo del usuario. Respeta mayusculas iniciales y nombres claros.
          4. ESTIMACION VISUAL:
             - Un puno (arroz, pasta): 190g (cocido).
             - Una palma (carnes): 210g (crudo).
             - Una palma (carne molida): 180g (crudo).
             - Un pulgar (frutos secos): 10g.
             - Un pulgar (aceites, manteca): 15g.
             - Cucharada ras/colmada: 9g / 23g.
             - Cucharadita ras/colmada: 3g / 8g.
             - Plato hondo: 400g.
          5. PREVENCION DE ERROR JSON (nota): Para la nota explicativa, usa solo letras, numeros y espacios. No uses comillas ni saltos de linea.
        ` }]
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
            qty: { type: 'STRING' },
            cals: { type: 'INTEGER' },
            prot: { type: 'INTEGER' },
            carb: { type: 'INTEGER' },
            fat: { type: 'INTEGER' },
            nota: { type: 'STRING' }
          },
          required: ['name', 'qty', 'cals', 'prot', 'carb', 'fat', 'nota']
        }
      }
    };

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if(!response.ok) {
      const errText = await response.text();
      const upstreamError = new Error(`Gemini ${response.status}: ${errText.slice(0, 400)}`);
      upstreamError.statusCode = response.status;
      throw upstreamError;
    }

    const data = await response.json();
    if(!data.candidates?.[0]?.content) {
      const reason = data.candidates?.[0]?.finishReason || 'desconocido';
      throw new Error(`IA bloqueo la respuesta (${reason}). Reformula el alimento.`);
    }

    const rawText = collectResponseText(data);
    const parsed = extractFirstJsonObject(rawText) || tryParseLooseJson(rawText);
    if(!parsed) {
      throw new Error(`La IA no devolvio JSON valido: ${rawText.slice(0, 120)}`);
    }

    const cals = Math.max(0, Math.min(5000, parseInt(parsed.cals, 10) || 0));
    const prot = Math.max(0, Math.min(500, parseInt(parsed.prot, 10) || 0));
    const carb = Math.max(0, Math.min(500, parseInt(parsed.carb, 10) || 0));
    const fat = Math.max(0, Math.min(500, parseInt(parsed.fat, 10) || 0));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(parsed.name || meal).slice(0, 100),
        qty: String(parsed.qty || '1 porcion').slice(0, 50),
        cals,
        prot,
        carb,
        fat,
        nota: String(parsed.nota || '').slice(0, 200)
      })
    };
  } catch(error) {
    const isTimeout = error?.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : (error.statusCode || 500),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: isTimeout ? 'La IA tardo demasiado. Intenta de nuevo.' : (error.message || 'No se pudieron calcular los macros.')
      })
    };
  }
};
