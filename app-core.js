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
