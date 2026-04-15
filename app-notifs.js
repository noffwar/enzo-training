export const createNotifView = (deps) => {
  const {
    html, useState, useEffect, useRef, useCallback, supabase, DEVICE_ID, pickNewestPayload,
    safeLocalSet, getDayDate, V3, IActivity, IDumb, ITarget, ISync, 
    Card, HealthHistoryRow, safeDispatch,
    metaGet, metaSet, lsNotifSave, lsNotifLoad, lsAllRoutineKeys, lsRoutineLoad, lsRoutineSave, stripRoutineMeta
  } = deps;

  const loadNotifsLocal = () => {
    try {
      const stored = lsNotifLoad(DEVICE_ID);
      return Array.isArray(stored?.notifs) ? stored.notifs : [
        { id:'agua', label:'💧 Tomar agua', time:'09:00', enabled:true },
        { id:'comida', label:'🍽️ Registrar comida', time:'13:00', enabled:true },
        { id:'gym', label:'💪 Hora de entrenar', time:'17:00', enabled:true },
        { id:'meds', label:'💊 Medicación', time:'08:00', enabled:true },
        { id:'sleep', label:'😴 Hora de dormir', time:'23:00', enabled:true }
      ];
    } catch(_) {
      return [];
    }
  };

  
const NotifView = ({session}) => {
      const [notifs,    setNotifs]    = useState(() => loadNotifsLocal());
      const [perm,      setPerm]      = useState(typeof Notification!=='undefined'?Notification.permission:'denied');
      const [syncMsg,   setSyncMsg]   = useState('');
      const [swInfo,    setSwInfo]    = useState({ ready: false, controlling: false, authValid: false, schedCount: 0 });
      const [timers]    = useState({});
      const [backupBusy,setBackupBusy]= useState(false);
      const [backupMsg, setBackupMsg] = useState('');
      const [backupMeta,setBackupMeta]= useState(() => {
        const lastBackupAt = metaGet('last_backup_at');
        const hours = lastBackupAt ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 3600000) : null;
        return {
          lastBackupAt,
          hoursSince: hours,
          due: !lastBackupAt || hours >= 72
        };
      });
      const importInputRef = useRef(null);

      const refreshBackupMeta = useCallback(() => {
        const lastBackupAt = metaGet('last_backup_at');
        const hours = lastBackupAt ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 3600000) : null;
        setBackupMeta({
          lastBackupAt,
          hoursSince: hours,
          due: !lastBackupAt || hours >= 72
        });
      }, []);

      useEffect(() => {
        refreshBackupMeta();
        const onFocus = () => refreshBackupMeta();
        const onVisible = () => { if(document.visibilityState === 'visible') refreshBackupMeta(); };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, [refreshBackupMeta]);

      // Obtener estado del SW al montar
      useEffect(() => {
        if(!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.ready.then(reg => {
          const ctrl = navigator.serviceWorker.controller;
          if(ctrl) {
            const onMsg = (e) => {
              if(e.data?.type === 'SW_DEBUG_RESPONSE') {
                setSwInfo({
                  ready:       true,
                  controlling: true,
                  authValid:   e.data.authValid || false,
                  schedCount:  e.data.scheduledCount || 0,
                });
                navigator.serviceWorker.removeEventListener('message', onMsg);
              }
            };
            navigator.serviceWorker.addEventListener('message', onMsg);
            ctrl.postMessage({ type: 'SW_DEBUG_REQUEST' });
            setTimeout(() => navigator.serviceWorker.removeEventListener('message', onMsg), 3000);
          } else {
            setSwInfo({ ready: true, controlling: false, authValid: false, schedCount: 0 });
          }
        }).catch(() => {});
      }, []);

      const persistAndSync = async (n) => {
        setNotifs(n);
        const nowIso = new Date().toISOString();
        const notifPayload = { notifs: n, _updatedAt: nowIso };
        // 1. localStorage v3 por device_id
        lsNotifSave(DEVICE_ID, notifPayload);
        // 2. Sincronizar con Supabase (best-effort)
        try {
          const { error } = await supabase.rpc('save_notification_settings', {
            p_device_id:     DEVICE_ID,
            p_data:          notifPayload,
            p_base_revision: null
          });
          if(!error) setSyncMsg('✓ Guardado');
          else       setSyncMsg('⚠ Sin sync remoto');
        } catch(e) { setSyncMsg('⚠ Sin red'); }
        setTimeout(() => setSyncMsg(''), 2500);
        scheduleAll(n);
      };

      const requestPerm = async () => {
        if(typeof Notification === 'undefined') return;
        const p = await Notification.requestPermission();
        setPerm(p);
        if(p === 'granted') scheduleAll(notifs);
      };

      const scheduleAll = (list) => {
        if(typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

        // Enviar al Service Worker (persiste aunque se cierre la pestaña)
        if('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            if(reg.active) reg.active.postMessage({ type: 'SW_SET_SCHEDULE', notifs: list });
          }).catch(() => {});
        }

        // Fallback setTimeout (funciona si la pestaña está abierta)
        Object.values(timers).forEach(clearTimeout);
        const now = new Date();
        list.filter(n => n.enabled).forEach(n => {
          const [h, m] = n.time.split(':').map(Number);
          const target = new Date(now); target.setHours(h, m, 0, 0);
          if(target <= now) target.setDate(target.getDate() + 1);
          timers[n.id] = setTimeout(() => {
            if(Notification.permission !== 'granted') return;
            if('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(reg => {
                if(reg?.showNotification) {
                  reg.showNotification('Enzo Training', {
                    body:   n.label,
                    icon:   './icon-192.png',
                    badge:  './icon-192.png',
                    tag:    `fallback-${n.id}-${Date.now()}`,
                    data:   { id: n.id, time: n.time }
                  }).catch(() => {});
                }
              }).catch(() => {});
            }
          }, target - now);
        });
      };

      const sendTestNotif = () => {
        if(Notification.permission !== 'granted') return;
        if('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            if(reg.active) reg.active.postMessage({ type: 'SW_TEST_NOTIFICATION' });
          }).catch(() => {});
        }
      };

      const exportBackup = async () => {
        if(!session?.user?.id) return;
        setBackupBusy(true);
        setBackupMsg('');
        try {
          const [
            { data: tasksRows, error: tasksErr },
            { data: notesRows, error: notesErr },
            { data: recipeRows, error: recipeErr },
            { data: studyRows, error: studyErr },
            { data: bookRows, error: bookErr },
            { data: invRows, error: invErr },
            { data: routineRows, error: routineErr },
            { data: dailyRows, error: dailyErr },
            { data: weeklyRows, error: weeklyErr }
          ] = await Promise.all([
            supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at', { ascending:false }),
            supabase.from('notes').select('*').eq('user_id', session.user.id).order('created_at', { ascending:false }),
            supabase.from('user_recipes').select('*').order('updated_at', { ascending:false }),
            supabase.from('study_plan').select('*').order('subject', { ascending:true }),
            supabase.from('book_notes').select('*').order('created_at', { ascending:false }),
            supabase.from('app_inventory').select('*').order('key', { ascending:true }),
            supabase.from('routines').select('*').order('routine_id', { ascending:true }),
            supabase.from('daily_logs_v2').select('*').order('date', { ascending:false }),
            supabase.from('weekly_configs_v2').select('*').order('week_key', { ascending:false })
          ]);
          const firstError = tasksErr || notesErr || recipeErr || studyErr || bookErr || invErr || routineErr || dailyErr || weeklyErr;
          if(firstError) throw firstError;

          const localRoutines = Object.fromEntries(lsAllRoutineKeys().map(id => [id, lsRoutineLoad(id)]).filter(([,v]) => !!v));
          const backup = {
            app: 'enzo-training',
            exported_at: new Date().toISOString(),
            device_id: DEVICE_ID,
            user_id: session.user.id,
            user_email: session.user.email || '',
            remote: {
              tasks: tasksRows || [],
              notes: notesRows || [],
              user_recipes: recipeRows || [],
              study_plan: studyRows || [],
              book_notes: bookRows || [],
              app_inventory: invRows || [],
              routines: routineRows || [],
              daily_logs_v2: dailyRows || [],
              weekly_configs_v2: weeklyRows || []
            },
            local: {
              notification_settings: lsNotifLoad(DEVICE_ID) || [],
              routines: localRoutines
            }
          };

          const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `enzo-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          metaSet('last_backup_at', new Date().toISOString());
          refreshBackupMeta();
          setBackupMsg('Backup exportado correctamente.');
        } catch(e) {
          setBackupMsg(e.message || 'No se pudo exportar el backup.');
        } finally {
          setBackupBusy(false);
          setTimeout(() => setBackupMsg(''), 3500);
        }
      };

      const importBackup = async (file) => {
        if(!file || !session?.user?.id) return;
        setBackupBusy(true);
        setBackupMsg('');
        try {
          const raw = await file.text();
          const parsed = JSON.parse(raw);
          if(parsed?.app !== 'enzo-training' || !parsed?.remote) throw new Error('El archivo no parece un backup valido de Enzo Training.');
          const ok = window.confirm('Esto va a restaurar datos desde el backup y puede sobrescribir informacion actual. Queres continuar?');
          if(!ok) {
            setBackupBusy(false);
            return;
          }

          const remote = parsed.remote || {};
          const userId = session.user.id;
          const sanitizeRows = (rows) => Array.isArray(rows) ? rows : [];

          const tasksRows = sanitizeRows(remote.tasks).map(row => ({ ...row, user_id: userId }));
          const notesRows = sanitizeRows(remote.notes).map(row => ({ ...row, user_id: userId }));
          const recipeRows = sanitizeRows(remote.user_recipes);
          const studyRows = sanitizeRows(remote.study_plan);
          const bookRows = sanitizeRows(remote.book_notes);
          const inventoryRows = sanitizeRows(remote.app_inventory);
          const routineRows = sanitizeRows(remote.routines);
          const dailyRows = sanitizeRows(remote.daily_logs_v2);
          const weeklyRows = sanitizeRows(remote.weekly_configs_v2);

          const wipeAndInsert = async (table, deleteFilter, rows) => {
            const delQuery = deleteFilter(supabase.from(table).delete());
            const { error: delErr } = await delQuery;
            if(delErr) throw delErr;
            if(rows.length === 0) return;
            const { error: insErr } = await supabase.from(table).insert(rows);
            if(insErr) throw insErr;
          };

          await wipeAndInsert('tasks', q => q.eq('user_id', userId), tasksRows);
          await wipeAndInsert('notes', q => q.eq('user_id', userId), notesRows);
          await wipeAndInsert('book_notes', q => q.neq('id', '00000000-0000-0000-0000-000000000000'), bookRows);
          await wipeAndInsert('user_recipes', q => q.neq('id', '00000000-0000-0000-0000-000000000000'), recipeRows);
          await wipeAndInsert('study_plan', q => q.neq('id', '00000000-0000-0000-0000-000000000000'), studyRows);

          if(inventoryRows.length){
            const { error } = await supabase.from('app_inventory').upsert(inventoryRows, { onConflict:'key' });
            if(error) throw error;
          }
          if(routineRows.length){
            const normalized = routineRows.map(row => ({
              routine_id: row.routine_id,
              data: row.data,
              updated_at: row.updated_at,
              revision: row.revision,
              device_id: row.device_id,
              created_at: row.created_at
            }));
            const { error } = await supabase.from('routines').upsert(normalized, { onConflict:'routine_id' });
            if(error) throw error;
          }
          if(dailyRows.length){
            const normalized = dailyRows.map(row => ({
              date: row.date,
              tracker: row.tracker,
              session: row.session,
              updated_at: row.updated_at,
              revision: row.revision,
              device_id: row.device_id,
              created_at: row.created_at
            }));
            const { error } = await supabase.from('daily_logs_v2').upsert(normalized, { onConflict:'date' });
            if(error) throw error;
          }
          if(weeklyRows.length){
            const normalized = weeklyRows.map(row => ({
              week_key: row.week_key,
              body_weight: row.body_weight,
              day_mapping: row.day_mapping,
              updated_at: row.updated_at,
              revision: row.revision,
              device_id: row.device_id,
              created_at: row.created_at
            }));
            const { error } = await supabase.from('weekly_configs_v2').upsert(normalized, { onConflict:'week_key' });
            if(error) throw error;
          }

          if(parsed?.local?.notification_settings){
            const importedNotifs = Array.isArray(parsed.local.notification_settings) ? parsed.local.notification_settings : (parsed.local.notification_settings.notifs || []);
            if(importedNotifs.length){
              lsNotifSave(DEVICE_ID, { notifs: importedNotifs, _updatedAt: new Date().toISOString() });
              setNotifs(importedNotifs);
              scheduleAll(importedNotifs);
            }
          }
          if(parsed?.local?.routines && typeof parsed.local.routines === 'object'){
            Object.entries(parsed.local.routines).forEach(([id, data]) => {
              if(data) {
                lsRoutineSave(id, {
                  ...stripRoutineMeta(data),
                  _revision: data?._revision || null,
                  _updatedAt: data?._updatedAt || new Date().toISOString()
                });
              }
            });
          }

          metaSet('last_backup_at', new Date().toISOString());
          refreshBackupMeta();
          setBackupMsg('Backup importado correctamente. Recomendado: recargar la app.');
        } catch(e) {
          setBackupMsg(e.message || 'No se pudo importar el backup.');
        } finally {
          setBackupBusy(false);
          if(importInputRef.current) importInputRef.current.value = '';
          setTimeout(() => setBackupMsg(''), 5000);
        }
      };

      const toggle  = (id)   => persistAndSync(notifs.map(n => n.id===id ? { ...n, enabled:!n.enabled } : n));
      const setTime = (id,t) => persistAndSync(notifs.map(n => n.id===id ? { ...n, time:t } : n));

      const swStatusColor = swInfo.controlling ? '#10B981' : '#F59E0B';
      const swStatusLabel = !swInfo.ready ? '—' : swInfo.controlling ? '✓ Activo' : '⚠ No controla';

      return html`
        <div class="fade-up" style="display:flex;flex-direction:column;gap:12px;">
          <${Card}>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6366F1;">🔔 Recordatorios Diarios</p>
              ${syncMsg && html`<span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:${syncMsg.startsWith('✓')?'#10B981':'#F59E0B'};">${syncMsg}</span>`}
            </div>

            <!-- Nota por dispositivo -->
            <div style="padding:8px 10px;border-radius:6px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);margin-bottom:12px;">
              <p style="margin:0;font-size:11px;color:#6366F1;">📱 Estas alertas se configuran <strong>por dispositivo</strong>. Los horarios de este dispositivo no afectan a los demás.</p>
            </div>

            ${perm !== 'granted' && html`
              <div style="padding:10px;border-radius:8px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);margin-bottom:12px;">
                <p style="margin:0 0 8px;font-size:12px;color:#F59E0B;">Permisos de notificación requeridos</p>
                <button onClick=${requestPerm}
                  style="padding:8px 16px;border-radius:8px;border:none;background:#F59E0B;color:#080D1A;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;font-size:13px;">
                  Activar notificaciones
                </button>
              </div>
            `}

            ${perm === 'granted' && html`
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <div class="badge" style="background:rgba(16,185,129,0.1);color:#10B981;">✓ Notificaciones activadas</div>
                <button onClick=${sendTestNotif}
                  style="padding:5px 10px;border-radius:6px;border:1px solid rgba(99,102,241,0.4);background:rgba(99,102,241,0.1);color:#6366F1;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;cursor:pointer;">
                  🔔 Probar ahora
                </button>
              </div>
            `}

            <div style="display:flex;flex-direction:column;gap:8px;">
              ${notifs.map(n => html`
                <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:rgba(10,15,30,0.5);border:1px solid ${n.enabled?'rgba(99,102,241,0.4)':'#1E2D45'};">
                  <input type="checkbox" checked=${n.enabled} onChange=${()=>toggle(n.id)} style="width:18px;height:18px;"/>
                  <span style="flex:1;font-size:14px;color:${n.enabled?'#e2e8f0':'#64748b'};">${n.label}</span>
                  <input type="time" value=${n.time} onInput=${e=>setTime(n.id,e.target.value)}
                    style="background:#0F1729;border:1px solid #1E2D45;border-radius:6px;padding:4px 8px;font-size:13px;color:${n.enabled?'white':'#64748b'};font-family:'JetBrains Mono',monospace;"/>
                </div>
              `)}
            </div>
          <//>

          <!-- Estado del SW y notificaciones -->
          <${Card}>
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#475569;">Estado de notificaciones</p>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:11px;font-family:'JetBrains Mono',monospace;">
              ${[
                ['Permiso',    perm === 'granted' ? '✓ granted' : perm],
                ['SW',         swStatusLabel],
                ['Auth en SW', swInfo.authValid ? '✓ Sí (mark_done funciona offline)' : '✗ No (necesita app abierta)'],
                ['Programadas', swInfo.schedCount + ' alertas activas'],
                ['⚠ Sin Web Push', 'Las notificaciones requieren pestaña/app abierta o SW activo. No se garantiza entrega si el navegador suspende el SW.'],
              ].map(([k,v]) => html`
                <div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(30,45,69,0.5);">
                  <span style="color:#64748b;flex-shrink:0;">${k}</span>
                  <span style="color:${k==='SW'?swStatusColor:k==='⚠ Sin Web Push'?'#F59E0B':'#94a3b8'};text-align:right;">${v}</span>
                </div>
              `)}
            </div>
          <//>

          <${Card}>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
              <div>
                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10B981;">Backup manual</p>
                <p style="margin:4px 0 0;font-size:12px;color:#94A3B8;">Descarga un JSON con tus datos remotos y la configuracion local del dispositivo.</p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                <button onClick=${()=>importInputRef.current?.click()}
                  style="padding:8px 12px;border-radius:8px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                  ${backupBusy ? 'IMPORTANDO...' : 'IMPORTAR BACKUP'}
                </button>
                <button onClick=${exportBackup}
                  style="padding:8px 12px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#34D399;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                  ${backupBusy ? 'EXPORTANDO...' : 'EXPORTAR BACKUP'}
                </button>
              </div>
            </div>
            <div style=${{
              marginBottom:'10px',
              padding:'10px 12px',
              borderRadius:'10px',
              background: backupMeta.due ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
              border: backupMeta.due ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(16,185,129,0.25)'
            }}>
              <p style=${{
                margin:'0 0 4px',
                fontSize:'11px',
                fontWeight:'700',
                textTransform:'uppercase',
                letterSpacing:'0.08em',
                color: backupMeta.due ? '#FCD34D' : '#86EFAC'
              }}>
                ${backupMeta.due ? 'Backup recomendado' : 'Backup al dia'}
              </p>
              <p style="margin:0;font-size:12px;color:#CBD5E1;">
                ${!backupMeta.lastBackupAt
                  ? 'Todavia no hiciste un backup manual desde la app.'
                  : `Ultimo backup: ${new Date(backupMeta.lastBackupAt).toLocaleString('es-AR')} (${backupMeta.hoursSince}h)` }
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">
                ${backupMeta.due
                  ? 'Si pasaron 72 horas o mas, conviene exportar uno nuevo.'
                  : 'Todavia estas dentro de la ventana recomendada de 72 horas.'}
              </p>
            </div>
            <input
              ref=${importInputRef}
              type="file"
              accept="application/json,.json"
              style="display:none;"
              onChange=${e=>importBackup(e.target.files?.[0])}
            />
            ${backupMsg && html`<div style="padding:8px 10px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);color:#86EFAC;font-size:12px;">${backupMsg}</div>`}
          <//>
        </div>
      `;
    };

  return NotifView;
};
