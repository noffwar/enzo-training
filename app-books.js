export const createBooksView = ({
  html,
  useState,
  useEffect,
  useCallback,
  supabase,
  BOOK_DEFAULT,
  SERIES_DEFAULT,
  OCIO_NOTE_FILTER_OPTIONS,
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
      const [chatDraft, setChatDraft] = useState('');
      const [seriesChatDraft, setSeriesChatDraft] = useState('');
      const [collapsedBookNotes, setCollapsedBookNotes] = useState({});
      const [collapsedSeriesNotes, setCollapsedSeriesNotes] = useState({});
      const [allBookNotesCollapsed, setAllBookNotesCollapsed] = useState(false);
      const [allSeriesNotesCollapsed, setAllSeriesNotesCollapsed] = useState(false);
      const [bookNotesFilter, setBookNotesFilter] = useState('all');
      const [seriesNotesFilter, setSeriesNotesFilter] = useState('all');
      const [ocioSectionOpen, setOcioSectionOpen] = useState({
        series: true,
        bookNotes: true
      });
      const [chatLoading, setChatLoading] = useState(false);
      const [seriesChatLoading, setSeriesChatLoading] = useState(false);
      const [summaryLoading, setSummaryLoading] = useState(false);
      const [notesSummaryLoading, setNotesSummaryLoading] = useState(false);
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
        const onFocus = () => loadBooks();
        const onVisible = () => { if(document.visibilityState === 'visible') loadBooks(); };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisible);
        };
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
          window.haptic?.('light');
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
          window.haptic?.('light');
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
          window.haptic?.('light');
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
          window.haptic?.('light');
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

      const passBookDraftToTask = async () => {
        const text = String(noteDraft || '').trim();
        if(!text) return;
        setError('');
        try {
          const snippet = text.length > 56 ? `${text.slice(0, 56)}...` : text;
          const payload = {
            user_id: session.user.id,
            title: `Lectura - ${book.title || BOOK_DEFAULT.title}: ${snippet || 'nota'}`,
            details: text,
            priority: 'normal',
            status: 'pending',
            category: 'estudio',
            due_at: null,
            auto_email_reminder: false
          };
          const { error } = await supabase.from('tasks').insert(payload);
          if(error) throw error;
          setNoteDraft('');
          setNotice('Borrador pasado a TAREAS.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo pasar el borrador a TAREAS.');
        }
      };

      const deleteBookNote = async (id) => {
        setError('');
        try {
          const { error } = await supabase.from('book_notes').delete().eq('id', id);
          if(error) throw error;
          setNotes(prev => prev.filter(n => n.id !== id));
          setCollapsedBookNotes(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        } catch(e) {
          setError(e.message || 'No se pudo borrar la nota.');
        }
      };

      const deleteSeriesNote = async (id) => {
        setError('');
        try {
          const { error } = await supabase.from('book_notes').delete().eq('id', id);
          if(error) throw error;
          setSeriesNotes(prev => prev.filter(n => n.id !== id));
          setCollapsedSeriesNotes(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        } catch(e) {
          setError(e.message || 'No se pudo borrar la nota de la serie.');
        }
      };

      const toggleBookNoteCollapsed = (id) => {
        setCollapsedBookNotes(prev => ({ ...prev, [id]: !prev[id] }));
      };

      const toggleSeriesNoteCollapsed = (id) => {
        setCollapsedSeriesNotes(prev => ({ ...prev, [id]: !prev[id] }));
      };

      const toggleAllBookNotes = () => {
        const nextCollapsed = !allBookNotesCollapsed;
        setAllBookNotesCollapsed(nextCollapsed);
        setCollapsedBookNotes(
          Object.fromEntries((notes || []).map(note => [note.id, nextCollapsed]))
        );
      };

      const toggleAllSeriesNotes = () => {
        const nextCollapsed = !allSeriesNotesCollapsed;
        setAllSeriesNotesCollapsed(nextCollapsed);
        setCollapsedSeriesNotes(
          Object.fromEntries((seriesNotes || []).map(note => [note.id, nextCollapsed]))
        );
      };

      const passBookNoteToTask = async (note) => {
        setError('');
        try {
          const text = String(note.answer || note.question || '').trim();
          const snippet = text.length > 56 ? `${text.slice(0, 56)}...` : text;
          const payload = {
            user_id: session.user.id,
            title: `Lectura - ${book.title || BOOK_DEFAULT.title}: ${snippet || 'nota'}`,
            details: text || 'Nota del modulo LIBROS',
            priority: 'normal',
            status: 'pending',
            category: 'estudio',
            due_at: null,
            auto_email_reminder: false
          };
          const { error } = await supabase.from('tasks').insert(payload);
          if(error) throw error;
          setNotice('Nota pasada a TAREAS.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo pasar la nota a TAREAS.');
        }
      };

      const exportBookNotes = () => {
        try {
          const payload = {
            app: 'enzo-training-books',
            exported_at: new Date().toISOString(),
            book,
            notes
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `libros-${String(book.title || 'sin-titulo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'notas'}-${new Date().toISOString().slice(0,10)}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setNotice('Notas del libro exportadas.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudieron exportar las notas del libro.');
        }
      };

      const askBookAi = async () => {
        const question = String(chatDraft || '').trim();
        if(!question) return;
        setChatLoading(true);
        setError('');
        try {
          const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/book-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: book.title || BOOK_DEFAULT.title,
              author: book.author || BOOK_DEFAULT.author,
              current_page: Math.max(1, parseInt(book.current_page || 1, 10) || 1),
              question
            })
          });
          if(!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

          const payload = {
            book_title: book.title || BOOK_DEFAULT.title,
            current_page: Math.max(1, parseInt(book.current_page || 1, 10) || 1),
            question,
            answer: data.reply || '',
            kind: 'qa'
          };
          const { data: saved, error } = await supabase.from('book_notes').insert(payload).select().single();
          if(error) throw error;
          setNotes(prev => [saved, ...prev]);
          setChatDraft('');
          setNotice('Respuesta guardada en LIBROS.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo consultar a Gemini.');
        } finally {
          setChatLoading(false);
        }
      };

      const askSeriesAi = async () => {
        const question = String(seriesChatDraft || '').trim();
        if(!question) return;
        setSeriesChatLoading(true);
        setError('');
        try {
          const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/series-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: series.title || SERIES_DEFAULT.title,
              season: Math.max(1, parseInt(series.season || 1, 10) || 1),
              episode: Math.max(1, parseInt(series.episode || 1, 10) || 1),
              question
            })
          });
          if(!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

          const payload = {
            book_title: `SERIES::${series.title || SERIES_DEFAULT.title}`,
            current_page: Math.max(1, parseInt(series.episode || 1, 10) || 1),
            question: `[T${Math.max(1, parseInt(series.season || 1, 10) || 1)}E${Math.max(1, parseInt(series.episode || 1, 10) || 1)}] ${question}`,
            answer: data.reply || '',
            kind: 'series-qa'
          };
          const { data: saved, error } = await supabase.from('book_notes').insert(payload).select().single();
          if(error) throw error;
          setSeriesNotes(prev => [saved, ...prev]);
          setSeriesChatDraft('');
          setNotice('Respuesta guardada en SERIES.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo consultar la serie en Gemini.');
        } finally {
          setSeriesChatLoading(false);
        }
      };

      const summarizeBookSafe = async () => {
        setSummaryLoading(true);
        setError('');
        try {
          window.haptic?.('medium');
          const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/book-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: book.title || BOOK_DEFAULT.title,
              author: book.author || BOOK_DEFAULT.author,
              current_page: Math.max(1, parseInt(book.current_page || 1, 10) || 1)
            })
          });
          if(!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

          const payload = {
            book_title: book.title || BOOK_DEFAULT.title,
            current_page: Math.max(1, parseInt(book.current_page || 1, 10) || 1),
            question: 'Resumen seguro de lo leido',
            answer: data.reply || '',
            kind: 'summary'
          };
          const { data: saved, error } = await supabase.from('book_notes').insert(payload).select().single();
          if(error) throw error;
          window.haptic?.('success');
          setNotes(prev => [saved, ...prev]);
          setNotice('Resumen seguro guardado en LIBROS.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo generar el resumen seguro.');
        } finally {
          setSummaryLoading(false);
        }
      };

      const summarizeUserNotes = async () => {
        const myNotes = notes.filter(n => n.kind === 'note');
        if(myNotes.length === 0) {
          setError('No tienes notas propias para resumir todavia.');
          return;
        }
        setNotesSummaryLoading(true);
        setError('');
        try {
          window.haptic?.('medium');
          const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/notes-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: book.title || BOOK_DEFAULT.title,
              author: book.author || BOOK_DEFAULT.author,
              notes: myNotes
            })
          });
          if(!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

          const payload = {
            book_title: book.title || BOOK_DEFAULT.title,
            current_page: Math.max(1, parseInt(book.current_page || 1, 10) || 1),
            question: 'Resumen inteligente de mis aprendizajes',
            answer: data.reply || '',
            kind: 'summary'
          };
          const { data: saved, error } = await supabase.from('book_notes').insert(payload).select().single();
          if(error) throw error;
          window.haptic?.('success');
          setNotes(prev => [saved, ...prev]);
          setNotice('Resumen de tus notas guardado.');
          setTimeout(() => setNotice(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo resumir tus notas.');
        } finally {
          setNotesSummaryLoading(false);
        }
      };

      const pct = Math.max(0, Math.min(100, Math.round(((parseInt(book.current_page || 0,10) || 0) / Math.max(1, parseInt(book.total_pages || 1,10) || 1)) * 100)));
      const seriesPct = Math.max(0, Math.min(100, Math.round(((parseInt(series.episode || 0,10) || 0) / Math.max(1, parseInt(series.episodes_total || 1,10) || 1)) * 100)));
      const fmtPomodoro = `${String(Math.floor(pomodoroLeft / 60)).padStart(2,'0')}:${String(pomodoroLeft % 60).padStart(2,'0')}`;
      const filteredBookNotes = notes.filter(note => {
        if(bookNotesFilter === 'all') return true;
        if(bookNotesFilter === 'notes') return note.kind === 'note';
        return note.kind !== 'note';
      });
      const filteredSeriesNotes = seriesNotes.filter(note => {
        if(seriesNotesFilter === 'all') return true;
        if(seriesNotesFilter === 'notes') return note.kind === 'series-note';
        return note.kind !== 'series-note';
      });
      const seriesNoteEntries = filteredSeriesNotes.map(note => ({
        note,
        metaLabel: `${note.book_title} - ep ${note.current_page}`,
        text: note.answer || note.question || '',
        collapsed: !!collapsedSeriesNotes[note.id]
      }));
      const bookNoteEntries = filteredBookNotes.map(note => ({
        note,
        metaLabel: `${note.book_title} - pag ${note.current_page}`,
        text: note.question || note.answer || '',
        collapsed: !!collapsedBookNotes[note.id]
      }));

      return html`
        <div class="fade-up" style="display:flex;flex-direction:column;gap:12px;">
          <${Card}>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
              <div>
                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#38BDF8;">Lectura</p>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Progreso del libro actual, pomodoro y notas de lectura.</p>
              </div>
              <button class="btn-icon" style="background:#162035;border:1px solid #1E2D45;" onClick=${loadBooks}>
                <${ISync} s=${16}/>
              </button>
            </div>
            ${notice && html`<div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);color:#7DD3FC;font-size:12px;">${notice}</div>`}
            ${error && html`<div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);color:#FCA5A5;font-size:12px;">${error}</div>`}
            ${loading ? html`
              <p style="margin:0;color:#94A3B8;font-size:12px;">Cargando libro...</p>
            ` : html`
              <div style="display:flex;flex-direction:column;gap:12px;">
                <div style="padding:12px;border-radius:10px;background:rgba(15,23,41,0.75);border:1px solid #1E2D45;">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                    <input class="inp" value=${book.title || ''} onInput=${e=>setBook(prev => ({ ...prev, title:e.target.value }))} placeholder="Titulo" />
                    <input class="inp" value=${book.author || ''} onInput=${e=>setBook(prev => ({ ...prev, author:e.target.value }))} placeholder="Autor" />
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                    <input class="inp" value=${book.current_page || ''} onInput=${e=>setBook(prev => ({ ...prev, current_page:e.target.value }))} placeholder="Pagina actual" />
                    <input class="inp" value=${book.total_pages || ''} onInput=${e=>setBook(prev => ({ ...prev, total_pages:e.target.value }))} placeholder="Paginas totales" />
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span style="font-size:11px;color:#94A3B8;">Progreso</span>
                    <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#38BDF8;">${pct}%</span>
                  </div>
                  <div style="height:8px;border-radius:999px;background:#0F1729;border:1px solid #1E2D45;overflow:hidden;margin-bottom:10px;">
                    <div style=${`height:100%;width:${pct}%;background:linear-gradient(90deg,#38BDF8,#6366F1);transition:width 0.2s;`}></div>
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button onClick=${()=>saveBook(book)} style="padding:8px 12px;border-radius:8px;border:none;background:#38BDF8;color:#041018;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                      ${saving ? 'GUARDANDO...' : 'GUARDAR PROGRESO'}
                    </button>
                    <button onClick=${summarizeBookSafe} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.12);color:#BAE6FD;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                      ${summaryLoading ? 'RESUMIENDO...' : 'RESUMEN SEGURO'}
                    </button>
                    <button onClick=${summarizeUserNotes} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.1);color:#10B981;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                      ${notesSummaryLoading ? 'ANALIZANDO...' : 'RESUMIR MIS NOTAS'}
                    </button>
                    <button onClick=${exportBookNotes} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.35);background:rgba(148,163,184,0.12);color:#CBD5E1;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                      EXPORTAR NOTAS
                    </button>
                  </div>
                </div>

                <${SectionAccordion}
                  icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#6366F1;display:inline-block;"></span>`}
                  title="Serie actual"
                  isOpen=${ocioSectionOpen.series}
                  onToggle=${()=>setOcioSectionOpen(prev => ({ ...prev, series: !prev.series }))}
                >
                <div style="padding:12px;border-radius:10px;background:rgba(15,23,41,0.75);border:1px solid #1E2D45;">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
                    <div>
                      <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#A78BFA;">Serie actual</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Seguimiento y chat anti-spoiler hasta el episodio actual.</p>
                    </div>
                  </div>
                  <div style="display:grid;grid-template-columns:1.4fr 0.8fr 0.8fr 0.8fr;gap:8px;margin-bottom:8px;">
                    <input class="inp" value=${series.title || ''} onInput=${e=>setSeries(prev => ({ ...prev, title:e.target.value }))} placeholder="Serie" />
                    <input class="inp" value=${series.season || ''} onInput=${e=>setSeries(prev => ({ ...prev, season:e.target.value }))} placeholder="Temporada" />
                    <input class="inp" value=${series.episode || ''} onInput=${e=>setSeries(prev => ({ ...prev, episode:e.target.value }))} placeholder="Episodio" />
                    <input class="inp" value=${series.episodes_total || ''} onInput=${e=>setSeries(prev => ({ ...prev, episodes_total:e.target.value }))} placeholder="Total" />
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span style="font-size:11px;color:#94A3B8;">Progreso serie</span>
                    <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#C4B5FD;">${seriesPct}%</span>
                  </div>
                  <div style="height:8px;border-radius:999px;background:#0F1729;border:1px solid #1E2D45;overflow:hidden;margin-bottom:10px;">
                    <div style=${`height:100%;width:${seriesPct}%;background:linear-gradient(90deg,#A78BFA,#6366F1);transition:width 0.2s;`}></div>
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                    <button onClick=${()=>saveSeries(series)} style="padding:8px 12px;border-radius:8px;border:none;background:#A78BFA;color:#041018;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                      ${saving ? 'GUARDANDO...' : 'GUARDAR SERIE'}
                    </button>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;">
                      <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;color:#10B981;">Notas de la serie</p>
                      <textarea value=${seriesNoteDraft} onInput=${e=>setSeriesNoteDraft(e.target.value)} placeholder="Anota algo de la serie sin spoilearte..." style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:76px;"></textarea>
                      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                        <button onClick=${addSeriesNote} style="padding:8px 12px;border-radius:8px;border:none;background:#10B981;color:#041018;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                          GUARDAR NOTA
                        </button>
                        ${seriesNotes.length > 0 && html`
                          <${SegmentedPillGroup}
                            options=${OCIO_NOTE_FILTER_OPTIONS}
                            value=${seriesNotesFilter}
                            onChange=${setSeriesNotesFilter}
                          />
                          <button onClick=${toggleAllSeriesNotes} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.3);background:rgba(148,163,184,0.12);color:#CBD5E1;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                            ${allSeriesNotesCollapsed ? 'EXPANDIR TODO' : 'PLEGAR TODO'}
                          </button>
                        `}
                      </div>
                      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
                        ${seriesNoteEntries.length === 0 ? html`<p style="margin:0;color:#64748b;font-size:12px;">No hay entradas para este filtro.</p>` : seriesNoteEntries.map(({ note, metaLabel, text, collapsed }) => html`
                          <${OcioNoteEntry}
                            metaLabel=${metaLabel}
                            text=${text}
                            collapsed=${collapsed}
                            onToggle=${()=>toggleSeriesNoteCollapsed(note.id)}
                            onDelete=${()=>deleteSeriesNote(note.id)}
                          />
                        `)}
                      </div>
                    </div>
                    <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;">
                      <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;color:#6366F1;">Chat serie sin spoilers</p>
                      <div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);color:#C7D2FE;font-size:12px;">
                        Gemini debe responder solo con informacion segura hasta T${Math.max(1, parseInt(series.season || 1, 10) || 1)}E${Math.max(1, parseInt(series.episode || 1, 10) || 1)}.
                      </div>
                      <textarea value=${seriesChatDraft} onInput=${e=>setSeriesChatDraft(e.target.value)} placeholder="Preguntale algo de la serie hasta tu episodio actual..." style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:76px;"></textarea>
                      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                        <button onClick=${askSeriesAi} style="padding:8px 12px;border-radius:8px;border:none;background:#6366F1;color:#F8FAFC;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                          ${seriesChatLoading ? 'PREGUNTANDO...' : 'PREGUNTAR A GEMINI'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <//>

                <div style="padding:12px;border-radius:10px;background:rgba(15,23,41,0.75);border:1px solid #1E2D45;">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
                    <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#F59E0B;">Pomodoro lectura</p>
                    <span style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;color:${pomodoroActive?'#F59E0B':'#E2E8F0'};">${fmtPomodoro}</span>
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button onClick=${()=>setPomodoroActive(v=>!v)} style="padding:8px 12px;border-radius:8px;border:none;background:${pomodoroActive?'#EF4444':'#F59E0B'};color:#041018;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                      ${pomodoroActive ? 'PAUSAR' : 'INICIAR 25 MIN'}
                    </button>
                    <button onClick=${()=>{ setPomodoroActive(false); setPomodoroLeft(25*60); }} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.35);background:rgba(148,163,184,0.12);color:#CBD5E1;font-size:12px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                      REINICIAR
                    </button>
                  </div>
                </div>

                <${SectionAccordion}
                  icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#6366F1;display:inline-block;"></span>`}
                  title="Notas y chat del libro"
                  isOpen=${ocioSectionOpen.bookNotes}
                  onToggle=${()=>setOcioSectionOpen(prev => ({ ...prev, bookNotes: !prev.bookNotes }))}
                >
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                  <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10B981;">Notas del libro</p>
                    <textarea value=${noteDraft} onInput=${e=>setNoteDraft(e.target.value)} placeholder="Escribi una nota, idea o pregunta sobre lo que leiste hasta la pagina actual..." style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:76px;"></textarea>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                      <button onClick=${addBookNote} style="padding:8px 12px;border-radius:8px;border:none;background:#10B981;color:#041018;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                        GUARDAR NOTA
                      </button>
                      <button onClick=${passBookDraftToTask} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                        PASAR A TAREA
                      </button>
                      ${notes.length > 0 && html`
                        <${SegmentedPillGroup}
                          options=${OCIO_NOTE_FILTER_OPTIONS}
                          value=${bookNotesFilter}
                          onChange=${setBookNotesFilter}
                        />
                        <button onClick=${toggleAllBookNotes} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.3);background:rgba(148,163,184,0.12);color:#CBD5E1;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                          ${allBookNotesCollapsed ? 'EXPANDIR TODO' : 'PLEGAR TODO'}
                        </button>
                      `}
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
                      ${bookNoteEntries.length === 0 ? html`<p style="margin:0;color:#64748b;font-size:12px;">No hay entradas para este filtro.</p>` : bookNoteEntries.map(({ note, metaLabel, text, collapsed }) => html`
                        <${OcioNoteEntry}
                          metaLabel=${metaLabel}
                          text=${text}
                          collapsed=${collapsed}
                          onToggle=${()=>toggleBookNoteCollapsed(note.id)}
                          onDelete=${()=>deleteBookNote(note.id)}
                          onTask=${()=>passBookNoteToTask(note)}
                        />
                      `)}
                    </div>
                  </div>

                  <div style="padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6366F1;">Chat anti-spoiler</p>
                    <div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);color:#C7D2FE;font-size:12px;">
                      Gemini debe responder solo con informacion segura hasta la pagina ${Math.max(1, parseInt(book.current_page || 1, 10) || 1)}.
                    </div>
                    <textarea value=${chatDraft} onInput=${e=>setChatDraft(e.target.value)} placeholder="Preguntale algo sobre lo leido hasta tu pagina actual..." style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:76px;"></textarea>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                      <button onClick=${askBookAi} style="padding:8px 12px;border-radius:8px;border:none;background:#6366F1;color:#F8FAFC;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                        ${chatLoading ? 'PREGUNTANDO...' : 'PREGUNTAR A GEMINI'}
                      </button>
                    </div>
                  </div>
                </div>
                <//>
              </div>
            `}
          <//>
        </div>
      `;
  };
};
