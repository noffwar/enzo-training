const {
  RESEND_API_KEY,
  TASKS_EMAIL_TO,
  RESEND_FROM,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env;

const jsonHeaders = { 'Content-Type': 'application/json' };
const FETCH_TIMEOUT_MS = 6000;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendReminderEmail(task) {
  const priority = String(task.priority || 'normal');
  const accent = priority === 'high' ? '#ef4444' : priority === 'low' ? '#10b981' : '#f59e0b';
  const dueAt = task.due_at
    ? new Date(task.due_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Sin fecha';
  const title = String(task.title || '').trim();
  const details = String(task.details || '').trim();
  const safeTitle = escapeHtml(title);
  const safeDetails = escapeHtml(details || title);
  const safeDueAt = escapeHtml(dueAt);
  const safePriority = escapeHtml(priority);

  const html = `
    <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="padding:18px 22px;background:#0f172a;color:#ffffff;">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.8;">Enzo Training</p>
          <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">Recordatorio automático</h1>
        </div>
        <div style="padding:22px;">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:${accent};color:#ffffff;font-size:12px;font-weight:700;text-transform:uppercase;">
            Prioridad ${safePriority}
          </div>
          <h2 style="margin:16px 0 10px;font-size:22px;line-height:1.3;">${safeTitle}</h2>
          <p style="margin:0 0 14px;font-size:14px;color:#475569;">
            Vencimiento: <strong style="color:#0f172a;">${safeDueAt}</strong>
          </p>
          <div style="padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Detalle</p>
            <p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#0f172a;">${safeDetails}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const response = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: RESEND_FROM || 'Enzo Training <onboarding@resend.dev>',
      to: [TASKS_EMAIL_TO],
      subject: `Recordatorio automático: ${title}`,
      html,
      text: `Recordatorio automático\n\nTitulo: ${title}\nPrioridad: ${priority}\nVencimiento: ${dueAt}\n\nDetalle:\n${details || title}`
    })
  });

  const data = await response.json().catch(() => ({}));
  if(!response.ok) {
    throw new Error(data?.message || 'Resend rechazó el envío automático.');
  }
  return data;
}

exports.handler = async () => {
  if(!RESEND_API_KEY || !TASKS_EMAIL_TO || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Faltan variables de entorno para recordatorios automáticos.' })
    };
  }

  try {
    const nowIso = new Date().toISOString();
    const tasksUrl = `${SUPABASE_URL}/rest/v1/tasks?select=id,title,details,priority,due_at&status=eq.pending&auto_email_reminder=eq.true&email_reminder_sent_at=is.null&due_at=lte.${encodeURIComponent(nowIso)}&order=due_at.asc`;
    const taskRes = await fetchWithTimeout(tasksUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const tasks = await taskRes.json().catch(() => []);
    if(!taskRes.ok) {
      throw new Error(tasks?.message || 'No se pudieron leer tareas pendientes.');
    }

    const sentIds = [];
    for(const task of tasks) {
      await sendReminderEmail(task);
      const patchRes = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${task.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ email_reminder_sent_at: new Date().toISOString() })
      });
      if(!patchRes.ok) {
        const patchData = await patchRes.json().catch(() => ({}));
        throw new Error(patchData?.message || `No se pudo marcar la tarea ${task.id} como enviada.`);
      }
      sentIds.push(task.id);
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: true, sent: sentIds.length, ids: sentIds })
    };
  } catch(error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: error.message || 'Falló el recordatorio automático.' })
    };
  }
};
