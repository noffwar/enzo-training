export const createBooksView = ({
  html,
  useState,
  useEffect,
  useCallback,
  supabase,
  BOOK_DEFAULT,
  SERIES_DEFAULT,
  OCIO_NOTE_FILTER_OPTIONS,
  MEDS_STOCK_DEFAULT,
  MEDS_STOCK_KEY,
  READING_PROGRESS_KEY,
  pn,
  fetchJsonWithTimeout,
  Card,
  SectionAccordion,
  ISync
}) => {

  const SegmentedPillGroup = ({options, value, onChange}) => html`
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${options.map(([val, label]) => html`
        <button onClick=${()=>onChange(val)} style=${`padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid ${value===val?'rgba(99,102,241,0.5)':'#1E2D45'};background:${value===val?'rgba(99,102,241,0.15)':'rgba(15,23,41,0.6)'};color:${value===val?'#A5B4FC':'#64748B'};`}>
          ${label}
        </button>
      `)}
    </div>
  `;

  const OcioNoteEntry = ({ metaLabel, text, collapsed, onToggle, onDelete, onTask }) => html`
    <div style="padding:10px;border-radius:10px;background:rgba(15,23,41,0.75);border:1px solid #1E2D45;">
      <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onClick=${onToggle}>
        <span style="font-size:11px;font-weight:700;color:#94A3B8;">${metaLabel}</span>
        <span style="color:#64748B;">${collapsed ? '+' : '-'}</span>
      </div>
      ${!collapsed && html`
        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #1E2D45;">
          <p style="margin:0 0 10px;font-size:12px;color:#E2E8F0;white-space:pre-wrap;">${text}</p>
          <div style="display:flex;gap:8px;">
            <button onClick=${onDelete} style="padding:4px 8px;border-radius:6px;border:none;background:rgba(239,68,68,0.15);color:#FCA5A5;font-size:10px;font-weight:700;cursor:pointer;">BORRAR</button>
            ${onTask && html`<button onClick=${onTask} style="padding:4px 8px;border-radius:6px;border:none;background:rgba(16,185,129,0.15);color:#86EFAC;font-size:10px;font-weight:700;cursor:pointer;">A TAREA</button>`}
          </div>
        </div>
      `}
    </div>
  `;

  return function BooksView({session}) {
      const [book, setBook] = useState(BOOK_DEFAULT);
      const [series, setSeries] = useState(SERIES_DEFAULT);
      const [notes, setNotes] = useState([]);
      const [seriesNotes, setSeriesNotes] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState('');
      const [notice, setNotice] = useState('');
      const [saving, setSaving] = useState(false);
      const [noteDraft, setNoteDraft] = useState('');
      const [seriesNoteDraft, setSeriesNoteDraft] = useState('');
      const [collapsedBookNotes, setCollapsedBookNotes] = useState({});
      const [collapsedSeriesNotes, setCollapsedSeriesNotes] = useState({});
      const [bookNotesFilter, setBookNotesFilter] = useState('all');
      const [seriesNotesFilter, setSeriesNotesFilter] = useState('all');
      const [ocioSectionOpen, setOcioSectionOpen] = useState({
        series: true,
        bookNotes: true
      });
      const [pomodoroActive, setPomodoroActive] = useState(false);
      const [pomodoroLeft, setPomodoroLeft] = useState(25 * 60);

      const loadBooks = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
          const [{ data: invRows, error: invErr }, { data: noteRows, error: notesErr }] = await Promise.all([
            supabase.from('app_inventory').select('key,data').in('key', ['reading_progress', 'watching_progress']),
            supabase.from('book_notes').select('id, book_title, current_page, question, answer, kind, created_at').order('created_at', { ascending:false }).limit(20)
          ]);
          if(invErr) throw invErr;
          if(notesErr) throw notesErr;
          const inventory = Object.fromEntries((invRows || []).map(row => [row.key, row.data || {}]));
          const nextBook = { ...BOOK_DEFAULT, ...(inventory.reading_progress || {}) };
          const nextSeries = { ...SERIES_DEFAULT, ...(inventory.watching_progress || {}) };
          setBook(nextBook);
          setSeries(nextSeries);
          const activeTitle = String(nextBook.title || BOOK_DEFAULT.title).trim().toLowerCase();
          const activeSeriesTitle = `series::${String(nextSeries.title || SERIES_DEFAULT.title).trim().toLowerCase()}`;
          setNotes((noteRows || []).filter(note => String(note.book_title || '').trim().toLowerCase() === activeTitle));
          setSeriesNotes((noteRows || []).filter(note => String(note.book_title || '').trim().toLowerCase() === activeSeriesTitle));
        } catch(e) {
          setError(e.message || 'No se pudo cargar Libros.');
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        loadBooks();
      }, [loadBooks]);

      useEffect(() => {
        if(!pomodoroActive) return;
        const id = setInterval(() => {
          setPomodoroLeft(prev => {
            if(prev <= 1) {
              clearInterval(id);
              setPomodoroActive(false);
              setNotice('Pomodoro de lectura terminado.');
              setTimeout(() => setNotice(''), 2500);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(id);
      }, [pomodoroActive]);

      const saveBook = async (nextBook) => {
        setSaving(true);
        setError('');
        try {
          const totalPages = Math.max(1, parseInt(nextBook.total_pages || 1, 10) || 1);
          const currentPage = Math.min(totalPages, Math.max(0, parseInt(nextBook.current_page || 0, 10) || 0));
          const payload = {
            ...nextBook,
            current_page: currentPage,
            total_pages: totalPages
          };
          const { error } = await supabase
            .from('app_inventory')
            .upsert({
              key: 'reading_progress',
              data: payload,
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
          if(error) throw error;
          localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(payload));
          window.dispatchEvent(new CustomEvent('enzo-books-changed', { detail: payload }));
          setBook(payload);
          setNotice('Progreso de lectura guardado.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo guardar el progreso del libro.');
        } finally {
          setSaving(false);
        }
      };

      const saveSeries = async (nextSeries) => {
        setSaving(true);
        setError('');
        try {
          const totalEpisodes = Math.max(1, parseInt(nextSeries.episodes_total || 1, 10) || 1);
          const currentSeason = Math.max(1, parseInt(nextSeries.season || 1, 10) || 1);
          const currentEpisode = Math.min(totalEpisodes, Math.max(1, parseInt(nextSeries.episode || 1, 10) || 1));
          const payload = {
            ...nextSeries,
            season: currentSeason,
            episode: currentEpisode,
            episodes_total: totalEpisodes
          };
          const { error } = await supabase
            .from('app_inventory')
            .upsert({
              key: 'watching_progress',
              data: payload,
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
          if(error) throw error;
          setSeries(payload);
          setNotice('Progreso de serie guardado.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo guardar el progreso de la serie.');
        } finally {
          setSaving(false);
        }
      };

      const addBookNote = async () => {
        const text = String(noteDraft || '').trim();
        if(!text) return;
        setError('');
        try {
          const payload = {
            book_title: book.title || BOOK_DEFAULT.title,
            current_page: Math.max(1, parseInt(book.current_page || 1, 10) || 1),
            question: text,
            answer: '',
            kind: 'note'
          };
          const { data, error } = await supabase.from('book_notes').insert(payload).select().single();
          if(error) throw error;
          setNotes(prev => [data, ...prev]);
          setNoteDraft('');
          setNotice('Nota del libro guardada.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo guardar la nota.');
        }
      };

      const addSeriesNote = async () => {
        const text = String(seriesNoteDraft || '').trim();
        if(!text) return;
        setError('');
        try {
          const payload = {
            book_title: `SERIES::${series.title || SERIES_DEFAULT.title}`,
            current_page: Math.max(1, parseInt(series.episode || 1, 10) || 1),
            question: `[T${Math.max(1, parseInt(series.season || 1, 10) || 1)}E${Math.max(1, parseInt(series.episode || 1, 10) || 1)}] ${text}`,
            answer: '',
            kind: 'series-note'
          };
          const { data, error } = await supabase.from('book_notes').insert(payload).select().single();
          if(error) throw error;
          setSeriesNotes(prev => [data, ...prev]);
          setSeriesNoteDraft('');
          setNotice('Nota de la serie guardada.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo guardar la nota de la serie.');
        }
      };

      const deleteBookNote = async (id) => {
        setError('');
        try {
          const { error } = await supabase.from('book_notes').delete().eq('id', id);
          if(error) throw error;
          setNotes(prev => prev.filter(n => n.id !== id));
          setSeriesNotes(prev => prev.filter(n => n.id !== id));
        } catch(e) {
          setError(e.message || 'No se pudo borrar la nota.');
        }
      };

      const formatPomodoro = (sec) => {
        const m = Math.floor(sec/60), s = sec%60;
        return `${m}:${s<10?'0':''}${s}`;
      };

      return html`
        <div style="display:flex;flex-direction:column;gap:16px;animation: fadeIn 0.4s ease-out;">
          ${notice && html`<div style="position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:100;background:#10B981;color:white;padding:10px 20px;border-radius:12px;font-weight:800;box-shadow:0 4px 15px rgba(16,185,129,0.4);">${notice}</div>`}
          ${error && html`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);padding:12px;border-radius:12px;color:#FCA5A5;font-size:13px;font-weight:600;">${error}</div>`}

          <${Card} title="Lectura Actual" icon="📖">
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div class="glass-card" style="padding:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <h3 style="margin:0;font-size:18px;color:#fff;font-family:'Barlow Condensed',sans-serif;">${book.title || 'Sin título'}</h3>
                  <button onClick=${()=>setPomodoroActive(!pomodoroActive)} style=${`padding:6px 12px;border-radius:8px;border:none;background:${pomodoroActive?'rgba(239,68,68,0.2)':'rgba(56,189,248,0.2)'};color:${pomodoroActive?'#FCA5A5':'#7DD3FC'};font-size:11px;font-weight:800;cursor:pointer;`}>
                    ${pomodoroActive ? `PARAR (${formatPomodoro(pomodoroLeft)})` : 'POMODORO 25\''}
                  </button>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  <div>
                    <label style="display:block;font-size:10px;color:#94A3B8;text-transform:uppercase;margin-bottom:4px;">Página Actual</label>
                    <input type="number" class="inp" value=${book.current_page} onChange=${e=>saveBook({...book, current_page: e.target.value})} />
                  </div>
                  <div>
                    <label style="display:block;font-size:10px;color:#94A3B8;text-transform:uppercase;margin-bottom:4px;">Total Páginas</label>
                    <input type="number" class="inp" value=${book.total_pages} onChange=${e=>saveBook({...book, total_pages: e.target.value})} />
                  </div>
                </div>

                <div style="margin-top:16px;">
                  <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
                    <div style=${`height:100%;width:${Math.round((pn(book.current_page)/Math.max(1,pn(book.total_pages)))*100)}%;background:linear-gradient(90deg,#38BDF8,#6366F1);`}></div>
                  </div>
                  <p style="margin:8px 0 0;font-size:11px;color:#94A3B8;text-align:right;">${Math.round((pn(book.current_page)/Math.max(1,pn(book.total_pages)))*100)}% leído</p>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:8px;">
                <textarea class="inp" style="min-height:80px;font-size:13px;" placeholder="¿Qué aprendiste o te llamó la atención hoy?" value=${noteDraft} onInput=${e=>setNoteDraft(e.target.value)}></textarea>
                <button onClick=${addBookNote} disabled=${saving || !noteDraft.trim()} class="btn-primary" style="width:100%;">GUARDAR NOTA</button>
              </div>
            </div>
          <//>

          <${SectionAccordion} title="Notas de Lectura" open=${ocioSectionOpen.bookNotes} onToggle=${()=>setOcioSectionOpen({...ocioSectionOpen, bookNotes: !ocioSectionOpen.bookNotes})}>
             <div style="display:flex;flex-direction:column;gap:10px;">
               <${SegmentedPillGroup} options=${OCIO_NOTE_FILTER_OPTIONS} value=${bookNotesFilter} onChange=${setBookNotesFilter} />
               ${notes.length === 0 ? html`<p style="text-align:center;color:#64748B;padding:20px;font-size:13px;">No hay notas para este libro aún.</p>` : 
                 notes.map(n => html`<${OcioNoteEntry} metaLabel=${`Pág ${n.current_page}`} text=${n.question} collapsed=${collapsedBookNotes[n.id]} onToggle=${()=>setCollapsedBookNotes({...collapsedBookNotes, [n.id]: !collapsedBookNotes[n.id]})} onDelete=${()=>deleteBookNote(n.id)} />`)
               }
             </div>
          <//>

          <${Card} title="Series y Ocio" icon="📺">
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div class="glass-card" style="padding:16px;">
                <h3 style="margin:0 0 12px;font-size:18px;color:#fff;font-family:'Barlow Condensed',sans-serif;">${series.title || 'Sin serie'}</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                  <div>
                    <label style="display:block;font-size:10px;color:#94A3B8;text-transform:uppercase;margin-bottom:4px;">Temporada</label>
                    <input type="number" class="inp" value=${series.season} onChange=${e=>saveSeries({...series, season: e.target.value})} />
                  </div>
                  <div>
                    <label style="display:block;font-size:10px;color:#94A3B8;text-transform:uppercase;margin-bottom:4px;">Episodio</label>
                    <input type="number" class="inp" value=${series.episode} onChange=${e=>saveSeries({...series, episode: e.target.value})} />
                  </div>
                   <div>
                    <label style="display:block;font-size:10px;color:#94A3B8;text-transform:uppercase;margin-bottom:4px;">Total Epis.</label>
                    <input type="number" class="inp" value=${series.episodes_total} onChange=${e=>saveSeries({...series, episodes_total: e.target.value})} />
                  </div>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:8px;">
                <textarea class="inp" style="min-height:60px;font-size:13px;" placeholder="Notas sobre la serie..." value=${seriesNoteDraft} onInput=${e=>setSeriesNoteDraft(e.target.value)}></textarea>
                <button onClick=${addSeriesNote} disabled=${saving || !seriesNoteDraft.trim()} class="btn-primary" style="width:100%;background:linear-gradient(135deg,#6366F1,#818CF8);">GUARDAR NOTA SERIE</button>
              </div>
            </div>
          <//>

          <${SectionAccordion} title="Historial de Ocio" open=${ocioSectionOpen.series} onToggle=${()=>setOcioSectionOpen({...ocioSectionOpen, series: !ocioSectionOpen.series})}>
             <div style="display:flex;flex-direction:column;gap:10px;">
               ${seriesNotes.length === 0 ? html`<p style="text-align:center;color:#64748B;padding:20px;font-size:13px;">Sin historial de series.</p>` : 
                 seriesNotes.map(n => html`<${OcioNoteEntry} metaLabel=${n.book_title} text=${n.question} collapsed=${collapsedSeriesNotes[n.id]} onToggle=${()=>setCollapsedSeriesNotes({...collapsedSeriesNotes, [n.id]: !collapsedSeriesNotes[n.id]})} onDelete=${()=>deleteBookNote(n.id)} />`)
               }
             </div>
          <//>
        </div>
      `;
  };
};
