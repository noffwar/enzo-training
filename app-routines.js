export const createRoutineStore = ({
  DEFAULT_ROUTINES,
  ROUTINES_KEY,
  lsAllRoutineKeys,
  lsRoutineLoad,
  lsRoutineSave,
  saveRoutineRemote,
  safeLocalSet,
  stripRoutineMeta
}) => {
  const loadRoutines = () => {
    const v3Keys = lsAllRoutineKeys();
    if (v3Keys.length > 0) {
      const routines = {};
      v3Keys.forEach((id) => {
        const data = lsRoutineLoad(id);
        if (data) routines[id] = data;
      });
      if (Object.keys(routines).length > 0) return routines;
    }

    try {
      const saved = localStorage.getItem(ROUTINES_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_ROUTINES;
    } catch (_) {
      return DEFAULT_ROUTINES;
    }
  };

  const saveRoutines = async (routines) => {
    const prevRevisions = Object.fromEntries(
      Object.keys(routines).map((id) => [id, lsRoutineLoad(id)?._revision || null])
    );
    const stampedAt = new Date().toISOString();

    Object.entries(routines).forEach(([id, data]) => {
      lsRoutineSave(id, {
        ...stripRoutineMeta(data),
        _revision: prevRevisions[id] || data?._revision || null,
        _updatedAt: stampedAt
      });
    });

    try {
      const legacyPayload = Object.fromEntries(
        Object.entries(routines).map(([id, data]) => [id, stripRoutineMeta(data)])
      );
      safeLocalSet(ROUTINES_KEY, legacyPayload);
    } catch (_) {
      // legacy mirror is best-effort only
    }

    Object.entries(routines).forEach(([id, data]) => {
      saveRoutineRemote(id, stripRoutineMeta(data), prevRevisions[id] || null).catch(() => {});
    });
  };

  return { loadRoutines, saveRoutines };
};
