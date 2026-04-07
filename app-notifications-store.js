export const LEGACY_NOTIFICATION_STORAGE_KEY = 'enzo_notifs_v1';

export const DEFAULT_NOTIFS = [
  { id:'meal1',  label:'🍽️ Comida 1',         time:'12:00', enabled:false },
  { id:'meal2',  label:'🍽️ Comida 2',         time:'16:00', enabled:false },
  { id:'meal3',  label:'🍽️ Comida 3',         time:'21:00', enabled:false },
  { id:'gym',    label:'🏋️ Ir al gym',        time:'18:00', enabled:false },
  { id:'sleep',  label:'😴 Dormir',           time:'23:30', enabled:false },
  { id:'meds',   label:'💊 Roacuttan',        time:'14:00', enabled:false },
  { id:'meds2',  label:'💊 Medicacion noche', time:'23:30', enabled:false }
];

export const loadNotifsLocal = ({ lsNotifLoad, deviceId, fallback = DEFAULT_NOTIFS } = {}) => {
  const v3 = lsNotifLoad?.(deviceId);
  if (v3) return Array.isArray(v3) ? v3 : (v3.notifs || fallback);
  try {
    const saved = localStorage.getItem(LEGACY_NOTIFICATION_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {
    // legacy migration path is best-effort only
  }
  return fallback;
};
