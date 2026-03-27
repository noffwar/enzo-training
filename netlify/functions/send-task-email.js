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

    const accent = priority === 'high' ? '#ef4444' : priority === 'low' ? '#10b981' : '#f59e0b';
    const html = `
      <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
          <div style="padding:18px 22px;background:#0f172a;color:#ffffff;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.8;">Enzo Training</p>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">Recordatorio de tarea</h1>
          </div>
          <div style="padding:22px;">
            <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:${accent};color:#ffffff;font-size:12px;font-weight:700;text-transform:uppercase;">
              Prioridad ${priority}
            </div>
            <h2 style="margin:16px 0 10px;font-size:22px;line-height:1.3;">${title}</h2>
            <p style="margin:0 0 14px;font-size:14px;color:#475569;">
              Vencimiento: <strong style="color:#0f172a;">${dueAt || 'Sin fecha'}</strong>
            </p>
            <div style="padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Detalle</p>
              <p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#0f172a;">${details || title}</p>
            </div>
          </div>
        </div>
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
        html,
        text: `Recordatorio de tarea\n\nTitulo: ${title}\nPrioridad: ${priority}\nVencimiento: ${dueAt || 'Sin fecha'}\n\nDetalle:\n${details || title}`
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
