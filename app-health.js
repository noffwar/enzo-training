export const createHealthView = ({
  html,
  useState,
  useEffect,
  useCallback,
  supabase,
  MEDS_STOCK_DEFAULT,
  MEDS_STOCK_KEY,
  pn,
  getDinnerLogicalTargetState,
  localDateKey,
  pickNewestPayload,
  safeLocalSet,
  safeDispatch,
  getWeekKey,
  getDayDate,
  HEALTH_HISTORY_FILTERS,
  getHealthEntryMeta,
  DAYS,
  Card,
  SectionAccordion,
  ISync, ICheck, IChevD
}) => {

  const HealthHistoryRow = ({ entry, meta, editingHistoryAt, onEdit, onDelete }) => html`
    <div style="padding:10px;border-radius:10px;background:rgba(15,23,41,0.75);border:1px solid #1E2D45;display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style=${`padding:2px 6px;border-radius:6px;font-size:9px;font-weight:800;letter-spacing:0.05em;border:1px solid ${meta.border};background:${meta.bg};color:${meta.color};`}>
            ${meta.badge}
          </span>
          <span style="font-size:11px;color:#94A3B8;font-family:'JetBrains Mono',monospace;">
            ${entry.at ? new Date(entry.at).toLocaleString('es-AR') : 'Sin fecha'}
          </span>
        </div>
        <p style="margin:0;font-size:12px;color:#E2E8F0;">${meta.text}</p>
        ${entry.logical_date ? html`<p style="margin:4px 0 0;font-size:10px;color:#64748b;">Aplica al dia: ${entry.logical_date}</p>` : ''}
      </div>
      <div style="display:flex;gap:6px;">
        <button onClick=${()=>onEdit(entry.at)} disabled=${editingHistoryAt === entry.at} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.12);color:#7DD3FC;font-size:11px;font-weight:700;cursor:pointer;">
          ${editingHistoryAt === entry.at ? 'CORRIGIENDO...' : 'CORREGIR'}
        </button>
      </div>
    </div>
  `;

  const HealthStatusCard = ({title, status}) => html`
    <div style=${`padding:8px 10px;border-radius:8px;border:1px solid ${status.border};background:${status.bg};`}>
      <p style="margin:0;font-size:10px;text-transform:uppercase;color:#94A3B8;">${title}</p>
      <p style=${`margin:4px 0 0;font-size:13px;font-weight:700;color:${status.color};`}>${status.label}</p>
    </div>
  `;

  const SegmentedPillGroup = ({options, value, onChange}) => html`
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${options.map(([val, label]) => html`
        <button onClick=${()=>onChange(val)} style=${`padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid ${value===val?'rgba(99,102,241,0.5)':'#1E2D45'};background:${value===val?'rgba(99,102,241,0.15)':'rgba(15,23,41,0.6)'};color:${value===val?'#A5B4FC':'#64748B'};`}>
          ${label}
        </button>
      `)}
    </div>
  `;

  return function HealthView({session, onSyncDailyMeds, bodyWeight, onBodyWeight, todayMeds, previousDayMeds, weekTracker, healthWeekKey, onOpenDay}) {
      const [stock, setStock] = useState(MEDS_STOCK_DEFAULT);
      const [loading, setLoading] = useState(true);
      const [saving, setSaving] = useState(false);
      const [error, setError] = useState('');
      const [notice, setNotice] = useState('');
      const [editingHistoryAt, setEditingHistoryAt] = useState('');
      const [historyFilter, setHistoryFilter] = useState('all');
      const [healthSectionOpen, setHealthSectionOpen] = useState({
        inventory: true,
        takes: true,
        weekly: false,
        history: false
      });
      const todayMedsState = todayMeds || {};
      const previousMedsState = previousDayMeds || {};
      const getDinnerLogicalTarget = () => getDinnerLogicalTargetState({
        todayMedsState,
        previousMedsState,
        now: new Date()
      });

      const entryDeltas = (entry) => {
        if(!entry) return { roaccutan: 0, combo: 0 };
        if(entry.type === 'roaccutan_take') return { roaccutan: -1, combo: 0 };
        if(entry.type === 'dinner_combo_take') return { roaccutan: 0, combo: -1 };
        if(entry.type === 'habit_toggle') {
          return {
            roaccutan: pn(entry.delta_roaccutan),
            combo: pn(entry.delta_combo)
          };
        }
        if(entry.field === 'roaccutan') return { roaccutan: pn(entry.delta), combo: 0 };
        if(entry.field === 'minoxidil_finasteride') return { roaccutan: 0, combo: pn(entry.delta) };
        return { roaccutan: 0, combo: 0 };
      };
      const hasRemainingTakeForDate = (history, field, dateKey) => {
        return (history || []).some(entry => {
          const entryDateKey = entry?.logical_date || (entry?.at ? localDateKey(new Date(entry.at)) : '');
          if(entryDateKey !== dateKey) return false;
          const deltas = entryDeltas(entry);
          return field === 'roaccutan' ? deltas.roaccutan < 0 : deltas.combo < 0;
        });
      };
      const recalcLastTakeFields = (payload) => {
        const history = Array.isArray(payload?.history) ? payload.history : [];
        const lastRoaccutan = history.find(entry => entry?.type === 'roaccutan_take' || (entry?.type === 'habit_toggle' && pn(entry?.delta_roaccutan) < 0));
        const lastDinner = history.find(entry => entry?.type === 'dinner_combo_take' || (entry?.type === 'habit_toggle' && pn(entry?.delta_combo) < 0));
        const latestAt = history.find(entry => entry?.at)?.at || '';
        return {
          ...payload,
          last_roaccutan_at: lastRoaccutan?.at || '',
          last_dinner_meds_at: lastDinner?.at || '',
          last_dinner_logical_date: lastDinner?.logical_date || (lastDinner?.at ? localDateKey(new Date(lastDinner.at)) : ''),
          last_taken_at: latestAt || ''
        };
      };
      const buildHealthPayload = (basePayload, patch = {}, newEntry = null) => {
        const base = { ...MEDS_STOCK_DEFAULT, ...(basePayload || {}) };
        const history = Array.isArray(base.history) ? base.history : [];
        const next = {
          ...base,
          ...patch,
          history: newEntry ? [newEntry, ...history].slice(0, 60) : history
        };
        return recalcLastTakeFields(next);
      };
      const applyHealthAction = async ({ patch, entry, okMsg }) => {
        const next = buildHealthPayload(stock, patch, entry);
        await persistHealth(next, okMsg);
        return next;
      };
      const loadHealth = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
          const local = JSON.parse(localStorage.getItem(MEDS_STOCK_KEY) || 'null');
          const { data, error } = await supabase
            .from('app_inventory')
            .select('data, updated_at')
            .eq('key', 'meds_stock')
            .maybeSingle();
          if(error) {
            setStock({ ...MEDS_STOCK_DEFAULT, ...(local || {}) });
          } else {
            const freshest = pickNewestPayload(local, data?.data || null, data?.updated_at || '', MEDS_STOCK_DEFAULT);
            const merged = { ...MEDS_STOCK_DEFAULT, ...(freshest || {}) };
            setStock(merged);
          safeLocalSet(MEDS_STOCK_KEY, merged);
          }
        } catch(e) {
          try {
            const local = JSON.parse(localStorage.getItem(MEDS_STOCK_KEY) || 'null');
            setStock({ ...MEDS_STOCK_DEFAULT, ...(local || {}) });
          } catch(_) {
            setError(e.message || 'No se pudo cargar SALUD.');
          }
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        loadHealth();
        const onFocus = () => loadHealth();
        const onVisible = () => { if(document.visibilityState === 'visible') loadHealth(); };
        const onHealthChanged = (event) => {
          if(event?.detail) setStock(prev => ({ ...prev, ...event.detail }));
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('enzo-health-changed', onHealthChanged);
        return () => {
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisible);
          window.removeEventListener('enzo-health-changed', onHealthChanged);
        };
      }, [loadHealth]);

      const exportHealthData = () => {
        try {
          const payload = {
            app: 'enzo-training-health',
            exported_at: new Date().toISOString(),
            meds_stock: stock,
            body_weight: bodyWeight || ''
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `salud-stock-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setNotice('Datos de SALUD exportados.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudieron exportar los datos de salud.');
        }
      };

      const persistHealth = async (payload, okMsg='Salud guardada.') => {
        setSaving(true);
        setError('');
        try {
          const normalizedPayload = { ...payload, _updatedAt: new Date().toISOString() };
          setStock(normalizedPayload);
        safeDispatch('enzo-health-changed', normalizedPayload);
        safeLocalSet(MEDS_STOCK_KEY, normalizedPayload);
          const { error } = await supabase
            .from('app_inventory')
            .upsert({
              key: 'meds_stock',
              data: normalizedPayload,
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
          if(error) {
            setNotice(`${okMsg} Guardado local porque el remoto esta restringido.`);
          } else {
            setNotice(okMsg);
          }
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo guardar SALUD.');
        } finally {
          setSaving(false);
        }
      };

      const syncTodayChecks = async (partial, dateKey) => {
        if(typeof onSyncDailyMeds === 'function') {
          await onSyncDailyMeds(partial, dateKey);
        }
      };

      const registerRoaccutanTake = async () => {
        if(todayMedsState.roacuttan) {
          setNotice('Roaccutan ya esta marcado hoy. Si fue un error, corregilo desde HOY o el historial.');
          setTimeout(() => setNotice(''), 2500);
          return;
        }
        const now = new Date();
        await applyHealthAction({
          patch: {
          roaccutan: Math.max(0, (parseInt(stock.roaccutan || 0, 10) || 0) - 1),
          },
          entry: {
            at: now.toISOString(),
            type: 'roaccutan_take',
            logical_date: localDateKey(now),
            roaccutan: 1
          },
          okMsg: 'Roaccutan del mediodia registrado.'
        });
        await syncTodayChecks({ roacuttan: true });
      };

      const registerDinnerTake = async () => {
        const dinnerTarget = getDinnerLogicalTarget();
        if(dinnerTarget.medsState.finasteride && dinnerTarget.medsState.minoxidil) {
          setNotice(`Las meds de cena ya estan marcadas para ${dinnerTarget.label}. Si fue un error, corregilo desde HOY o el historial.`);
          setTimeout(() => setNotice(''), 2500);
          return;
        }
        const now = new Date();
        await applyHealthAction({
          patch: {
          minoxidil_finasteride: Math.max(0, (parseInt(stock.minoxidil_finasteride || 0, 10) || 0) - 1),
          },
          entry: {
            at: now.toISOString(),
            type: 'dinner_combo_take',
            logical_date: dinnerTarget.dateKey,
            minoxidil_finasteride: 1
          },
          okMsg: `Meds de la cena registradas para ${dinnerTarget.label}.`
        });
        await syncTodayChecks({ finasteride: true, minoxidil: true }, dinnerTarget.dateKey);
      };

      const adjustStock = async (field, delta) => {
        const nowIso = new Date().toISOString();
        const current = parseInt(stock[field] || 0, 10) || 0;
        const nextVal = Math.max(0, current + delta);
        await applyHealthAction({
          patch: { [field]: nextVal },
          entry: {
            at: nowIso,
            type: delta > 0 ? 'restock' : 'manual_adjust',
            field,
            delta
          },
          okMsg: delta > 0 ? 'Stock repuesto.' : 'Stock ajustado.'
        });
      };

      const deleteHistoryEntry = async (entryAt) => {
        const history = Array.isArray(stock.history) ? stock.history : [];
        const target = history.find(entry => entry?.at === entryAt);
        if(!target) return;
        const deltas = entryDeltas(target);
        const remaining = history.filter(entry => entry?.at !== entryAt);
        const next = buildHealthPayload({
          ...stock,
          roaccutan: Math.max(0, pn(stock.roaccutan) - deltas.roaccutan),
          minoxidil_finasteride: Math.max(0, pn(stock.minoxidil_finasteride) - deltas.combo),
          history: remaining
        });
        await persistHealth(next, 'Movimiento borrado y stock recompuesto.');
        const affectsDate = target?.logical_date || (target?.at ? localDateKey(new Date(target.at)) : '');
        const affectsChecks = target?.type === 'roaccutan_take' || target?.type === 'dinner_combo_take' || target?.type === 'habit_toggle';
        if(affectsChecks && affectsDate) {
          if(deltas.roaccutan < 0 && !hasRemainingTakeForDate(remaining, 'roaccutan', affectsDate)) {
            await syncTodayChecks({ roacuttan: false }, affectsDate);
          }
          if(deltas.roaccutan > 0) {
            await syncTodayChecks({ roacuttan: true }, affectsDate);
          }
          if(deltas.combo < 0 && !hasRemainingTakeForDate(remaining, 'combo', affectsDate)) {
            await syncTodayChecks({ finasteride: false, minoxidil: false }, affectsDate);
          }
          if(deltas.combo > 0) {
            await syncTodayChecks({ finasteride: true, minoxidil: true }, affectsDate);
          }
        }
      };
      const editHistoryEntry = async (entryAt) => {
        const history = Array.isArray(stock.history) ? stock.history : [];
        const target = history.find(entry => entry?.at === entryAt);
        if(!target) return;
        setEditingHistoryAt(entryAt);
        try {
          if(target.type === 'roaccutan_take') {
            await deleteHistoryEntry(entryAt);
            setNotice('Movimiento listo para corregir. Usa REGISTRAR ROACCUTAN si queres volver a cargarlo.');
          } else if(target.type === 'dinner_combo_take') {
            await deleteHistoryEntry(entryAt);
            setNotice('Movimiento listo para corregir. Usa REGISTRAR MEDS CENA si queres volver a cargarlo.');
          } else if(target.type === 'restock' || target.type === 'manual_adjust') {
            const fieldLabel = target.field === 'roaccutan' ? 'Roaccutan' : 'Minoxidil/Finasteride';
            const nextVal = window.prompt(`Nuevo ajuste para ${fieldLabel}. Usa positivo o negativo.`, String(target.delta || 0));
            if(nextVal == null) return;
            const parsed = pn(nextVal);
            if(!parsed && parsed !== 0) {
              setNotice('Ajuste cancelado.');
              return;
            }
            await deleteHistoryEntry(entryAt);
            if(parsed !== 0) await adjustStock(target.field, parsed);
          } else if(target.type === 'habit_toggle') {
            await deleteHistoryEntry(entryAt);
            setNotice('Check diario quitado del historial. Si queres corregirlo, hacelo desde HOY.');
          }
          setTimeout(() => setNotice(''), 3000);
        } finally {
          setEditingHistoryAt('');
        }
      };

      const roaccutanCount = parseInt(stock.roaccutan || 0, 10) || 0;
      const minoxCount = parseInt(stock.minoxidil_finasteride || 0, 10) || 0;
      const low = roaccutanCount <= 2 || minoxCount <= 2;
      const fullHistory = Array.isArray(stock.history) ? stock.history : [];
      const dinnerTarget = getDinnerLogicalTarget();
      const roaccutanStatus = todayMedsState.roacuttan
        ? { label:'Hecha hoy', color:'#86EFAC', bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.35)' }
        : { label:'Pendiente', color:'#FCD34D', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.35)' };
      const dinnerDone = !!dinnerTarget.medsState.finasteride && !!dinnerTarget.medsState.minoxidil;
      const todayHealthIssues = [];
      const todayRoaccutanExpected = hasRemainingTakeForDate(fullHistory, 'roaccutan', localDateKey());
      const todayDinnerExpected = hasRemainingTakeForDate(fullHistory, 'combo', dinnerTarget.dateKey);
      if(!!todayMedsState.roacuttan !== todayRoaccutanExpected) {
        todayHealthIssues.push(todayRoaccutanExpected ? 'Roaccutan con toma real sin check' : 'Roaccutan marcado sin toma real');
      }
      if(dinnerDone !== todayDinnerExpected) {
        todayHealthIssues.push(todayDinnerExpected
          ? (dinnerTarget.label === 'ayer' ? 'Cena de ayer con toma real sin checks completos' : 'Cena con toma real sin checks completos')
          : (dinnerTarget.label === 'ayer' ? 'Cena de ayer marcada sin toma real' : 'Cena marcada sin toma real'));
      }
      const dinnerStatus = dinnerDone
        ? {
            label: dinnerTarget.label === 'ayer' ? 'Hecha para ayer' : 'Hecha hoy',
            color:'#86EFAC',
            bg:'rgba(16,185,129,0.12)',
            border:'rgba(16,185,129,0.35)'
          }
        : {
            label: dinnerTarget.label === 'ayer' ? 'Pendiente de ayer' : 'Pendiente',
            color:'#FCD34D',
            bg:'rgba(245,158,11,0.12)',
            border:'rgba(245,158,11,0.35)'
          };
      const statusMeta = {
        roaccutan: roaccutanStatus,
        dinner: dinnerStatus
      };
      const weekStartKey = healthWeekKey || getWeekKey(new Date());
      const weekDateKeys = Array.from({ length: 7 }, (_, idx) => getDayDate(weekStartKey, idx));
      const weekEndKey = weekDateKeys[6];
      const weekHistory = fullHistory.filter(entry => {
        const logicalKey = entry?.logical_date || (entry?.at ? localDateKey(new Date(entry.at)) : '');
        if(!logicalKey) return false;
        return logicalKey >= weekStartKey && logicalKey <= weekEndKey;
      });
      const weekRealTakes = weekHistory.filter(entry =>
        entry?.type === 'roaccutan_take' || entry?.type === 'dinner_combo_take'
      );
      const weekRoaccutanTakes = weekRealTakes.filter(entry => entry?.type === 'roaccutan_take').length;
      const weekDinnerTakes = weekRealTakes.filter(entry => entry?.type === 'dinner_combo_take').length;
      const roaccutanAdherencePct = Math.min(100, Math.round((weekRoaccutanTakes / 7) * 100));
      const dinnerAdherencePct = Math.min(100, Math.round((weekDinnerTakes / 7) * 100));
      const adherenceColor = (pct) => pct >= 85 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
      const trackerDays = Object.values(weekTracker || {});
      const weekRoaccutanChecks = trackerDays.filter(day => !!day?.meds?.roacuttan).length;
      const weekDinnerChecks = trackerDays.filter(day => !!day?.meds?.finasteride && !!day?.meds?.minoxidil).length;
      const weekAllDeltas = weekHistory.reduce((acc, entry) => {
        const deltas = entryDeltas(entry);
        return {
          roaccutan: acc.roaccutan + deltas.roaccutan,
          combo: acc.combo + deltas.combo
        };
      }, { roaccutan: 0, combo: 0 });
      const weekMedicationDeltas = weekHistory.reduce((acc, entry) => {
        if(entry?.type !== 'roaccutan_take' && entry?.type !== 'dinner_combo_take' && entry?.type !== 'habit_toggle') {
          return acc;
        }
        const deltas = entryDeltas(entry);
        return {
          roaccutan: acc.roaccutan + deltas.roaccutan,
          combo: acc.combo + deltas.combo
        };
      }, { roaccutan: 0, combo: 0 });
      const weekAdjustmentBreakdown = weekHistory.reduce((acc, entry) => {
        if(!entry) return acc;
        const targetField = entry?.field === 'roaccutan'
          ? 'roaccutan'
          : entry?.field === 'minoxidil_finasteride'
            ? 'combo'
            : null;
        if(entry?.type === 'restock' && targetField) {
          acc[targetField].restock += pn(entry.delta);
        } else if(entry?.type === 'manual_adjust' && targetField) {
          acc[targetField].manual += pn(entry.delta);
        } else if(entry?.type === 'habit_toggle') {
          acc.roaccutan.checks += pn(entry.delta_roaccutan);
          acc.combo.checks += pn(entry.delta_combo);
        }
        return acc;
      }, {
        roaccutan: { restock: 0, manual: 0, checks: 0 },
        combo: { restock: 0, manual: 0, checks: 0 }
      });
      const weekOpeningStock = {
        roaccutan: Math.max(0, roaccutanCount - weekAllDeltas.roaccutan),
        combo: Math.max(0, minoxCount - weekAllDeltas.combo)
      };
      const expectedStockThisWeek = {
        roaccutan: Math.max(0, weekOpeningStock.roaccutan + weekMedicationDeltas.roaccutan),
        combo: Math.max(0, weekOpeningStock.combo + weekMedicationDeltas.combo)
      };
      const stockConsistency = [
        {
          label:'Roaccutan',
          field:'roaccutan',
          actual: roaccutanCount,
          expected: expectedStockThisWeek.roaccutan,
          opening: weekOpeningStock.roaccutan,
          takesDelta: weekMedicationDeltas.roaccutan,
          drift: roaccutanCount - expectedStockThisWeek.roaccutan,
          breakdown: weekAdjustmentBreakdown.roaccutan
        },
        {
          label:'Cena',
          field:'minoxidil_finasteride',
          actual: minoxCount,
          expected: expectedStockThisWeek.combo,
          opening: weekOpeningStock.combo,
          takesDelta: weekMedicationDeltas.combo,
          drift: minoxCount - expectedStockThisWeek.combo,
          breakdown: weekAdjustmentBreakdown.combo
        }
      ];
      const weekConsistency = [
        {
          label:'Roaccutan',
          checks: weekRoaccutanChecks,
          takes: weekRoaccutanTakes,
          diff: weekRoaccutanChecks - weekRoaccutanTakes
        },
        {
          label:'Cena',
          checks: weekDinnerChecks,
          takes: weekDinnerTakes,
          diff: weekDinnerChecks - weekDinnerTakes
        }
      ];
      const hasWeekMismatch = weekConsistency.some(row => row.diff !== 0);
      const weekDiagnostics = Object.keys(weekTracker || {}).sort((a,b)=>parseInt(a,10)-parseInt(b,10)).flatMap(dayIdx => {
        const trackerDay = weekTracker?.[dayIdx] || {};
        const meds = trackerDay.meds || {};
        const dateKey = getDayDate(healthWeekKey, parseInt(dayIdx, 10));
        const label = DAYS.find(d => d.key === String(dayIdx))?.abbr || dateKey;
        const desiredRoaccutan = hasRemainingTakeForDate(weekHistory, 'roaccutan', dateKey);
        const desiredDinner = hasRemainingTakeForDate(weekHistory, 'combo', dateKey);
        const issues = [];
        if(!!meds.roacuttan !== desiredRoaccutan) {
          issues.push({ dateKey, label, text: desiredRoaccutan ? 'Toma real sin check de Roaccutan' : 'Check de Roaccutan sin toma real' });
        }
        if((!!meds.finasteride && !!meds.minoxidil) !== desiredDinner) {
          issues.push({ dateKey, label, text: desiredDinner ? 'Toma real de cena sin checks completos' : 'Checks de cena sin toma real' });
        }
        return issues;
      });
      const filteredHistory = fullHistory.filter(entry => {
        if(historyFilter === 'all') return true;
        if(historyFilter === 'takes') return entry?.type === 'roaccutan_take' || entry?.type === 'dinner_combo_take';
        if(historyFilter === 'checks') return entry?.type === 'habit_toggle';
        if(historyFilter === 'adjustments') return entry?.type === 'manual_adjust' || entry?.type === 'restock';
        return true;
      });
      const historyEntries = filteredHistory.slice(0, 12).map(entry => ({
        entry,
        meta: getHealthEntryMeta(entry)
      }));
      const reconcileWeekChecks = async () => {
        if(typeof onSyncDailyMeds !== 'function' || !healthWeekKey) return;
        try {
          const updates = [];
          for(const dayIdx of Object.keys(weekTracker || {})) {
            const dateKey = getDayDate(healthWeekKey, parseInt(dayIdx, 10));
            const desiredRoaccutan = hasRemainingTakeForDate(weekHistory, 'roaccutan', dateKey);
            const desiredDinner = hasRemainingTakeForDate(weekHistory, 'combo', dateKey);
            const trackerDay = weekTracker?.[dayIdx] || {};
            const meds = trackerDay.meds || {};
            const patch = {};
            if(!!meds.roacuttan !== desiredRoaccutan) patch.roacuttan = desiredRoaccutan;
            if(!!meds.finasteride !== desiredDinner) patch.finasteride = desiredDinner;
            if(!!meds.minoxidil !== desiredDinner) patch.minoxidil = desiredDinner;
            if(Object.keys(patch).length) updates.push({ dateKey, patch });
          }
          for(const update of updates) {
            await onSyncDailyMeds(update.patch, update.dateKey);
          }
          setNotice(updates.length ? 'Checks reconciliados segun las tomas registradas.' : 'No habia diferencias para reconciliar.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo reconciliar la semana.');
        }
      };
      const hasStockMismatch = stockConsistency.some(row => row.drift !== 0);
      const reconcileExpectedStock = async () => {
        try {
          const patch = {};
          stockConsistency.forEach(row => {
            if(row.drift !== 0) patch[row.field] = Math.max(0, row.expected);
          });
          if(!Object.keys(patch).length) {
            setNotice('El stock ya coincide con lo esperado para la semana visible.');
            setTimeout(() => setNotice(''), 2500);
            return;
          }
          await applyHealthAction({
            patch,
            entry: {
              at: new Date().toISOString(),
              type: 'manual_adjust',
              field: 'weekly_reconcile',
              delta: 0,
              note: `Reconciliacion semanal: ${Object.entries(patch).map(([field,val]) => `${field}=${val}`).join(', ')}`,
              logical_date: weekEndKey
            },
            okMsg: 'Stock alineado con el esperado de la semana visible.'
          });
          setTimeout(() => setNotice(''), 2500);
        } catch (e) {
          setError(e.message || 'No se pudo reconciliar el stock.');
        }
      };
      const showWeeklyMedsRecap = () => {
        const missingDays = weekDiagnostics.map(item => `${item.label}: ${item.text}`).join(' · ');
        const summary = [
          `Semana ${weekStartKey} a ${weekEndKey}.`,
          `Roaccutan: ${weekRoaccutanTakes}/7 tomas reales (${roaccutanAdherencePct}%).`,
          `Cena: ${weekDinnerTakes}/7 tomas reales (${dinnerAdherencePct}%).`,
          hasWeekMismatch ? 'Hay diferencias entre checks y tomas reales.' : 'Checks y tomas reales coinciden.',
          missingDays ? `Dias a revisar: ${missingDays}` : 'No hay dias marcados para revisar.'
        ].join(' ');
        setNotice(summary);
        setTimeout(() => setNotice(''), 7000);
      };
      const panelContent = loading ? html`
        <p style="margin:0;color:#94A3B8;font-size:12px;">Cargando salud...</p>
      ` : html`
        <div style="display:flex;flex-direction:column;gap:12px;">
          <${SectionAccordion}
            icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#F59E0B;display:inline-block;"></span>`}
            title="Inventario y peso"
            isOpen=${healthSectionOpen.inventory}
            onToggle=${()=>setHealthSectionOpen(prev => ({ ...prev, inventory: !prev.inventory }))}
          >
          <div style="padding:12px;display:flex;flex-direction:column;gap:12px;">
          ${low ? html`
            <div style="padding:10px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);margin-bottom:10px;">
              <p style="margin:0;font-size:12px;color:#FCA5A5;font-weight:700;">Reponer: alguno de los stocks esta en 2 o menos.</p>
            </div>
          ` : null}
          <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;margin-bottom:10px;">
            <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;color:#94A3B8;">Peso corporal</p>
            <div style="display:flex;align-items:center;gap:10px;">
              <input 
                type="number" 
                step="0.1"
                placeholder="0.0" 
                value=${bodyWeight}
                onInput=${e => onBodyWeight(e.target.value)}
                style="width:80px;padding:8px;border-radius:8px;border:1px solid #1E2D45;background:rgba(10,15,30,0.6);color:#E2E8F0;font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;"
              />
              <span style="font-size:13px;color:#94A3B8;font-weight:600;">kg</span>
              <p style="margin:0 0 0 auto;font-size:11px;color:#64748b;">Mantené tu registro semanal al día.</p>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${[
              ['roaccutan', 'Roaccutan', stock.roaccutan],
              ['minoxidil_finasteride', 'Minoxidil + Finast.', stock.minoxidil_finasteride]
            ].map(([key, label, count]) => html`
              <div style="padding:12px;border-radius:10px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;">
                <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">${label}</p>
                <p style="margin:0 0 6px;font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:${count <= 2 ? '#FCA5A5' : '#E2E8F0'};">${count}</p>
                <p style="margin:0 0 10px;font-size:11px;color:#64748b;">Blindex: ${Math.ceil(count / 10)} de 10 unidades</p>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button onClick=${()=>adjustStock(key, -1)} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.12);color:#FCA5A5;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;">-1</button>
                  <button onClick=${()=>adjustStock(key, -10)} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#FCD34D;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;">- Blindex</button>
                  <button onClick=${()=>adjustStock(key, +10)} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;">+ Blindex</button>
                </div>
              </div>
            `)}
          </div>
          </div>
          <//>

          <${SectionAccordion}
            icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#10B981;display:inline-block;"></span>`}
            title="Tomas del dia"
            isOpen=${healthSectionOpen.takes}
            onToggle=${()=>setHealthSectionOpen(prev => ({ ...prev, takes: !prev.takes }))}
          >
          <div style="padding:12px;border-radius:10px;background:rgba(15,23,41,0.75);border:1px solid #1E2D45;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
              <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10B981;">Tomas del dia</p>
              <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#94A3B8;">${stock.last_taken_at ? new Date(stock.last_taken_at).toLocaleString('es-AR') : 'Sin registro'}</span>
            </div>
            <p style="margin:0 0 10px;font-size:12px;color:#64748b;">Roaccutan va al mediodia. Minoxidil y Finasteride van con la cena. Si las tomas entre 00:00 y 06:00, cuentan para el dia anterior. Los botones de stock son solo ajustes de inventario; para marcar tomas reales usa los botones de registrar.</p>
            ${todayHealthIssues.length > 0 ? html`
              <div style="margin:0 0 10px;padding:8px 10px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);">
                <p style="margin:0;font-size:12px;color:#FDE68A;">${todayHealthIssues.join(' · ')}</p>
              </div>
            ` : null}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
               <${HealthStatusCard} title="Estado mediodia" status=${statusMeta.roaccutan}/>
               <${HealthStatusCard} title="Estado cena" status=${statusMeta.dinner}/>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;">
                <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;color:#F59E0B;">Mediodia</p>
                <p style="margin:0 0 8px;font-size:12px;color:#CBD5E1;">Roaccutan</p>
                <p style="margin:0 0 8px;font-size:10px;color:#64748b;">Ultimo registro: ${stock.last_roaccutan_at ? new Date(stock.last_roaccutan_at).toLocaleString('es-AR') : 'Sin registro'}</p>
                <button
                  onClick=${registerRoaccutanTake}
                  disabled=${saving || !!todayMedsState.roacuttan}
                  style=${`padding:8px 12px;border-radius:8px;border:none;background:${todayMedsState.roacuttan?'#334155':'#F59E0B'};color:${todayMedsState.roacuttan?'#CBD5E1':'#041018'};font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:${saving || todayMedsState.roacuttan?'not-allowed':'pointer'};letter-spacing:0.05em;opacity:${saving || todayMedsState.roacuttan?'0.8':'1'};`}>
                  ${saving ? 'GUARDANDO...' : todayMedsState.roacuttan ? 'YA REGISTRADO' : 'REGISTRAR ROACCUTAN'}
                </button>
              </div>
              <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;">
                <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;color:#10B981;">Cena</p>
                <p style="margin:0 0 8px;font-size:12px;color:#CBD5E1;">Minoxidil + Finasteride</p>
                <p style="margin:0 0 8px;font-size:10px;color:#64748b;">Ultimo registro: ${stock.last_dinner_meds_at ? new Date(stock.last_dinner_meds_at).toLocaleString('es-AR') : 'Sin registro'}</p>
                <button
                  onClick=${registerDinnerTake}
                  disabled=${saving || dinnerDone}
                  style=${`padding:8px 12px;border-radius:8px;border:none;background:${dinnerDone?'#334155':'#10B981'};color:${dinnerDone?'#CBD5E1':'#041018'};font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:${saving || dinnerDone?'not-allowed':'pointer'};letter-spacing:0.05em;opacity:${saving || dinnerDone?'0.8':'1'};`}>
                  ${saving ? 'GUARDANDO...' : dinnerDone ? `YA REGISTRADO (${dinnerTarget.label.toUpperCase()})` : 'REGISTRAR MEDS CENA'}
                </button>
              </div>
            </div>
          </div>
          <//>

          <${SectionAccordion}
            icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#6366F1;display:inline-block;"></span>`}
            title="Control semanal"
            isOpen=${healthSectionOpen.weekly}
            onToggle=${()=>setHealthSectionOpen(prev => ({ ...prev, weekly: !prev.weekly }))}
          >
          <div style="padding:12px;border-radius:10px;background:rgba(15,23,41,0.75);border:1px solid #1E2D45;">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">
            <div style="padding:8px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;text-align:center;">
              <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;">Semana</p>
              <p style="margin:4px 0 0;font-size:18px;font-family:'JetBrains Mono',monospace;font-weight:700;color:#E2E8F0;">${weekRealTakes.length}</p>
              <p style="margin:2px 0 0;font-size:10px;color:#94A3B8;">Tomas reales</p>
              </div>
              <div style="padding:8px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;text-align:center;">
                <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;">Roaccutan</p>
                <p style="margin:4px 0 0;font-size:18px;font-family:'JetBrains Mono',monospace;font-weight:700;color:#FCD34D;">${weekRoaccutanTakes}</p>
                <p style="margin:2px 0 0;font-size:10px;color:#94A3B8;">Esta semana</p>
              </div>
              <div style="padding:8px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;text-align:center;">
                <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;">Cena</p>
              <p style="margin:4px 0 0;font-size:18px;font-family:'JetBrains Mono',monospace;font-weight:700;color:#86EFAC;">${weekDinnerTakes}</p>
              <p style="margin:2px 0 0;font-size:10px;color:#94A3B8;">Esta semana</p>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin:-2px 0 10px;">
            <button
              onClick=${showWeeklyMedsRecap}
              style="padding:6px 10px;border-radius:999px;border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.12);color:#7DD3FC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
              RECUENTO SEMANAL
            </button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
            ${[
              { label:'Adherencia Roaccutan', pct:roaccutanAdherencePct, detail:`${weekRoaccutanTakes}/7 dias` },
              { label:'Adherencia Cena', pct:dinnerAdherencePct, detail:`${weekDinnerTakes}/7 dias` }
            ].map(({label,pct,detail}) => html`
              <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;">
                <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-bottom:6px;">
                  <div>
                    <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;">${label}</p>
                    <p style="margin:3px 0 0;font-size:10px;color:#94A3B8;">${detail}</p>
                  </div>
                  <p style=${`margin:0;font-size:18px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${adherenceColor(pct)};`}>${pct}%</p>
                </div>
                <div style="width:100%;height:6px;background:#1E2D45;border-radius:999px;overflow:hidden;">
                  <div style=${`width:${pct}%;height:100%;background:${adherenceColor(pct)};border-radius:999px;transition:width 0.4s ease;`}></div>
                </div>
              </div>
            `)}
          </div>
          <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
              <div>
                <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Stock esperado vs real</p>
                <p style="margin:4px 0 0;font-size:10px;color:#94A3B8;">Solo semana visible. Ignora semanas anteriores para simplificar el control.</p>
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                ${hasStockMismatch ? html`
                  <button
                    onClick=${reconcileExpectedStock}
                    style="padding:5px 9px;border-radius:999px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:10px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                    RECONCILIAR STOCK
                  </button>
                ` : null}
                <span style="font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;">${weekStartKey} · ${weekEndKey}</span>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              ${stockConsistency.map(({label,actual,expected,opening,takesDelta,drift,breakdown}) => html`
                <div style="padding:8px;border-radius:8px;background:rgba(15,23,41,0.75);border:1px solid ${drift===0?'rgba(16,185,129,0.25)':'rgba(245,158,11,0.28)'};">
                  <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
                    <div>
                      <p style="margin:0;font-size:10px;text-transform:uppercase;color:#94A3B8;">${label}</p>
                      <p style="margin:4px 0 0;font-size:11px;color:#CBD5E1;">Real: ${actual} · Esperado: ${expected}</p>
                    </div>
                    <span style=${`font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${drift===0?'#86EFAC':'#FCD34D'};`}>
                      ${drift===0 ? 'OK' : drift > 0 ? `+${drift}` : String(drift)}
                    </span>
                  </div>
                  <p style="margin:6px 0 0;font-size:10px;color:#94A3B8;">Inicio: ${opening} · Tomas/checks: ${takesDelta > 0 ? '+' : ''}${takesDelta}</p>
                  <p style="margin:6px 0 0;font-size:10px;color:${drift===0?'#64748B':'#FCD34D'};">
                    ${drift===0 ? 'Sin diferencia manual en esta semana.' : `La diferencia viene de ajustes o reposiciones netas: ${drift > 0 ? '+' : ''}${drift}.`}
                  </p>
                  <p style="margin:6px 0 0;font-size:10px;color:#94A3B8;">
                    ${[
                      breakdown?.restock ? `Reposiciones ${breakdown.restock > 0 ? '+' : ''}${breakdown.restock}` : '',
                      breakdown?.manual ? `Ajustes ${breakdown.manual > 0 ? '+' : ''}${breakdown.manual}` : '',
                      breakdown?.checks ? `Checks ${breakdown.checks > 0 ? '+' : ''}${breakdown.checks}` : ''
                    ].filter(Boolean).join(' · ') || 'Sin movimientos manuales ni checks registrados en la semana.'}
                  </p>
                </div>
              `)}
            </div>
          </div>
          </div>
          <//>
          <${SectionAccordion}
            icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#10B981;display:inline-block;"></span>`}
            title="Consistencia Checks"
            isOpen=${false}
            onToggle=${() => {}}
          >
          <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
              <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Control de consistencia</p>
              ${hasWeekMismatch ? html`
                <button
                  onClick=${reconcileWeekChecks}
                  style="padding:6px 10px;border-radius:8px;border:1px solid rgba(56,189,248,0.35);background:rgba(56,189,248,0.12);color:#7DD3FC;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                  RECONCILIAR
                </button>
              ` : null}
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
              ${weekConsistency.map(({label,checks,takes,diff}) => html`
                <div style="padding:8px;border-radius:8px;background:rgba(15,23,41,0.75);border:1px solid ${diff===0?'rgba(16,185,129,0.25)':'rgba(245,158,11,0.28)'};">
                  <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
                    <div>
                      <p style="margin:0;font-size:10px;text-transform:uppercase;color:#94A3B8;">${label}</p>
                      <p style="margin:4px 0 0;font-size:11px;color:#CBD5E1;">Checks: ${checks} · Tomas: ${takes}</p>
                    </div>
                    <span style=${`font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${diff===0?'#86EFAC':'#FCD34D'};`}>
                      ${diff===0 ? 'OK' : diff > 0 ? `+${diff}` : String(diff)}
                    </span>
                  </div>
                  <p style="margin:6px 0 0;font-size:10px;color:${diff===0?'#64748B':'#FCD34D'};">
                    ${diff===0 ? 'Checks y tomas reales coinciden.' : diff > 0 ? 'Hay mas checks que tomas reales registradas.' : 'Hay mas tomas reales que checks marcados.'}
                  </p>
                </div>
              `)}
            </div>
            ${weekDiagnostics.length > 0 ? html`
              <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
                ${weekDiagnostics.map(issue => html`
                  <div style="padding:8px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.22);display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
                    <span style="font-size:11px;color:#FCD34D;font-weight:700;min-width:38px;">${issue.label}</span>
                    <span style="flex:1;font-size:11px;color:#CBD5E1;">${issue.text}</span>
                    ${typeof onOpenDay === 'function' ? html`
                      <button
                        onClick=${()=>onOpenDay(issue.dateKey)}
                        style="padding:5px 8px;border-radius:999px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.12);color:#C7D2FE;font-size:10px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                        IR AL DIA
                      </button>
                    ` : null}
                  </div>
                `)}
              </div>
            ` : null}
          </div>
          <//>

          <${SectionAccordion}
            icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#A855F7;display:inline-block;"></span>`}
            title="Historial y auditoria"
            isOpen=${healthSectionOpen.history}
            onToggle=${()=>setHealthSectionOpen(prev => ({ ...prev, history: !prev.history }))}
          >
          <div style="padding:12px;display:flex;flex-direction:column;gap:12px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6366F1;">Historial reciente</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
              <${SegmentedPillGroup}
                options=${HEALTH_HISTORY_FILTERS}
                value=${historyFilter}
                onChange=${setHistoryFilter}
                size="10px"
              />
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${historyEntries.length === 0 ? html`
                <p style="margin:0;color:#64748b;font-size:12px;">todavía no hay movimientos guardados.</p>
              ` : historyEntries.map(({ entry, meta }) => html`<${HealthHistoryRow} key=${entry.at} entry=${entry} meta=${meta} editingHistoryAt=${editingHistoryAt} onEdit=${editHistoryEntry} onDelete=${deleteHistoryEntry} />`)}
            </div>
          </div>
          <//>
        </div>
      `;

      return html`
        <div class="fade-up" style="display:flex;flex-direction:column;gap:12px;">
          <${Card}>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
              <div>
                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#F59E0B;">Salud / Blindex</p>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Stock real de medicación, toma diaria y alerta de reposicion.</p>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <button onClick=${exportHealthData} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.12);color:#FCD34D;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                  EXPORTAR
                </button>
                <button class="btn-icon" style="background:#162035;border:1px solid #1E2D45;" onClick=${loadHealth} disabled=${loading}>
                  <${ISync} s=${16}/>
                </button>
              </div>
            </div>
            ${notice ? html`
              <div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);color:#FCD34D;font-size:12px;">${notice}</div>
            ` : null}
            ${error ? html`
              <div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);color:#FCA5A5;font-size:12px;">${error}</div>
            ` : null}
            
            ${panelContent}
          <//>
        </div>
      `;
  };
};
