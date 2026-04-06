// ═══════════════════════════════════════════════════════════
//  SERVICE WORKER — Enzo Training v3.2
//
//  CAMBIOS vs v3.1:
//  ✅ Eliminado Authorization Bearer con publishable key (era inseguro)
//  ✅ Auth context recibido desde la app (SW_SET_AUTH_CONTEXT)
//  ✅ mark_done usa token real del usuario (no publishable key)
//  ✅ Fallback: si no hay auth fresca, abre app con ?pending_med=
//  ✅ El SW ya NO procesa el outbox (lo maneja la app)
//  ✅ Nuevos canales: SW_SET_SCHEDULE, SW_SET_AUTH_CONTEXT,
//     SW_CLEAR_AUTH_CONTEXT, SW_TEST_NOTIFICATION, SW_DEBUG_REQUEST
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'enzo-training-v3.3';
const DATA_CACHE = 'enzo-data-v2';
const SUPA_URL   = 'https://qflajqvveuyoclmtrjtg.supabase.co';
const FETCH_TIMEOUT_MS = 6000;
// SUPA_ANON: solo para apikey header (identificación del proyecto)
// NUNCA se usa como Authorization Bearer para writes de usuario autenticado
const SUPA_ANON  = 'sb_publishable_lwzGrcNCL3QuDHiDafwuAQ_jJd82jAa';

const STATIC_ASSETS = ['./', './index.html', './manifest.json'];

// ═══ AUTH CONTEXT (recibido desde la app via postMessage) ═══
let _authCtx = null;

const authIsValid = () => {
  if(!_authCtx?.access_token) return false;
  if(!_authCtx?.expiry) return true;
  return (Date.now() / 1000) < (_authCtx.expiry - 60); // 60s de margen
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const getLocalDateKey = (now = new Date()) => {
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  return local.toISOString().split('T')[0];
};

const getDinnerLogicalDateKey = (now = new Date()) => {
  const base = new Date(now);
  if(base.getHours() < 6) base.setDate(base.getDate() - 1);
  return getLocalDateKey(base);
};

// ═══ INSTALL ═══
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ═══ ACTIVATE ═══
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== DATA_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => loadPersistedNotifs())
  );
});

// ═══ FETCH ═══
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if(event.request.method !== 'GET') return;
  if(url.hostname.includes('supabase.co')) return;
  if(url.hostname.includes('googleapis.com')) return;

  if(event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request).then(resp => {
        const toCache = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, toCache));
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(resp => {
        if(resp.ok && (url.hostname.includes('fonts') || url.hostname.includes('unpkg') ||
                       url.hostname.includes('cdn') || url.hostname.includes('jsdelivr'))) {
          const toCache = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, toCache));
        }
        return resp;
      }).catch(() => {});
    })
  );
});

// ═══ PERSISTENCIA DE NOTIFICACIONES ═══
let scheduledNotifs = [];

const loadPersistedNotifs = async () => {
  try {
    const cache = await caches.open(DATA_CACHE);
    const res   = await cache.match('notifs-config');
    if(res) {
      const loaded = await res.json();
      if(Array.isArray(loaded) && loaded.length > 0) scheduledNotifs = loaded;
    }
  } catch(e) {}
};

const persistNotifs = async (list) => {
  try {
    const cache = await caches.open(DATA_CACHE);
    await cache.put('notifs-config',
      new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } })
    );
  } catch(e) {}
};

// ═══ CHECK PERIÓDICO DE ALARMAS ═══
let _lastFired  = '';
let _medsFired  = {};
let _lastScheduleTs = 0;

const runCheck = () => {
  const now  = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const date = now.getDate();

  if(_medsFired._date !== date) _medsFired = { _date: date };

  scheduledNotifs.filter(n => n.enabled && n.time === hhmm).forEach(n => {
    const key = `${n.id}_${hhmm}_${date}`;
    if(_lastFired === key) return;
    _lastFired = key;
    _medsFired[n.id] = true;

    self.registration.showNotification('Enzo Training', {
      body:    n.label,
      icon:    './icon-192.png',
      badge:   './icon-192.png',
      vibrate: [200, 100, 200],
      tag:     n.id,
      requireInteraction: true,
      actions: [
        { action: 'mark_done', title: '✅ Tomado' },
        { action: 'dismiss',   title: 'Cerrar'   }
      ],
      data: { id: n.id, time: hhmm }
    });
  });

  // Recordatorio urgente Roacuttan 16:00 si el de 14:00 fue ignorado
  if(hhmm === '16:00' && _medsFired['meds'] && !_medsFired['meds_done']) {
    const urgentKey = `meds_urgent_${date}`;
    if(_lastFired !== urgentKey) {
      _lastFired = urgentKey;
      self.registration.showNotification('⚠️ Enzo — Roacuttan pendiente', {
        body:    '💊 Todavía no marcaste el Roacuttan. Tomalo con agua abundante.',
        icon:    './icon-192.png',
        badge:   './icon-192.png',
        vibrate: [300, 100, 300, 100, 300],
        tag:     'meds_urgent',
        requireInteraction: true,
        actions: [
          { action: 'mark_done', title: '✅ Ya lo tomé' },
          { action: 'dismiss',   title: 'Cerrar' }
        ],
        data: { id: 'meds', time: '16:00' }
      });
    }
  }
};

setInterval(runCheck, 30000);

