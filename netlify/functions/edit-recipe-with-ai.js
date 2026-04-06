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

function collectResponseText(data) {
  const candidate = data?.candidates?.[0];
  const partTexts = (candidate?.content?.parts || [])
    .map(part => typeof part?.text === 'string' ? part.text : '')
    .filter(Boolean);
  return partTexts.join('\n').trim();
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
    if(ch === '"') { inString = true; continue; }
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
    const instruction = String(body.instruction || '').trim();
    const recipe = body.recipe || {};

    if(!instruction) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Falta la instruccion para editar la receta.' })
      };
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: `
          Rol: editor tecnico de recetas y macros para una app de nutricion.
          Tarea: recibir una receta existente y aplicar SOLO el cambio pedido por el usuario.
          Reglas:
          1. Responde solo con JSON valido.
          2. Mantene el sentido general de la receta.
          3. Actualiza ingredientes y recalcula macros en base a la modificacion pedida.
          4. No toques stock ni umbrales. Solo receta, cantidad base, unidad base, ingredientes, nota y macros.
          5. Si el usuario pide bajar o subir una cantidad de un ingrediente, reflejalo en ingredients.
          6. Si un valor es incierto, hace una estimacion razonable y breve en notes.
          7. Devuelve ingredients como lista de objetos con qty y name.
          8. Devuelve macros con enteros no negativos.
          9. Responde en espanol simple.
        ` }]
      },
      contents: [{
        role: 'user',
        parts: [{
          text: JSON.stringify({
            instruction,
            recipe: {
              recipe_name: recipe.recipe_name || '',
              aliases: Array.isArray(recipe.aliases) ? recipe.aliases : [],
              base_qty: recipe.base_qty || '1',
              base_unit: recipe.base_unit || 'porcion',
              macros: recipe.macros || {},
              ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
              notes: recipe.notes || ''
            }
          })
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 900,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            recipe_name: { type: 'STRING' },
            base_qty: { type: 'NUMBER' },
            base_unit: { type: 'STRING' },
            macros: {
              type: 'OBJECT',
              properties: {
                cals: { type: 'INTEGER' },
                prot: { type: 'INTEGER' },
                carb: { type: 'INTEGER' },
                fat: { type: 'INTEGER' }
              },
              required: ['cals', 'prot', 'carb', 'fat']
            },
            ingredients: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  qty: { type: 'STRING' },
                  name: { type: 'STRING' }
                },
                required: ['qty', 'name']
              }
            },
            notes: { type: 'STRING' }
          },
          required: ['recipe_name', 'base_qty', 'base_unit', 'macros', 'ingredients', 'notes']
        }
      }
    };

    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if(!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Gemini ${response.status}: ${JSON.stringify(data).slice(0, 300)}` })
      };
    }

    const text = collectResponseText(data);
    const parsed = extractFirstJsonObject(text);
    if(!parsed) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'La IA no devolvio JSON valido para la receta.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipe_name: String(parsed.recipe_name || recipe.recipe_name || '').trim(),
        base_qty: parsed.base_qty ?? recipe.base_qty ?? 1,
        base_unit: String(parsed.base_unit || recipe.base_unit || 'porcion').trim(),
        macros: {
          cals: Math.max(0, parseInt(parsed.macros?.cals) || 0),
          prot: Math.max(0, parseInt(parsed.macros?.prot) || 0),
          carb: Math.max(0, parseInt(parsed.macros?.carb) || 0),
          fat: Math.max(0, parseInt(parsed.macros?.fat) || 0)
        },
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.map(it => ({
          qty: String(it.qty || '1 porcion').trim(),
          name: String(it.name || 'Ingrediente').trim()
        })) : [],
        notes: String(parsed.notes || recipe.notes || '').trim()
      })
    };
  } catch(error) {
    const isTimeout = error?.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: isTimeout ? 'La IA tardo demasiado. Intenta de nuevo.' : (error.message || 'No se pudo editar la receta con IA.') })
    };
  }
};
