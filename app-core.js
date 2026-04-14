export const V3 = {
  WEEK:  'enzo_v3_week:',
  DAY:   'enzo_v3_day:',
  ROUT:  'enzo_v3_routine:',
  NOTIF: 'enzo_v3_notif:',
  META:  'enzo_v3_meta:',
  OLD:   'enzo_v2_',
};

import { isDateKey, isWeekKey, isValidDateValue, isBeforeStart, getWeekKey, addWeeks, stripRoutineMeta } from './app-utils.js';

export const metaGet = (k) => {
  try {
    return JSON.parse(localStorage.getItem(V3.META + k));
  } catch (e) {
    return null;
  }
};

export const metaSet = (k, v) => {
  try {
    localStorage.setItem(V3.META + k, JSON.stringify(v));
    return true;
  } catch (e) {
    return false;
  }
};

export const getDeviceId = () => {
  let id = metaGet('device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 8) + '_' + Date.now().toString(36);
    metaSet('device_id', id);
  }
  return id;
};

export const DEVICE_ID = getDeviceId();

export const safeLocalSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
};

export const readStoredJson = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (_) {
    return fallback;
  }
};

export const safeDispatch = (eventName, detail) => {
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    return true;
  } catch (_) {
    return false;
  }
};

export const localDateKey = (date = new Date()) => {
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export const getDinnerLogicalDateKey = (now = new Date()) => {
  const base = new Date(now);
  if (base.getHours() < 6) base.setDate(base.getDate() - 1);
  return localDateKey(base);
};

export const pickNewestPayload = (local, remote, remoteUpdatedAt = '', fallback = null) => {
  const localTs = new Date(local?._updatedAt || 0).getTime() || 0;
  const remoteTs = new Date(remote?._updatedAt || remoteUpdatedAt || 0).getTime() || 0;
  if (!local && !remote) return fallback;
  return localTs >= remoteTs ? (local || remote || fallback) : (remote || local || fallback);
};

export const getDinnerLogicalTargetState = ({ todayMedsState = {}, previousMedsState = {}, now = new Date() } = {}) => {
  const logicalDateKey = getDinnerLogicalDateKey(now);
  const calendarTodayKey = localDateKey(now);
  const usesPreviousDay = logicalDateKey !== calendarTodayKey;
  return {
    dateKey: logicalDateKey,
    medsState: usesPreviousDay ? (previousMedsState || {}) : (todayMedsState || {}),
    label: usesPreviousDay ? 'ayer' : 'hoy',
    usesPreviousDay,
    calendarTodayKey
  };
};

export const getMedicationStatusForView = ({ selectedDateKey = '', medsState = {}, now = new Date() } = {}) => {
  const calendarTodayKey = localDateKey(now);
  const dinnerLogicalKey = getDinnerLogicalDateKey(now);
  const viewDateKey = String(selectedDateKey || calendarTodayKey);
  const roaccutanDone = !!medsState.roacuttan;
  const dinnerDone = !!medsState.finasteride && !!medsState.minoxidil;
  const dinnerRelevant = viewDateKey === dinnerLogicalKey;
  return {
    calendarTodayKey,
    dinnerLogicalKey,
    viewDateKey,
    roaccutanDone,
    dinnerDone,
    dinnerRelevant,
    roaccutanLabel: roaccutanDone
      ? (viewDateKey === calendarTodayKey ? 'Hecha hoy' : 'Hecha')
      : 'Pendiente',
    dinnerLabel: dinnerDone
      ? (dinnerRelevant
        ? (calendarTodayKey === dinnerLogicalKey ? 'Hecha hoy' : 'Hecha para ayer')
        : 'No corresponde')
      : (dinnerRelevant
        ? (calendarTodayKey === dinnerLogicalKey ? 'Pendiente' : 'Pendiente de ayer')
        : 'No corresponde')
  };
};

export const CLIENT_FETCH_TIMEOUT_MS = 8000;

export const parseJsonResponseSafe = async (res) => {
  try {
    const data = await res.json();
    return (data && typeof data === 'object') ? data : {};
  } catch (_) {
    return {};
  }
};

export const fetchJsonWithTimeout = async (url, options = {}, timeoutMs = CLIENT_FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const data = await parseJsonResponseSafe(res);
    return { res, data };
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('La solicitud tardó demasiado. Probá de nuevo.');
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

// ─── localStorage helpers ───────────────────────────────
export const lsWeekSave = (wk, v) => safeLocalSet(V3.WEEK + wk, v);
export const lsWeekLoad = (wk) => readStoredJson(V3.WEEK + wk);
export const lsAllWeekKeys = () => Object.keys(localStorage)
  .filter(k => k.startsWith(V3.WEEK))
  .map(k => k.slice(V3.WEEK.length))
  .sort().reverse();

export const lsDaySave = (d, v) => safeLocalSet(V3.DAY + d, v);
export const lsDayLoad = (d) => readStoredJson(V3.DAY + d);
export const lsAllDayKeys = () => Object.keys(localStorage)
  .filter(k => k.startsWith(V3.DAY))
  .map(k => k.slice(V3.DAY.length))
  .sort().reverse();

export const lsRoutineSave = (id, v) => safeLocalSet(V3.ROUT + id, v);
export const lsRoutineLoad = (id) => readStoredJson(V3.ROUT + id);
export const lsAllRoutineKeys = () => Object.keys(localStorage)
  .filter(k => k.startsWith(V3.ROUT))
  .map(k => k.slice(V3.ROUT.length));

export const lsNotifSave = (did, v) => safeLocalSet(V3.NOTIF + did, v);
export const lsNotifLoad = (did) => readStoredJson(V3.NOTIF + did);

export const lsSave = (k, v) => isDateKey(k) ? lsDaySave(k, v) : lsWeekSave(k, v);
export const lsLoad = (k)    => isDateKey(k) ? lsDayLoad(k)    : lsWeekLoad(k);
export const lsAllKeys = () => [...lsAllWeekKeys(), ...lsAllDayKeys()];

// ─── MIGRACIÓN desde enzo_v2_ ────────────────────────────────
export const migrateLegacyLocalStorage = (isDateKey, getDayDate) => {
  if(metaGet('migration_v3_done')) return;
  const oldKeys = Object.keys(localStorage).filter(k=>k.startsWith(V3.OLD));
  if(oldKeys.length === 0) { metaSet('migration_v3_done', true); return; }

  oldKeys.forEach(fullKey => {
    const key = fullKey.slice(V3.OLD.length);
    try {
      const raw = localStorage.getItem(fullKey);
      if(!raw) return;
      const val = JSON.parse(raw);
      if(!val) return;

      const hasWeekStruct = !!(val.dayMapping || val.sessions);
      const hasDayStruct  = !!(val.meds || val.meals || val.fasted !== undefined);
      const hasTracker    = !!(val.tracker);
      const isDateFmt     = isDateKey(key);

      if(hasTracker) {
        const wkKey = key;
        if(!lsWeekLoad(wkKey)) lsWeekSave(wkKey, { dayMapping: val.dayMapping||{}, bodyWeight: val.bodyWeight||'' });
        Object.entries(val.tracker||{}).forEach(([idx, dayData]) => {
          const date = getDayDate(wkKey, parseInt(idx));
          if(!lsDayLoad(date)) lsDaySave(date, { ...dayData, _session: (val.sessions||{})[idx]||null });
        });
      } else if(hasWeekStruct && !hasDayStruct) {
        if(!lsWeekLoad(key)) lsWeekSave(key, val);
      } else if(hasDayStruct && !hasWeekStruct) {
        if(!lsDayLoad(key)) lsDaySave(key, val);
      } else if(isDateFmt) {
        const dow = new Date(key+'T12:00:00').getDay();
        if(dow === 1 && hasWeekStruct) {
          if(!lsWeekLoad(key)) lsWeekSave(key, val);
          if(!lsDayLoad(key))  lsDaySave(key, val);
        } else {
          if(!lsDayLoad(key)) lsDaySave(key, val);
        }
      }
    } catch(e) { console.warn('[Migration] error en', fullKey, e.message); }
  });

  metaSet('migration_v3_done', true);
};

// ─── OUTBOX con dedupe por entity_type+entity_id ─────────────
export const openOutboxDB = () => window.idb?.openDB('enzo-sync-db-v3', 1, {
  upgrade(db) {
    if(!db.objectStoreNames.contains('outbox')) {
      db.createObjectStore('outbox', { keyPath: 'entity_key' });
    }
  }
});

export const enqueueOutboxOp = async ({ entity_type, entity_id, payload, base_revision }) => {
  try {
    const db = await openOutboxDB();
    if (!db) return;
    await db.put('outbox', {
      entity_key: `${entity_type}:${entity_id}`,
      entity_type, entity_id, payload, base_revision,
      queued_at: Date.now(), retries: 0, device_id: DEVICE_ID
    });
  } catch(e) { console.warn('[Outbox] enqueue error:', e.message); }
};

export const flushOutbox = async (supabase, stripRoutineMeta) => {
  if(!navigator.onLine || !window.idb) return;
  try {
    const db    = await openOutboxDB();
    if (!db) return;
    const items = await db.getAll('outbox');
    if(!items || items.length === 0) return;

    for(const item of items) {
      try {
        let rpcName, rpcArgs;
        if(item.entity_type === 'daily_log') {
          rpcName = 'save_daily_log';
          rpcArgs = { p_date: item.entity_id, p_tracker: item.payload.tracker, p_session: item.payload.session||null, p_base_revision: item.base_revision||null, p_device_id: DEVICE_ID };
        } else if(item.entity_type === 'weekly_config') {
          rpcName = 'save_weekly_config';
          rpcArgs = { p_week_key: item.entity_id, p_body_weight: item.payload.body_weight||null, p_day_mapping: item.payload.day_mapping||{}, p_base_revision: item.base_revision||null, p_device_id: DEVICE_ID };
        } else if(item.entity_type === 'routine') {
          rpcName = 'save_routine';
          rpcArgs = { p_routine_id: item.entity_id, p_data: item.payload, p_base_revision: item.base_revision||null, p_device_id: DEVICE_ID };
        } else continue;

        const { data, error } = await supabase.rpc(rpcName, rpcArgs);
        if(error) throw new Error(error.message);

        if(data?.status === 'conflict') {
          metaSet('last_conflict', { entity_key: item.entity_key, server: data.server, at: new Date().toISOString() });
          await db.delete('outbox', item.entity_key);
        } else {
          if(item.entity_type === 'daily_log') {
            const local = lsDayLoad(item.entity_id) || {};
            lsDaySave(item.entity_id, {
              ...local,
              _revision: data?.revision || local._revision || item.base_revision || null,
              _updatedAt: data?.updated_at || new Date().toISOString(),
              _dirty: false
            });
          } else if(item.entity_type === 'weekly_config') {
            const local = lsWeekLoad(item.entity_id) || {};
            lsWeekSave(item.entity_id, {
              ...local,
              _revision: data?.revision || local._revision || item.base_revision || null,
              _updatedAt: data?.updated_at || new Date().toISOString()
            });
          } else if(item.entity_type === 'routine') {
            const local = lsRoutineLoad(item.entity_id) || {};
            lsRoutineSave(item.entity_id, {
              ...stripRoutineMeta(local),
              _revision: data?.revision || local._revision || item.base_revision || null,
              _updatedAt: data?.updated_at || new Date().toISOString()
            });
          }
          await db.delete('outbox', item.entity_key);
        }
      } catch(e) {
        if(!navigator.onLine) break;
        item.retries = (item.retries||0) + 1;
        if(item.retries >= 5) await db.delete('outbox', item.entity_key);
        else await db.put('outbox', item);
      }
    }
    metaSet('last_sync', new Date().toISOString());
  } catch(e) {
    metaSet('last_error', e.message?.slice(0,100));
    console.warn('[Outbox] flush error:', e.message);
  }
};

const bodyWeightToNumeric = (bw) => {
  if(!bw && bw !== 0) return null;
  const n = parseFloat(String(bw).replace(',', '.'));
  return isNaN(n) ? null : n;
};

export const saveDayRemote = async (supabase, date, tracker, session, baseRevision) => {
  const email = session?.user?.email || '';
  if (email === 'guest@enzo.training' || email.includes('guest@enzo.dev')) return { ok: true, queued: false };
  const nowIso = new Date().toISOString();
  const existing = lsDayLoad(date) || {};
  lsDaySave(date, {
    ...existing,
    ...tracker,
    _session: session||null,
    _revision: tracker?._revision || baseRevision || existing._revision || null,
    _updatedAt: nowIso,
    _dirty: true
  });
  try {
    // Guest check already done above
    const { data, error } = await supabase.rpc('save_daily_log', {
      p_date: date, p_tracker: tracker, p_session: session||null,
      p_base_revision: baseRevision||null, p_device_id: DEVICE_ID
    });
    if(error) throw new Error(error.message);
    if(data?.status === 'conflict') {
      metaSet('last_conflict', { type:'daily_log', entity:date, server:data.server, at:new Date().toISOString() });
      return { ok: false, queued: false, conflict: true, serverData: data.server };
    }
    const local = lsDayLoad(date) || {};
    lsDaySave(date, {
      ...local,
      _revision: data?.revision || local._revision || baseRevision || null,
      _updatedAt: data?.updated_at || new Date().toISOString(),
      _dirty: false
    });
    metaSet('last_sync', new Date().toISOString());
    return { ok: true, queued: false };
  } catch(e) {
    const isNet = !navigator.onLine || e.name==='TypeError' || e.message?.includes('fetch');
    if(isNet) {
      await enqueueOutboxOp({ entity_type:'daily_log', entity_id:date, payload:{tracker,session:session||null}, base_revision:baseRevision });
      return { ok: true, queued: true };
    }
    metaSet('last_error', e.message?.slice(0,100));
    return { ok: false, queued: false, error: e.message };
  }
};

export const saveWeeklyRemote = async (supabase, weekKey, bodyWeight, dayMapping, baseRevision, session) => {
  const email = session?.user?.email || '';
  if (email === 'guest@enzo.training' || email.includes('guest@enzo.dev')) return { ok: true, queued: false };
  const nowIso = new Date().toISOString();
  const existing = lsWeekLoad(weekKey) || {};
  lsWeekSave(weekKey, {
    ...existing,
    bodyWeight: bodyWeight||'',
    dayMapping: dayMapping||{},
    _revision: baseRevision || existing._revision || null,
    _updatedAt: nowIso
  });
  try {
    const bwNumeric = bodyWeightToNumeric(bodyWeight);
    const { data, error } = await supabase.rpc('save_weekly_config', {
      p_week_key: weekKey, p_body_weight: bwNumeric,
      p_day_mapping: dayMapping||{}, p_base_revision: baseRevision||null, p_device_id: DEVICE_ID
    });
    if(error) throw new Error(error.message);
    if(data?.status === 'conflict') {
      metaSet('last_conflict', { type:'weekly_config', entity:weekKey, server:data.server, at:new Date().toISOString() });
      return { ok: false, queued: false, conflict: true, serverData: data.server };
    }
    const local = lsWeekLoad(weekKey) || {};
    lsWeekSave(weekKey, {
      ...local,
      _revision: data?.revision || local._revision || baseRevision || null,
      _updatedAt: data?.updated_at || new Date().toISOString()
    });
    metaSet('last_sync', new Date().toISOString());
    return { ok: true, queued: false };
  } catch(e) {
    const isNet = !navigator.onLine || e.name==='TypeError' || e.message?.includes('fetch');
    if(isNet) {
      await enqueueOutboxOp({ entity_type:'weekly_config', entity_id:weekKey, payload:{body_weight:bodyWeightToNumeric(bodyWeight),day_mapping:dayMapping||{}}, base_revision:baseRevision });
      return { ok: true, queued: true };
    }
    metaSet('last_error', e.message?.slice(0,100));
    return { ok: false, queued: false, error: e.message };
  }
};

export const saveRoutineRemote = async (supabase, stripRoutineMeta, routineId, routineData, baseRevision, session) => {
  const email = session?.user?.email || '';
  if (email === 'guest@enzo.training' || email.includes('guest@enzo.dev')) return { ok: true, queued: false };
  const nowIso = new Date().toISOString();
  const existing = lsRoutineLoad(routineId) || {};
  const cleanRoutine = stripRoutineMeta(routineData);
  lsRoutineSave(routineId, {
    ...cleanRoutine,
    _revision: baseRevision || existing._revision || routineData?._revision || null,
    _updatedAt: nowIso
  });
  try {
    const { data, error } = await supabase.rpc('save_routine', {
      p_routine_id: routineId, p_data: cleanRoutine, p_base_revision: baseRevision||null, p_device_id: DEVICE_ID
    });
    if(error) throw new Error(error.message);
    if(data?.status === 'conflict') return { ok: false, queued: false, conflict: true };
    const local = lsRoutineLoad(routineId) || {};
    lsRoutineSave(routineId, {
      ...stripRoutineMeta(local),
      _revision: data?.revision || local._revision || baseRevision || null,
      _updatedAt: data?.updated_at || new Date().toISOString()
    });
    metaSet('last_sync', new Date().toISOString());
    return { ok: true, queued: false };
  } catch(e) {
    const isNet = !navigator.onLine || e.name==='TypeError' || e.message?.includes('fetch');
    if(isNet) {
      await enqueueOutboxOp({ entity_type:'routine', entity_id:routineId, payload:cleanRoutine, base_revision:baseRevision });
      return { ok: true, queued: true };
    }
    return { ok: false, queued: false, error: e.message };
  }
};

// ─── BOOTSTRAP vía RPC get_bootstrap_state ───────────────────
export const bootstrapRemoteState = async (supabase, getWeekKey, addWeeks) => {
  const eightWeeksAgo = addWeeks(getWeekKey(new Date()), -8);
  const { data, error } = await supabase.rpc('get_bootstrap_state', { p_from: eightWeeksAgo });
  if(error || !data) throw new Error(error?.message || 'Bootstrap vacío');
  return data;
};

// ─── CARGA LOCAL ─────────────────────────────────────────────
export const loadLocalCaches = () => {
  const weeklyCache = {}, dailyCache = {}, routinesCache = {};
  lsAllWeekKeys().filter(k=>isDateKey(k) && isWeekKey(k) && !isBeforeStart(k)).forEach(wk => {
    const d=lsWeekLoad(wk); if(d) weeklyCache[wk]=d;
  });
  lsAllDayKeys().filter(k=>isDateKey(k) && !isBeforeStart(k)).forEach(dt => {
    const d=lsDayLoad(dt); if(d) dailyCache[dt]=d;
  });
  lsAllRoutineKeys().forEach(id => {
    const d=lsRoutineLoad(id); if(d) routinesCache[id]=d;
  });
  return { weeklyCache, dailyCache, routinesCache };
};

// ─── buildAllWeeks: merges caches for UI (allWeeks compat) ───
export const buildAllWeeks = (weeklyCache, dailyCache, hydrate) => {
  const result = {};
  Object.entries(weeklyCache).forEach(([wkKey, wkData]) => {
    if(!isDateKey(wkKey) || !isWeekKey(wkKey) || isBeforeStart(wkKey)) return;
    result[wkKey] = hydrate({ dayMapping: wkData.dayMapping||{}, bodyWeight: wkData.bodyWeight||'' });
  });
  Object.entries(dailyCache).forEach(([date, dayData]) => {
    if(!isDateKey(date) || isBeforeStart(date)) return;
    const dateObj = new Date(date+'T12:00:00');
    if(!isValidDateValue(dateObj)) return;
    const wkKey   = getWeekKey(dateObj);
    if(!wkKey) return;
    
    if(!result[wkKey]) result[wkKey] = hydrate({});
    const dow = dateObj.getDay();
    result[wkKey].tracker[dow] = { ...dayData, _dirty: !!dayData._dirty };
    result[wkKey].sessions[dow] = dayData._session || [];
  });
  return result;
};

export const newDay = () => ({
  fasted:false, fastHours:'', fastStartTime:'', walked:false, steps:'', walkStartTime:'', walkEndTime:'',
  gymStartTime:'', gymEndTime:'', mateOrCoffee:false, mateOrCoffeeTime:'',
  sleepHours:'', sleepQuality:'', wakeups:'', napped:false, napHours:'',
  water: 0, gymNotes: '',
  meds:{roacuttan:false, finasteride:false, minoxidil:false, creatine:false, magnesium:false},
  meals:[
    { items:[], firstBite:'', lastBite:'', aiDraft:'' },
    { items:[], firstBite:'', lastBite:'', aiDraft:'' },
    { items:[], firstBite:'', lastBite:'', aiDraft:'' }
  ]
});

export const newWeek = (weekKey='', buildPlanDayMapping) => ({
  dayMapping: buildPlanDayMapping ? buildPlanDayMapping('4', weekKey) : {},
  sessions:{},
  bodyWeight: '',
  tracker:{0:newDay(),1:newDay(),2:newDay(),3:newDay(),4:newDay(),5:newDay(),6:newDay()}
});

export const hydrate = (data = {}, weekKey = '') => {
  const base = newWeek(weekKey);
  const result = {
    dayMapping:  { ...base.dayMapping, ...(data?.dayMapping || {}), _planMode: String(data?.dayMapping?._planMode || base.dayMapping._planMode || '4') },
    sessions:    { ...(data?.sessions  || {}) },
    bodyWeight:  data?.bodyWeight || '',
    tracker:     { ...base.tracker }
  };
  if(data?.tracker) {
    Object.entries(data.tracker).forEach(([k, d]) => {
      const dayBase = newDay();
      result.tracker[k] = {
        ...dayBase, ...d,
        meds:  { ...dayBase.meds,  ...(d?.meds  || {}) },
        meals: Array.isArray(d?.meals) ? d.meals.map(m => ({ ...dayBase.meals[0], ...m })) : dayBase.meals
      };
    });
  }
  result._updatedAt = data?._updatedAt || null;
  result._revision = data?._revision || null;
  return result;
};

export const applyBootstrapToState = (bootstrapData, prevWeeklyCache, prevDailyCache) => {
  const weeklyCache = { ...prevWeeklyCache };
  const dailyCache  = { ...prevDailyCache };
  const routinesCache = {};
  const conflicts = [];

  (bootstrapData.routines||[]).forEach(row => {
    const localRoutine = lsRoutineLoad(row.routine_id);
    const localTs = localRoutine?._updatedAt;
    if(localTs && row.updated_at && localTs > row.updated_at) {
      routinesCache[row.routine_id] = localRoutine;
      return;
    }
    const routinePayload = {
      ...stripRoutineMeta(row.data || {}),
      _revision: row.revision || null,
      _updatedAt: row.updated_at || ''
    };
    lsRoutineSave(row.routine_id, routinePayload);
    routinesCache[row.routine_id] = routinePayload;
  });

  (bootstrapData.weekly_configs||[]).forEach(row => {
    if(!isDateKey(row.week_key) || !isWeekKey(row.week_key) || isBeforeStart(row.week_key)) return;
    const localWk = weeklyCache[row.week_key];
    const localTs = localWk?._updatedAt;
    if(localTs && row.updated_at && localTs > row.updated_at) return;
    const bwStr = (row.body_weight !== undefined && row.body_weight !== null)
      ? String(row.body_weight).replace('.', ',')
      : '';
    weeklyCache[row.week_key] = { dayMapping: row.day_mapping||{}, bodyWeight: bwStr, _revision: row.revision, _updatedAt: row.updated_at };
    lsWeekSave(row.week_key, weeklyCache[row.week_key]);
  });

  (bootstrapData.daily_logs||[]).forEach(row => {
    if(!isDateKey(row.date) || isBeforeStart(row.date)) return;
    const rowDate = new Date(row.date+'T12:00:00');
    if(!isValidDateValue(rowDate)) return;
    const localDay = dailyCache[row.date];
    const localTs  = localDay?._updatedAt;
    if(localTs && row.updated_at && localTs > row.updated_at) {
      if(localDay?._dirty) conflicts.push({ date: row.date, local: localDay, remote: row });
      return;
    }
    let tracker = row.tracker || {};
    let sess    = row.session  || null;
    dailyCache[row.date] = { ...tracker, _session: sess, _revision: row.revision, _updatedAt: row.updated_at };
    lsDaySave(row.date, dailyCache[row.date]);
  });

  return { weeklyCache, dailyCache, routinesCache, conflicts };
};



export const getRC = () => {
  return window.Recharts || {};
};

// pn: parsea números en formato ES-AR ("65,0" → 65, "1.250,5" → 1250.5)
export const pn = v => {

  if(!v && v !== 0) return 0;
  const s = String(v).trim();
  if(s.includes(',')) {
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export const fn = v => {
  if(!v && v!==0) return "0";
  const n=Number(v);
  return n.toLocaleString('es-AR',{maximumFractionDigits:1});
};

export const ft = s => {
  const m=Math.floor(s/60),sec=s%60;
  return `${m}:${sec<10?'0':''}${sec}`;
};