// ═══ MENSAJES DESDE LA APP ═══
self.addEventListener('message', event => {
  const msg = event.data;
  if(!msg?.type) return;

  switch(msg.type) {

    case 'SCHEDULE_NOTIFS':
    case 'SW_SET_SCHEDULE':
      scheduledNotifs = msg.notifs || [];
      _lastScheduleTs = Date.now();
      persistNotifs(scheduledNotifs);
      break;

    case 'SW_SET_AUTH_CONTEXT':
      _authCtx = {
        access_token: msg.access_token,
        user_id:      msg.user_id,
        device_id:    msg.device_id,
        expiry:       msg.expiry
      };
      console.log('[SW] Auth context set. Valid:', authIsValid(), '| User:', _authCtx.user_id);
      break;

    case 'SW_CLEAR_AUTH_CONTEXT':
      _authCtx = null;
      console.log('[SW] Auth context cleared');
      break;

    case 'SW_TEST_NOTIFICATION':
      self.registration.showNotification('Enzo Training — Test', {
        body:    '🔔 Notificación de prueba funcionando correctamente',
        icon:    './icon-192.png',
        badge:   './icon-192.png',
        vibrate: [200, 100, 200],
        tag:     'test-' + Date.now(),
        requireInteraction: false,
        actions: [
          { action: 'mark_done', title: '✅ Tomado' },
          { action: 'dismiss',   title: 'Cerrar'   }
        ],
        data: { id: 'test', time: 'test' }
      });
      break;

    case 'SW_DEBUG_REQUEST':
      if(event.source) {
        event.source.postMessage({
          type:           'SW_DEBUG_RESPONSE',
          authValid:      authIsValid(),
          authExpiry:     _authCtx?.expiry || null,
          authUser:       _authCtx?.user_id || null,
          scheduledCount: scheduledNotifs.length,
          lastScheduleTs: _lastScheduleTs,
          cacheVersion:   CACHE_NAME,
        });
      }
      break;
  }

  // Recargar notifs desde cache si el SW se reinició y no recibió lista recientemente
  if(scheduledNotifs.length === 0 && Date.now() - _lastScheduleTs > 5000) {
    loadPersistedNotifs();
  }
});

// ═══ CLICK EN NOTIFICACIÓN ═══
self.addEventListener('notificationclick', event => {
  const { action, notification } = event;
  const notifData = notification.data || {};
  notification.close();

  if(action === 'mark_done') {
    if(notifData.id === 'meds' || notifData.id === 'meds_urgent') {
      _medsFired['meds_done'] = true;
    }
    if(notifData.id === 'meds2') {
      _medsFired['meds2_done'] = true;
    }

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
        const now = new Date();
        const effectiveDate = notifData.id === 'meds2'
          ? getDinnerLogicalDateKey(now)
          : getLocalDateKey(now);

        if(clients.length > 0) {
          // App abierta: la app ejecuta patch_med_status con su sesión activa
          clients.forEach(c => c.postMessage({ type: 'MEDS_DONE', id: notifData.id, logicalDate: effectiveDate }));
          clients[0].focus();
          return;
        }

        // App cerrada + auth fresca: SW ejecuta patch_med_status directamente
        if(authIsValid()) {
          const ok = await markMedWithUserToken(notifData.id, effectiveDate);
          if(ok) return;
          // Si falló (ej: sin red), caer al fallback de abrir app
        }

        // Sin app + sin auth válida: abrir app con acción pendiente en URL
        // La app leerá ?pending_med= y completará la persistencia al arrancar
        const url = './?pending_med=' + encodeURIComponent(notifData.id) +
                    '&pending_date=' + encodeURIComponent(effectiveDate);
        self.clients.openWindow(url);
      })
    );
    return;
  }

  if(action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if(list.length > 0) return list[0].focus();
      return self.clients.openWindow('./');
    })
  );
});

// ═══ MARK MED CON TOKEN REAL DEL USUARIO ═══
// Usa el access_token JWT real recibido via SW_SET_AUTH_CONTEXT
// NUNCA usa la publishable key como Bearer token
const markMedWithUserToken = async (notifId, dateStr) => {
  if(!_authCtx?.access_token) return false;
  const medKeys = notifId === 'meds2'
    ? ['finasteride', 'minoxidil']
    : (notifId === 'meds' || notifId === 'meds_urgent')
      ? ['roacuttan']
      : [];
  if(medKeys.length === 0) return false;

  try {
    for(const medKey of medKeys) {
      const res = await fetchWithTimeout(`${SUPA_URL}/rest/v1/rpc/patch_med_status`, {
        method:  'POST',
        headers: {
          'apikey':        SUPA_ANON,
          'Authorization': `Bearer ${_authCtx.access_token}`, // JWT real del usuario
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({
          p_date:      dateStr,
          p_med:       medKey,
          p_val:       true,
          p_device_id: _authCtx.device_id || 'sw'
        })
      });

      if(!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn('[SW] patch_med_status error', res.status, errText.slice(0, 100));
        return false;
      }
    }
    console.log('[SW] Med marcado ok:', medKeys.join(','), dateStr);
    return true;
  } catch(e) {
    console.warn('[SW] markMedWithUserToken network error:', e.message);
    return false;
  }
};

// ═══ BACKGROUND SYNC ═══
// El SW ya NO es el escritor principal del outbox.
// Solo avisa a la app que hay red disponible para que ella haga el flush.
self.addEventListener('sync', event => {
  if(event.tag === 'sync-updates') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'FLUSH_OUTBOX' }));
        return Promise.resolve();
      })
    );
  }
});
