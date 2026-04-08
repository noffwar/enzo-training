import { safeLocalSet, readStoredJson } from './app-core.js?v=20260408-2';

const V3 = {
  WEEK: 'enzo_v3_week:',
  DAY: 'enzo_v3_day:',
  ROUT: 'enzo_v3_routine:',
  NOTIF: 'enzo_v3_notif:',
  META: 'enzo_v3_meta:',
  OLD: 'enzo_v2_'
};

const bodyWeightToNumeric = (bw) => {
  if (!bw && bw !== 0) return null;
  const n = parseFloat(String(bw).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};

export const createAppSync = ({
  supabase,
  stripRoutineMeta,
  getWeekKey,
  addWeeks,
  isDateKey,
  getDayDate,
  isBeforeStart
}) => {
  const metaGet = (key) => readStoredJson(V3.META + key, null);
  const metaSet = (key, value) => { safeLocalSet(V3.META + key, value); };

  const getDeviceId = () => {
    let id = metaGet('device_id');
    if (!id) {
      id = `dev_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
      metaSet('device_id', id);
    }
    return id;
  };

  const DEVICE_ID = getDeviceId();

  const lsWeekSave = (weekKey, value) => { safeLocalSet(V3.WEEK + weekKey, value); };
  const lsWeekLoad = (weekKey) => readStoredJson(V3.WEEK + weekKey, null);
  const lsAllWeekKeys = () => Object.keys(localStorage)
    .filter((key) => key.startsWith(V3.WEEK))
    .map((key) => key.slice(V3.WEEK.length))
    .sort()
    .reverse();

  const lsDaySave = (dateKey, value) => { safeLocalSet(V3.DAY + dateKey, value); };
  const lsDayLoad = (dateKey) => readStoredJson(V3.DAY + dateKey, null);
  const lsAllDayKeys = () => Object.keys(localStorage)
    .filter((key) => key.startsWith(V3.DAY))
    .map((key) => key.slice(V3.DAY.length))
    .sort()
    .reverse();

  const lsRoutineSave = (routineId, value) => { safeLocalSet(V3.ROUT + routineId, value); };
  const lsRoutineLoad = (routineId) => readStoredJson(V3.ROUT + routineId, null);
  const lsAllRoutineKeys = () => Object.keys(localStorage)
    .filter((key) => key.startsWith(V3.ROUT))
    .map((key) => key.slice(V3.ROUT.length));

  const lsNotifSave = (deviceId, value) => { safeLocalSet(V3.NOTIF + deviceId, value); };
  const lsNotifLoad = (deviceId) => readStoredJson(V3.NOTIF + deviceId, null);

  const migrateLegacyLocalStorage = () => {
    if (metaGet('migration_v3_done')) return;
    const oldKeys = Object.keys(localStorage).filter((key) => key.startsWith(V3.OLD));
    if (oldKeys.length === 0) {
      metaSet('migration_v3_done', true);
      return;
    }

    oldKeys.forEach((fullKey) => {
      const key = fullKey.slice(V3.OLD.length);
      try {
        const raw = localStorage.getItem(fullKey);
        if (!raw) return;
        const value = JSON.parse(raw);
        if (!value) return;

        const hasWeekStruct = !!(value.dayMapping || value.sessions);
        const hasDayStruct = !!(value.meds || value.meals || value.fasted !== undefined);
        const hasTracker = !!value.tracker;
        const isDateFmt = isDateKey(key);

        if (hasTracker) {
          const weekKey = key;
          if (!lsWeekLoad(weekKey)) lsWeekSave(weekKey, { dayMapping: value.dayMapping || {}, bodyWeight: value.bodyWeight || '' });
          Object.entries(value.tracker || {}).forEach(([idx, dayData]) => {
            const dateKey = getDayDate(weekKey, parseInt(idx, 10));
            if (!lsDayLoad(dateKey)) lsDaySave(dateKey, { ...dayData, _session: (value.sessions || {})[idx] || null });
          });
          return;
        }

        if (hasWeekStruct && !hasDayStruct) {
          if (!lsWeekLoad(key)) lsWeekSave(key, value);
          return;
        }

        if (hasDayStruct && !hasWeekStruct) {
          if (!lsDayLoad(key)) lsDaySave(key, value);
          return;
        }

        if (!isDateFmt) return;

        const dayOfWeek = new Date(`${key}T12:00:00`).getDay();
        if (dayOfWeek === 1 && hasWeekStruct) {
          if (!lsWeekLoad(key)) lsWeekSave(key, value);
          if (!lsDayLoad(key)) lsDaySave(key, value);
          return;
        }

        if (!lsDayLoad(key)) lsDaySave(key, value);
      } catch (error) {
        console.warn('[Migration] error en', fullKey, error.message);
      }
    });

    metaSet('migration_v3_done', true);
  };

  const openOutboxDB = () => window.idb?.openDB('enzo-sync-db-v3', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'entity_key' });
      }
    }
  });

  const enqueueOutboxOp = async ({ entity_type, entity_id, payload, base_revision }) => {
    try {
      const db = await openOutboxDB();
      await db.put('outbox', {
        entity_key: `${entity_type}:${entity_id}`,
        entity_type,
        entity_id,
        payload,
        base_revision,
        queued_at: Date.now(),
        retries: 0,
        device_id: DEVICE_ID
      });
    } catch (error) {
      console.warn('[Outbox] enqueue error:', error.message);
    }
  };

  const flushOutbox = async () => {
    if (!navigator.onLine || !window.idb) return;
    try {
      const db = await openOutboxDB();
      const items = await db.getAll('outbox');
      if (!items || items.length === 0) return;

      for (const item of items) {
        try {
          let rpcName;
          let rpcArgs;

          if (item.entity_type === 'daily_log') {
            rpcName = 'save_daily_log';
            rpcArgs = {
              p_date: item.entity_id,
              p_tracker: item.payload.tracker,
              p_session: item.payload.session || null,
              p_base_revision: item.base_revision || null,
              p_device_id: DEVICE_ID
            };
          } else if (item.entity_type === 'weekly_config') {
            rpcName = 'save_weekly_config';
            rpcArgs = {
              p_week_key: item.entity_id,
              p_body_weight: item.payload.body_weight || null,
              p_day_mapping: item.payload.day_mapping || {},
              p_base_revision: item.base_revision || null,
              p_device_id: DEVICE_ID
            };
          } else if (item.entity_type === 'routine') {
            rpcName = 'save_routine';
            rpcArgs = {
              p_routine_id: item.entity_id,
              p_data: item.payload,
              p_base_revision: item.base_revision || null,
              p_device_id: DEVICE_ID
            };
          } else {
            continue;
          }

          const { data, error } = await supabase.rpc(rpcName, rpcArgs);
          if (error) throw new Error(error.message);

          if (data?.status === 'conflict') {
            metaSet('last_conflict', { entity_key: item.entity_key, server: data.server, at: new Date().toISOString() });
            await db.delete('outbox', item.entity_key);
            continue;
          }

          if (item.entity_type === 'daily_log') {
            const local = lsDayLoad(item.entity_id) || {};
            lsDaySave(item.entity_id, {
              ...local,
              _revision: data?.revision || local._revision || item.base_revision || null,
              _updatedAt: data?.updated_at || new Date().toISOString(),
              _dirty: false
            });
          } else if (item.entity_type === 'weekly_config') {
            const local = lsWeekLoad(item.entity_id) || {};
            lsWeekSave(item.entity_id, {
              ...local,
              _revision: data?.revision || local._revision || item.base_revision || null,
              _updatedAt: data?.updated_at || new Date().toISOString()
            });
          } else if (item.entity_type === 'routine') {
            const local = lsRoutineLoad(item.entity_id) || {};
            lsRoutineSave(item.entity_id, {
              ...stripRoutineMeta(local),
              _revision: data?.revision || local._revision || item.base_revision || null,
              _updatedAt: data?.updated_at || new Date().toISOString()
            });
          }

          await db.delete('outbox', item.entity_key);
        } catch (error) {
          if (!navigator.onLine) break;
          item.retries = (item.retries || 0) + 1;
          if (item.retries >= 5) await db.delete('outbox', item.entity_key);
          else await db.put('outbox', item);
        }
      }

      metaSet('last_sync', new Date().toISOString());
    } catch (error) {
      metaSet('last_error', error.message?.slice(0, 100));
      console.warn('[Outbox] flush error:', error.message);
    }
  };

  const saveDayRemote = async (date, tracker, session, baseRevision) => {
    const nowIso = new Date().toISOString();
    const existing = lsDayLoad(date) || {};
    lsDaySave(date, {
      ...existing,
      ...tracker,
      _session: session || null,
      _revision: tracker?._revision || baseRevision || existing._revision || null,
      _updatedAt: nowIso,
      _dirty: true
    });
    try {
      const { data, error } = await supabase.rpc('save_daily_log', {
        p_date: date,
        p_tracker: tracker,
        p_session: session || null,
        p_base_revision: baseRevision || null,
        p_device_id: DEVICE_ID
      });
      if (error) throw new Error(error.message);
      if (data?.status === 'conflict') {
        metaSet('last_conflict', { type: 'daily_log', entity: date, server: data.server, at: new Date().toISOString() });
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
    } catch (error) {
      const isNet = !navigator.onLine || error.name === 'TypeError' || error.message?.includes('fetch');
      if (isNet) {
        await enqueueOutboxOp({ entity_type: 'daily_log', entity_id: date, payload: { tracker, session: session || null }, base_revision: baseRevision });
        return { ok: true, queued: true };
      }
      metaSet('last_error', error.message?.slice(0, 100));
      return { ok: false, queued: false, error: error.message };
    }
  };

  const saveWeeklyRemote = async (weekKey, bodyWeight, dayMapping, baseRevision) => {
    const nowIso = new Date().toISOString();
    const existing = lsWeekLoad(weekKey) || {};
    lsWeekSave(weekKey, {
      ...existing,
      bodyWeight: bodyWeight || '',
      dayMapping: dayMapping || {},
      _revision: baseRevision || existing._revision || null,
      _updatedAt: nowIso
    });
    try {
      const bwNumeric = bodyWeightToNumeric(bodyWeight);
      const { data, error } = await supabase.rpc('save_weekly_config', {
        p_week_key: weekKey,
        p_body_weight: bwNumeric,
        p_day_mapping: dayMapping || {},
        p_base_revision: baseRevision || null,
        p_device_id: DEVICE_ID
      });
      if (error) throw new Error(error.message);
      if (data?.status === 'conflict') {
        metaSet('last_conflict', { type: 'weekly_config', entity: weekKey, server: data.server, at: new Date().toISOString() });
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
    } catch (error) {
      const isNet = !navigator.onLine || error.name === 'TypeError' || error.message?.includes('fetch');
      if (isNet) {
        await enqueueOutboxOp({
          entity_type: 'weekly_config',
          entity_id: weekKey,
          payload: { body_weight: bodyWeightToNumeric(bodyWeight), day_mapping: dayMapping || {} },
          base_revision: baseRevision
        });
        return { ok: true, queued: true };
      }
      metaSet('last_error', error.message?.slice(0, 100));
      return { ok: false, queued: false, error: error.message };
    }
  };

  const saveRoutineRemote = async (routineId, routineData, baseRevision) => {
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
        p_routine_id: routineId,
        p_data: cleanRoutine,
        p_base_revision: baseRevision || null,
        p_device_id: DEVICE_ID
      });
      if (error) throw new Error(error.message);
      if (data?.status === 'conflict') return { ok: false, queued: false, conflict: true };
      const local = lsRoutineLoad(routineId) || {};
      lsRoutineSave(routineId, {
        ...stripRoutineMeta(local),
        _revision: data?.revision || local._revision || baseRevision || null,
        _updatedAt: data?.updated_at || new Date().toISOString()
      });
      return { ok: true, queued: false };
    } catch (error) {
      const isNet = !navigator.onLine || error.name === 'TypeError' || error.message?.includes('fetch');
      if (isNet) {
        await enqueueOutboxOp({ entity_type: 'routine', entity_id: routineId, payload: cleanRoutine, base_revision: baseRevision });
        return { ok: true, queued: true };
      }
      return { ok: false, queued: false, error: error.message };
    }
  };

  const bootstrapRemoteState = async () => {
    const eightWeeksAgo = addWeeks(getWeekKey(new Date()), -8);
    const { data, error } = await supabase.rpc('get_bootstrap_state', { p_from: eightWeeksAgo });
    if (error || !data) throw new Error(error?.message || 'Bootstrap vacio');
    return data;
  };

  const loadLocalCaches = () => {
    const weeklyCache = {};
    const dailyCache = {};
    const routinesCache = {};

    lsAllWeekKeys()
      .filter((key) => !isBeforeStart(key) && isDateKey(key))
      .forEach((weekKey) => {
        const value = lsWeekLoad(weekKey);
        if (value) weeklyCache[weekKey] = value;
      });

    lsAllDayKeys()
      .filter((key) => !isBeforeStart(key))
      .forEach((dateKey) => {
        const value = lsDayLoad(dateKey);
        if (value) dailyCache[dateKey] = value;
      });

    lsAllRoutineKeys().forEach((routineId) => {
      const value = lsRoutineLoad(routineId);
      if (value) routinesCache[routineId] = value;
    });

    return { weeklyCache, dailyCache, routinesCache };
  };

  const applyBootstrapToState = (bootstrapData, prevWeeklyCache, prevDailyCache) => {
    const weeklyCache = { ...prevWeeklyCache };
    const dailyCache = { ...prevDailyCache };
    const routinesCache = {};
    const conflicts = [];

    (bootstrapData.routines || []).forEach((row) => {
      const localRoutine = lsRoutineLoad(row.routine_id);
      const localTs = localRoutine?._updatedAt;
      if (localTs && row.updated_at && localTs > row.updated_at) {
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

    (bootstrapData.weekly_configs || []).forEach((row) => {
      if (isBeforeStart(row.week_key)) return;
      const localWeek = weeklyCache[row.week_key];
      const localTs = localWeek?._updatedAt;
      if (localTs && row.updated_at && localTs > row.updated_at) return;
      const bodyWeight = row.body_weight !== undefined && row.body_weight !== null
        ? String(row.body_weight).replace('.', ',')
        : '';
      weeklyCache[row.week_key] = {
        dayMapping: row.day_mapping || {},
        bodyWeight,
        _revision: row.revision,
        _updatedAt: row.updated_at
      };
      lsWeekSave(row.week_key, weeklyCache[row.week_key]);
    });

    (bootstrapData.daily_logs || []).forEach((row) => {
      if (isBeforeStart(row.date)) return;
      const localDay = dailyCache[row.date];
      const localTs = localDay?._updatedAt;
      if (localTs && row.updated_at && localTs > row.updated_at) {
        if (localDay?._dirty) conflicts.push({ date: row.date, local: localDay, remote: row });
        return;
      }
      let tracker = row.tracker || {};
      let session = row.session || null;
      if (tracker.tracker) {
        const dayIdx = new Date(`${row.date}T12:00:00`).getDay();
        tracker = tracker.tracker?.[dayIdx] || {};
        session = tracker.sessions?.[dayIdx] || null;
      }
      dailyCache[row.date] = {
        ...tracker,
        _session: session,
        _revision: row.revision,
        _updatedAt: row.updated_at
      };
      lsDaySave(row.date, dailyCache[row.date]);
    });

    return { weeklyCache, dailyCache, routinesCache, conflicts };
  };

  return {
    metaGet,
    metaSet,
    DEVICE_ID,
    lsWeekSave,
    lsWeekLoad,
    lsAllWeekKeys,
    lsDaySave,
    lsDayLoad,
    lsAllDayKeys,
    lsRoutineSave,
    lsRoutineLoad,
    lsAllRoutineKeys,
    lsNotifSave,
    lsNotifLoad,
    migrateLegacyLocalStorage,
    flushOutbox,
    saveDayRemote,
    saveWeeklyRemote,
    saveRoutineRemote,
    bootstrapRemoteState,
    loadLocalCaches,
    applyBootstrapToState
  };
};
