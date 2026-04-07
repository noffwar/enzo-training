export const createStudyView = ({
  html,
  useState,
  useEffect,
  useCallback,
  supabase,
  STUDY_SUBJECT_SEEDS,
  Card,
  ISync,
  IChevD
}) => {  return function StudyView({session}) {
      const [rows, setRows] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState('');
      const [notice, setNotice] = useState('');
      const [expanded, setExpanded] = useState({});
      const [drafts, setDrafts] = useState({});
      const [savingMap, setSavingMap] = useState({});

      const setSaving = (subject, val) => setSavingMap(prev => ({ ...prev, [subject]: val }));

      const loadStudy = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
          const { data: existing, error: fetchErr } = await supabase
            .from('study_plan')
            .select('id, subject, topics, updated_at')
            .order('subject', { ascending: true });
          if(fetchErr) throw fetchErr;

          const present = new Set((existing || []).map(r => r.subject));
          const missing = STUDY_SUBJECT_SEEDS.filter(s => !present.has(s.subject));
          if(missing.length) {
            const { error: insertErr } = await supabase
              .from('study_plan')
              .insert(missing.map(item => ({
                subject: item.subject,
                topics: item.topics,
                updated_at: new Date().toISOString()
              })));
            if(insertErr && !String(insertErr.message || '').toLowerCase().includes('duplicate')) throw insertErr;
          }

          const { data: refreshed, error: refetchErr } = await supabase
            .from('study_plan')
            .select('id, subject, topics, updated_at')
            .order('subject', { ascending: true });
          if(refetchErr) throw refetchErr;

          setRows(refreshed || []);
          setExpanded(prev => {
            const next = { ...prev };
            (refreshed || []).forEach(r => { if(next[r.subject] == null) next[r.subject] = true; });
            return next;
          });
        } catch(e) {
          setError(e.message || 'No se pudo cargar estudio.');
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        loadStudy();
        const onFocus = () => loadStudy();
        const onVisible = () => { if(document.visibilityState === 'visible') loadStudy(); };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, [loadStudy]);

      const saveSubjectTopics = async (row, nextTopics) => {
        setSaving(row.subject, true);
        setError('');
        try {
          const { data, error } = await supabase
            .from('study_plan')
            .update({ topics: nextTopics, updated_at: new Date().toISOString() })
            .eq('id', row.id)
            .select()
            .single();
          if(error) throw error;
          setRows(prev => prev.map(r => r.id === row.id ? data : r));
        } catch(e) {
          setError(e.message || 'No se pudo guardar el tema.');
        } finally {
          setSaving(row.subject, false);
        }
      };

      const toggleTopic = async (row, idx) => {
        const current = Array.isArray(row.topics) ? row.topics : [];
        const nextTopics = current.map((topic, i) => i === idx ? { ...topic, done: !topic.done } : topic);
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, topics: nextTopics } : r));
        await saveSubjectTopics(row, nextTopics);
      };

      const addTopic = async (row) => {
        const draft = String(drafts[row.subject] || '').trim();
        if(!draft) return;
        const current = Array.isArray(row.topics) ? row.topics : [];
        const nextTopics = [...current, { name: draft, done: false }];
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, topics: nextTopics } : r));
        setDrafts(prev => ({ ...prev, [row.subject]: '' }));
        await saveSubjectTopics(row, nextTopics);
      };

      const removeTopic = async (row, idx) => {
        const current = Array.isArray(row.topics) ? row.topics : [];
        const nextTopics = current.filter((_, i) => i !== idx);
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, topics: nextTopics } : r));
        await saveSubjectTopics(row, nextTopics);
      };

      const sendTopicToTasks = async (row, topic) => {
        setError('');
        setNotice('');
        try {
          const payload = {
            user_id: session.user.id,
            title: `${row.subject}: ${topic.name}`,
            details: `Tema de estudio pendiente de ${row.subject}`,
            priority: 'normal',
            status: 'pending',
            category: 'estudio'
          };
          const { error } = await supabase.from('tasks').insert(payload);
          if(error) throw error;
          setNotice(`Tema enviado a TAREAS: ${topic.name}`);
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo pasar el tema a tareas.');
        }
      };

      const totalSubjects = rows.length;
      const totalTopics = rows.reduce((acc, row) => acc + (Array.isArray(row.topics) ? row.topics.length : 0), 0);
      const completedTopics = rows.reduce((acc, row) => acc + (Array.isArray(row.topics) ? row.topics.filter(t => !!t.done).length : 0), 0);
      const pendingTopics = Math.max(0, totalTopics - completedTopics);
      const completionPct = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;

      return html`
        <div class="fade-up" style="display:flex;flex-direction:column;gap:12px;">
          <${Card}>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
              <div>
                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10B981;">Plan de estudio</p>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Materias UTN con temas y progreso. Todo queda guardado en study_plan.</p>
              </div>
              <button class="btn-icon" style="background:#162035;border:1px solid #1E2D45;" onClick=${loadStudy}>
                <${ISync} s=${16}/>
              </button>
            </div>
            ${notice && html`<div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);color:#86EFAC;font-size:12px;">${notice}</div>`}
            ${error && html`<div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);color:#FCA5A5;font-size:12px;">${error}</div>`}
            ${loading ? html`
              <p style="margin:0;color:#94A3B8;font-size:12px;">Cargando materias...</p>
            ` : html`
              <div style="display:flex;flex-direction:column;gap:10px;">
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                  ${[
                    ['Materias', totalSubjects, '#10B981'],
                    ['Pendientes', pendingTopics, '#F59E0B'],
                    ['Hechos', completedTopics, '#6366F1'],
                    ['Avance', `${completionPct}%`, '#38BDF8']
                  ].map(([label, value, color]) => html`
                    <div style=${`background:rgba(15,23,41,0.75);border:1px solid ${color}33;border-radius:10px;padding:10px;text-align:center;`}>
                      <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">${label}</p>
                      <p style=${`margin:0;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:${color};`}>${value}</p>
                    </div>
                  `)}
                </div>
                ${rows.map(row => {
                  const topics = Array.isArray(row.topics) ? row.topics : [];
                  const done = topics.filter(t => !!t.done).length;
                  const pct = topics.length ? Math.round((done / topics.length) * 100) : 0;
                  return html`
                    <div style="border-radius:12px;border:1px solid #1E2D45;background:rgba(15,23,41,0.7);overflow:hidden;">
                      <button onClick=${()=>setExpanded(prev => ({ ...prev, [row.subject]: !prev[row.subject] }))} style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:transparent;border:none;color:#E2E8F0;cursor:pointer;">
                        <div style="flex:1;text-align:left;">
                          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px;">
                            <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">${row.subject}</p>
                            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${pct===100?'#10B981':pct>0?'#F59E0B':'#64748b'};">${done}/${topics.length} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ${pct}%</span>
                          </div>
                          <div style="height:7px;border-radius:999px;background:#0F1729;border:1px solid #1E2D45;overflow:hidden;">
                            <div style=${`height:100%;width:${pct}%;background:${pct===100?'#10B981':'linear-gradient(90deg,#10B981,#6366F1)'};transition:width 0.2s;`}></div>
                          </div>
                        </div>
                        <${IChevD} s=${18} c=${`chev ${expanded[row.subject]?'open':''}`}/>
                      </button>
                      ${expanded[row.subject] && html`
                        <div style="padding:0 14px 14px;display:flex;flex-direction:column;gap:8px;border-top:1px solid #1E2D45;">
                          <div style="padding-top:10px;display:flex;flex-direction:column;gap:6px;">
                            ${topics.length === 0 ? html`
                              <p style="margin:0;color:#64748b;font-size:12px;">Todavia no hay temas cargados.</p>
                            ` : topics.map((topic, idx) => html`
                              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(8,13,26,0.5);padding:8px 10px;border-radius:8px;border:1px solid #1E2D45;">
                                <label style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer;">
                                  <input type="checkbox" checked=${!!topic.done} onChange=${()=>toggleTopic(row, idx)} />
                                  <span style=${`font-size:13px;color:${topic.done?'#64748b':'#E2E8F0'};text-decoration:${topic.done?'line-through':'none'};`}>${topic.name}</span>
                                </label>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
                                  ${!topic.done && html`
                                    <button onClick=${()=>sendTopicToTasks(row, topic)} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                                      PASAR A TAREA
                                    </button>
                                  `}
                                  <button onClick=${()=>removeTopic(row, idx)} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.12);color:#FCA5A5;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                                    BORRAR
                                  </button>
                                </div>
                              </div>
                            `)}
                          </div>
                          <div style="display:flex;gap:8px;align-items:center;">
                            <input class="inp" style="flex:1;" value=${drafts[row.subject] || ''} onInput=${e=>setDrafts(prev => ({ ...prev, [row.subject]: e.target.value }))} placeholder="Agregar tema nuevo..." />
                            <button onClick=${()=>addTopic(row)} style="padding:8px 12px;border-radius:8px;border:none;background:#10B981;color:#041018;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                              ${savingMap[row.subject] ? 'GUARDANDO...' : 'AGREGAR'}
                            </button>
                          </div>
                        </div>
                      `}
                    </div>
                  `;
                })}
              </div>
            `}
          <//>
        </div>
      `;
    };

    const BOOK_DEFAULT = {
      title: 'El Duelo',
      author: 'Gabriel Rolon',
      current_page: 122,
      total_pages: 450
    };
    const SERIES_DEFAULT = {
      title: 'Sin serie',
      season: 1,
      episode: 1,
      episodes_total: 10
    };
    const MEDS_STOCK_KEY = 'enzo_meds_stock_v1';
    const MEDS_STOCK_DEFAULT = {
      roaccutan: 10,
      minoxidil_finasteride: 5,
      last_taken_at: '',
      last_roaccutan_at: '',
      last_dinner_meds_at: '',
      last_dinner_logical_date: '',
      history: [],
      _updatedAt: ''
    };
    const HEALTH_HISTORY_FILTERS = [
      ['all','Todo'],
      ['takes','Tomas'],
      ['checks','Checks'],
      ['adjustments','Ajustes']
    ];
    const OCIO_NOTE_FILTER_OPTIONS = [
      ['all','TODO'],
      ['notes','NOTAS'],
      ['ai','IA']
    ];
    const HEALTH_ENTRY_META = {
      roaccutan_take: {
        badge: 'TOMA',
        color:'#86EFAC',
        bg:'rgba(16,185,129,0.12)',
        border:'rgba(16,185,129,0.35)',
        describe: () => 'Toma mediodia: -1 Roaccutan'
      },
      dinner_combo_take: {
        badge: 'TOMA',
        color:'#86EFAC',
        bg:'rgba(16,185,129,0.12)',
        border:'rgba(16,185,129,0.35)',
        describe: () => 'Toma cena: -1 Minoxidil/Finasteride'
      },
      habit_toggle: {
        badge: 'CHECK',
        color:'#C7D2FE',
        bg:'rgba(99,102,241,0.12)',
        border:'rgba(99,102,241,0.35)',
        describe: (entry) => `Check diario: ${entry.med === 'roacuttan'
          ? `Roaccutan ${entry.delta_roaccutan > 0 ? '+' : ''}${entry.delta_roaccutan}`
          : `Combo noche ${entry.delta_combo > 0 ? '+' : ''}${entry.delta_combo}`}`
      },
      restock: {
        badge: 'REPOSICION',
        color:'#FCD34D',
        bg:'rgba(245,158,11,0.12)',
        border:'rgba(245,158,11,0.35)',
        describe: (entry) => `Reposicion: ${entry.field === 'roaccutan' ? 'Roaccutan' : 'Minoxidil/Finasteride'} +${entry.delta}`
      },
      manual_adjust: {
        badge: 'AJUSTE',
        color:'#FCA5A5',
        bg:'rgba(239,68,68,0.12)',
        border:'rgba(239,68,68,0.35)',
        describe: (entry) => `Ajuste: ${entry.field === 'roaccutan' ? 'Roaccutan' : 'Minoxidil/Finasteride'} ${entry.delta}`
      }
    };
    const getHealthEntryMeta = (entry) => {
      const fallback = {
        badge:'AJUSTE',
        color:'#FCA5A5',
        bg:'rgba(239,68,68,0.12)',
        border:'rgba(239,68,68,0.35)',
        describe: (row) => row?.note || 'Movimiento manual'
      };
      const meta = HEALTH_ENTRY_META[entry?.type] || fallback;
      return {
        ...meta,
        text: meta.describe(entry)
      };
};
