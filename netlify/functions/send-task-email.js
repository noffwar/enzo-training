const { RESEND_API_KEY, TASKS_EMAIL_TO, RESEND_FROM } = process.env;

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  if(!RESEND_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Falta RESEND_API_KEY en Netlify.' })
    };
  }

  if(!TASKS_EMAIL_TO) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Falta TASKS_EMAIL_TO en Netlify.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const title = String(payload.title || '').trim();
    const details = String(payload.details || '').trim();
    const dueAt = String(payload.dueAt || '').trim();
    const priority = String(payload.priority || 'normal').trim();

    if(!title) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Falta el título de la tarea.' })
      };
    }

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 12px;">Recordatorio de tarea</h2>
        <p style="margin:0 0 8px;"><strong>Título:</strong> ${title}</p>
        <p style="margin:0 0 8px;"><strong>Prioridad:</strong> ${priority}</p>
        <p style="margin:0 0 8px;"><strong>Vencimiento:</strong> ${dueAt || 'Sin fecha'}</p>
        <p style="margin:0;"><strong>Detalle:</strong></p>
        <p style="white-space:pre-wrap;">${details || title}</p>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM || 'Enzo Training <onboarding@resend.dev>',
        to: [TASKS_EMAIL_TO],
        subject: `Recordatorio: ${title}`,
        html
      })
    });

    const data = await response.json().catch(() => ({}));
    if(!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data?.message || 'Resend rechazó el envío.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, id: data.id || null })
    };
  } catch(error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'No se pudo enviar el correo.' })
    };
  }
};
