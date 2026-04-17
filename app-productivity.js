export const createProductivityView = ({
  html,
  useState,
  useEffect,
  useCallback,
  useRef,
  supabase,
  computeNextRecurringDueAt,
  normalizeSubtasks,
  subtasksToEditorText,
  editorTextToSubtasks,
  noteDisplayTitle,
  noteKindMeta,
  classifyThoughtKind,
  loadTaskAlerts,
  saveTaskAlerts,
  loadThoughtDrafts,
  saveThoughtDrafts,
  loadThoughtThreads,
  saveThoughtThreads,
  fetchJsonWithTimeout,
  formatTaskDate,
  priorityColor,
  CATEGORY_OPTIONS,
  NOTE_KIND_OPTIONS,
  RECURRENCE_OPTIONS,
  Card,
  SectionAccordion,
  DashboardStatCard,
  DashboardTagChip,
  TaskViewCard,
  ISync
}) => {  return function ProductivityView({session}) {
      const [tasks, setTasks] = useState([]);
      const [notes, setNotes] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState('');
      const [taskTitle, setTaskTitle] = useState('');
      const [taskDue, setTaskDue] = useState('');
      const [taskPriority, setTaskPriority] = useState('normal');
      const [noteTitle, setNoteTitle] = useState('');
      const [noteText, setNoteText] = useState('');
      const [noteKind, setNoteKind] = useState('idea');
      const [noteKindLocked, setNoteKindLocked] = useState(false);
      const [saving, setSaving] = useState('');
      const [taskSearch, setTaskSearch] = useState('');
      const [priorityFilter, setPriorityFilter] = useState('all');
      const [statusFilter, setStatusFilter] = useState('all');
      const [categoryFilter, setCategoryFilter] = useState('all');
      const [noteKindFilter, setNoteKindFilter] = useState('all');
      const [taskAutoEmail, setTaskAutoEmail] = useState(true);
      const [taskCategory, setTaskCategory] = useState('personal');
      const [taskRecurrence, setTaskRecurrence] = useState('none');
      const [editingTaskId, setEditingTaskId] = useState(null);
      const [editingTaskTitle, setEditingTaskTitle] = useState('');
      const [editingTaskDetails, setEditingTaskDetails] = useState('');
      const [editingTaskSubtasksText, setEditingTaskSubtasksText] = useState('');
      const [editingTaskDue, setEditingTaskDue] = useState('');
      const [editingTaskPriority, setEditingTaskPriority] = useState('normal');
      const [editingTaskAutoEmail, setEditingTaskAutoEmail] = useState(true);
      const [editingTaskCategory, setEditingTaskCategory] = useState('personal');
      const [editingTaskRecurrence, setEditingTaskRecurrence] = useState('none');
      const [editingNoteId, setEditingNoteId] = useState(null);
      const [editingNoteTitle, setEditingNoteTitle] = useState('');
      const [editingNoteContent, setEditingNoteContent] = useState('');
      const [editingNoteKind, setEditingNoteKind] = useState('idea');
      const [editingNoteKindLocked, setEditingNoteKindLocked] = useState(false);
      const [aiOpenNoteId, setAiOpenNoteId] = useState(null);
      const [aiDrafts, setAiDrafts] = useState(()=>loadThoughtDrafts());
      const [aiReplies, setAiReplies] = useState(()=>loadThoughtThreads());
      const [aiLoadingNoteId, setAiLoadingNoteId] = useState(null);
      const [aiNotice, setAiNotice] = useState('');
      const [taskNotice, setTaskNotice] = useState('');
      const [taskSectionOpen, setTaskSectionOpen] = useState({
        pending: true,
        thoughts: false,
        done: false,
        archived: false
      });
      const aiDraftTimersRef = useRef({});

      useEffect(() => { saveThoughtThreads(aiReplies); }, [aiReplies]);
      useEffect(() => { saveThoughtDrafts(aiDrafts); }, [aiDrafts]);

      const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
          const [{ data: taskRows, error: taskErr }, { data: noteRows, error: noteErr }] = await Promise.all([
            supabase.from('tasks')
              .select('*')
              .eq('user_id', session.user.id)
              .order('status', { ascending: true })
              .order('due_at', { ascending: true, nullsFirst: false })
              .order('created_at', { ascending: false }),
            supabase.from('notes')
              .select('*')
              .eq('user_id', session.user.id)
              .order('pinned', { ascending: false })
              .order('created_at', { ascending: false })
          ]);
          if(taskErr) throw taskErr;
          if(noteErr) throw noteErr;
          setTasks(taskRows || []);
          setNotes(noteRows || []);
          const remoteThreads = Object.fromEntries(
            (noteRows || [])
              .filter(n => Array.isArray(n.ai_thread) && n.ai_thread.length > 0)
              .map(n => [n.id, n.ai_thread])
          );
          setAiReplies(prev => {
            const merged = { ...prev };
            Object.entries(remoteThreads).forEach(([noteId, thread]) => {
              const localThread = merged[noteId] || [];
              merged[noteId] = thread.length >= localThread.length ? thread : localThread;
            });
            return merged;
          });
          const remoteDrafts = Object.fromEntries(
            (noteRows || [])
              .filter(n => typeof n.ai_draft === 'string' && n.ai_draft.trim())
              .map(n => [n.id, n.ai_draft])
          );
          setAiDrafts(prev => {
            const merged = { ...prev };
            Object.entries(remoteDrafts).forEach(([noteId, draft]) => {
              const localDraft = merged[noteId] || '';
              merged[noteId] = String(draft).length >= String(localDraft).length ? draft : localDraft;
            });
            return merged;
          });
        } catch(e) {
          setError(e.message || 'No se pudieron cargar tareas y pensamientos.');
        } finally {
          setLoading(false);
        }
      }, [session.user.id]);

      useEffect(() => {
        loadData();
        const onFocus = () => loadData();
        const onVisible = () => { if(document.visibilityState === 'visible') loadData(); };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, [loadData]);

      const addTask = async () => {
        if(!taskTitle.trim()) return;
        setSaving('task');
        setError('');
        try {
          const { data, error } = await supabase.from('tasks').insert({
            user_id: session.user.id,
            title: taskTitle.trim(),
            details: null,
            subtasks: [],
            priority: taskPriority,
            category: taskCategory,
            recurrence: taskRecurrence,
            status: 'pending',
            auto_email_reminder: taskAutoEmail,
            due_at: taskDue || null
          }).select().single();
          if(error) throw error;
          setTasks(prev => [data, ...prev]);
          setTaskTitle('');
          setTaskDue('');
          setTaskPriority('normal');
          setTaskCategory('personal');
          setTaskRecurrence('none');
          setTaskAutoEmail(true);
        } catch(e) {
          setError(e.message || 'No se pudo guardar la tarea.');
        } finally {
          setSaving('');
        }
      };

      const addNote = async () => {
        if(!noteText.trim()) return;
        setSaving('note');
        setError('');
        try {
          const { data, error } = await supabase.from('notes').insert({
            user_id: session.user.id,
            note_title: noteTitle.trim() || null,
            content: noteText.trim(),
            kind: noteKind,
            pinned: false,
            ai_thread: [],
            ai_draft: ''
          }).select().single();
          if(error) throw error;
          setNotes(prev => [data, ...prev]);
          setNoteTitle('');
          setNoteText('');
          setNoteKind('idea');
          setNoteKindLocked(false);
        } catch(e) {
          setError(e.message || 'No se pudo guardar el pensamiento.');
        } finally {
          setSaving('');
        }
      };

      const updateTaskStatus = async (task, status) => {
        try {
          const basePatch = {
            status,
            email_reminder_sent_at: status === 'pending' ? null : task.email_reminder_sent_at || null,
            updated_at: new Date().toISOString()
          };
          const { data, error } = await supabase.from('tasks')
            .update({
              ...basePatch
            })
            .eq('id', task.id)
            .eq('user_id', session.user.id)
            .select()
            .single();
          if(error) throw error;
          let spawnedTask = null;
          if(status === 'done' && (task.recurrence || 'none') !== 'none'){
            const nextDueAt = computeNextRecurringDueAt(task);
            const { data: nextTask, error: nextErr } = await supabase.from('tasks').insert({
              user_id: session.user.id,
              title: task.title,
              details: task.details || null,
              subtasks: normalizeSubtasks(task.subtasks || []),
              priority: task.priority || 'normal',
              category: task.category || 'personal',
              recurrence: task.recurrence || 'none',
              status: 'pending',
              auto_email_reminder: task.auto_email_reminder !== false,
              due_at: nextDueAt,
              email_reminder_sent_at: null
            }).select().single();
            if(nextErr) throw nextErr;
            spawnedTask = nextTask;
          }
          setTasks(prev => {
            const next = prev.map(t => t.id === task.id ? data : t);
            return spawnedTask ? [spawnedTask, ...next] : next;
          });
        } catch(e) {
          setError(e.message || 'No se pudo actualizar la tarea.');
        }
      };

      const startEditTask = (task) => {
        setEditingTaskId(task.id);
        setEditingTaskTitle(task.title || '');
        setEditingTaskDetails(task.details || '');
        setEditingTaskSubtasksText(subtasksToEditorText(task.subtasks || []));
        setEditingTaskDue(task.due_at ? String(task.due_at).slice(0,16) : '');
        setEditingTaskPriority(task.priority || 'normal');
        setEditingTaskCategory(task.category || 'personal');
        setEditingTaskAutoEmail(task.auto_email_reminder !== false);
        setEditingTaskRecurrence(task.recurrence || 'none');
      };

      const saveTaskEdit = async (task) => {
        if(!editingTaskTitle.trim()) return;
        setSaving(`edit-task-${task.id}`);
        setError('');
        try {
          const { data, error } = await supabase.from('tasks')
            .update({
              title: editingTaskTitle.trim(),
              details: editingTaskDetails.trim() || null,
              subtasks: editorTextToSubtasks(editingTaskSubtasksText),
              due_at: editingTaskDue || null,
              priority: editingTaskPriority,
              category: editingTaskCategory,
              recurrence: editingTaskRecurrence,
              auto_email_reminder: editingTaskAutoEmail,
              email_reminder_sent_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)
            .eq('user_id', session.user.id)
            .select()
            .single();
          if(error) throw error;
          setTasks(prev => prev.map(t => t.id === task.id ? data : t));
          setEditingTaskId(null);
        } catch(e) {
          setError(e.message || 'No se pudo editar la tarea.');
        } finally {
          setSaving('');
        }
      };

      const deleteTask = async (task) => {
        try {
          const { error } = await supabase.from('tasks')
            .delete()
            .eq('id', task.id)
            .eq('user_id', session.user.id);
          if(error) throw error;
          setTasks(prev => prev.filter(t => t.id !== task.id));
        } catch(e) {
          setError(e.message || 'No se pudo borrar la tarea.');
        }
      };

      const toggleSubtask = async (task, subtaskIndex) => {
        try {
          const subtasks = normalizeSubtasks(task.subtasks || []).map((item, idx) => idx === subtaskIndex ? { ...item, done: !item.done } : item);
          const { data, error } = await supabase.from('tasks')
            .update({
              subtasks,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)
            .eq('user_id', session.user.id)
            .select()
            .single();
          if(error) throw error;
          setTasks(prev => prev.map(t => t.id === task.id ? data : t));
        } catch(e) {
          setError(e.message || 'No se pudo actualizar la subtarea.');
        }
      };

      const togglePinNote = async (note) => {
        try {
          const { data, error } = await supabase.from('notes')
            .update({ pinned: !note.pinned, updated_at: new Date().toISOString() })
            .eq('id', note.id)
            .eq('user_id', session.user.id)
            .select()
            .single();
          if(error) throw error;
          setNotes(prev => prev.map(n => n.id === note.id ? data : n));
        } catch(e) {
          setError(e.message || 'No se pudo actualizar el pensamiento.');
        }
      };

      const persistAiThread = async (noteId, thread) => {
        const { error } = await supabase.from('notes')
          .update({
            ai_thread: thread,
            updated_at: new Date().toISOString()
          })
          .eq('id', noteId)
          .eq('user_id', session.user.id);
        if(error) throw error;
      };

      const persistAiDraft = async (noteId, draft) => {
        const { error } = await supabase.from('notes')
          .update({
            ai_draft: draft,
            updated_at: new Date().toISOString()
          })
          .eq('id', noteId)
          .eq('user_id', session.user.id);
        if(error) throw error;
      };

      const updateAiDraft = (noteId, value) => {
        setAiDrafts(prev => ({ ...prev, [noteId]: value }));
        clearTimeout(aiDraftTimersRef.current[noteId]);
        aiDraftTimersRef.current[noteId] = setTimeout(() => {
          persistAiDraft(noteId, value).catch(() => {});
        }, 700);
      };

      const startEditNote = (note) => {
        setEditingNoteId(note.id);
        setEditingNoteTitle(note.note_title || '');
        setEditingNoteContent(note.content || '');
        setEditingNoteKind(note.kind || 'idea');
        setEditingNoteKindLocked(false);
      };

      const saveNoteEdit = async (note) => {
        if(!editingNoteContent.trim()) return;
        setSaving(`edit-note-${note.id}`);
        setError('');
        try {
          const { data, error } = await supabase.from('notes')
            .update({
              note_title: editingNoteTitle.trim() || null,
              content: editingNoteContent.trim(),
              kind: editingNoteKind,
              updated_at: new Date().toISOString()
            })
            .eq('id', note.id)
            .eq('user_id', session.user.id)
            .select()
            .single();
          if(error) throw error;
          setNotes(prev => prev.map(n => n.id === note.id ? data : n));
          setEditingNoteId(null);
          setEditingNoteKindLocked(false);
        } catch(e) {
          setError(e.message || 'No se pudo editar el pensamiento.');
        } finally {
          setSaving('');
        }
      };

      const deleteNote = async (note) => {
        try {
          const { error } = await supabase.from('notes')
            .delete()
            .eq('id', note.id)
            .eq('user_id', session.user.id);
          if(error) throw error;
          setNotes(prev => prev.filter(n => n.id !== note.id));
          setAiReplies(prev => {
            const next = { ...prev };
            delete next[note.id];
            return next;
          });
          setAiDrafts(prev => {
            const next = { ...prev };
            delete next[note.id];
            return next;
          });
          clearTimeout(aiDraftTimersRef.current[note.id]);
          delete aiDraftTimersRef.current[note.id];
        } catch(e) {
          setError(e.message || 'No se pudo borrar el pensamiento.');
        }
      };

      const exportNote = (note) => {
        try {
          const title = noteDisplayTitle(note);
          const thread = aiReplies[note.id] || [];
          const lines = [
            `Titulo: ${title}`,
            `Categoria: ${noteKindMeta(note.kind || 'idea').label}`,
            `Fecha: ${formatTaskDate(note.created_at)}`,
            '',
            'Contenido:',
            String(note.content || '').trim(),
            ''
          ];
          if(thread.length){
            lines.push('Debate IA:', '');
            thread.forEach((item, idx) => {
              lines.push(`${idx + 1}. Pregunta: ${item.question}`);
              lines.push(`Respuesta: ${item.reply}`);
              lines.push('');
            });
          }
          const blob = new Blob([lines.join('\n')], { type:'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const safeName = title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'pensamiento';
          a.href = url;
          a.download = `${safeName}.txt`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch(e) {
          setError(e.message || 'No se pudo exportar el pensamiento.');
        }
      };

      const convertNoteToTask = async (note) => {
        setSaving(`convert-${note.id}`);
        setError('');
        try {
          const { data: taskRow, error: taskErr } = await supabase.from('tasks').insert({
            user_id: session.user.id,
            title: note.content.slice(0, 120),
            details: note.content,
            priority: 'normal',
            category: 'personal',
            status: 'pending'
          }).select().single();
          if(taskErr) throw taskErr;
          const { data: noteRow, error: noteErr } = await supabase.from('notes')
            .update({ kind: 'converted', updated_at: new Date().toISOString() })
            .eq('id', note.id)
            .eq('user_id', session.user.id)
            .select()
            .single();
          if(noteErr) throw noteErr;
          setTasks(prev => [taskRow, ...prev]);
          setNotes(prev => prev.map(n => n.id === note.id ? noteRow : n));
        } catch(e) {
          setError(e.message || 'No se pudo convertir la nota en tarea.');
        } finally {
          setSaving('');
        }
      };

      const calendarLinkForTask = (task) => {
        const start = task.due_at ? new Date(task.due_at) : new Date();
        const end = new Date(start.getTime() + (30 * 60000));
        const fmt = (d) => {
          const y = d.getUTCFullYear();
          const m = String(d.getUTCMonth()+1).padStart(2,'0');
          const day = String(d.getUTCDate()).padStart(2,'0');
          const h = String(d.getUTCHours()).padStart(2,'0');
          const min = String(d.getUTCMinutes()).padStart(2,'0');
          const s = String(d.getUTCSeconds()).padStart(2,'0');
          return `${y}${m}${day}T${h}${min}${s}Z`;
        };
        const text = encodeURIComponent(task.title);
        const details = encodeURIComponent(task.details || 'Recordatorio creado desde Enzo Training');
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${fmt(start)}/${fmt(end)}`;
      };

      const sendTaskEmail = async (task) => {
        setSaving(`mail-${task.id}`);
        setError('');
        try {
          const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/send-task-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: task.title,
              details: task.details || '',
              dueAt: task.due_at ? formatTaskDate(task.due_at) : '',
              priority: task.priority || 'normal'
            })
          });
          if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          setError('Correo enviado correctamente.');
          setTimeout(() => setError(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo enviar el correo.');
        } finally {
          setSaving('');
        }
      };

      const askThoughtAI = async (note) => {
        setAiLoadingNoteId(note.id);
        setError('');
        try {
          const currentQuestion = (aiDrafts[note.id] || '').trim();
          const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/thought-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              thought: note.content,
              question: currentQuestion || 'Quiero debatir esta idea. Analizala con argumentos a favor, en contra y una conclusion provisoria.'
            })
          });
          if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          const nextThread = [
            ...(aiReplies[note.id] || []),
            {
              question: currentQuestion || 'Debate general',
              reply: data.reply || 'No hubo respuesta.'
            }
          ];
          setAiReplies(prev => ({ ...prev, [note.id]: nextThread }));
          try {
            await persistAiThread(note.id, nextThread);
          } catch(syncErr) {
            setAiNotice('Se guardo local, pero no se pudo sincronizar el debate.');
            setTimeout(() => setAiNotice(''), 3000);
          }
          setAiDrafts(prev => ({ ...prev, [note.id]: '' }));
          persistAiDraft(note.id, '').catch(() => {});
          setAiOpenNoteId(note.id);
        } catch(e) {
          setError(e.message || 'No se pudo consultar la IA.');
        } finally {
          setAiLoadingNoteId(null);
        }
      };

      const summarizeThoughtDebate = async (note) => {
        setAiLoadingNoteId(note.id);
        setError('');
        try {
          const thread = aiReplies[note.id] || [];
          if(thread.length === 0) throw new Error('todavía no hay debate para resumir.');
          const historyText = thread.map((item, idx) => `${idx + 1}. Pregunta: ${item.question}\nRespuesta: ${item.reply}`).join('\n\n');
          const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/thought-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              thought: note.content,
              question: `Resumi este debate en 5 puntos concretos, una conclusion breve y una siguiente pregunta util.\n\n${historyText}`
            })
          });
          if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          const nextThread = [
            ...thread,
            {
              question: 'Resumen del debate',
              reply: data.reply || 'No hubo resumen.'
            }
          ];
          setAiReplies(prev => ({ ...prev, [note.id]: nextThread }));
          try {
            await persistAiThread(note.id, nextThread);
          } catch(_) {}
          setAiOpenNoteId(note.id);
        } catch(e) {
          setError(e.message || 'No se pudo resumir el debate.');
        } finally {
          setAiLoadingNoteId(null);
        }
      };

      const removeAiReply = async (note, idxToRemove) => {
        try {
          const currentThread = aiReplies[note.id] || [];
          const nextThread = currentThread.filter((_, idx) => idx !== idxToRemove);
          setAiReplies(prev => ({ ...prev, [note.id]: nextThread }));
          await persistAiThread(note.id, nextThread);
        } catch(e) {
          setError(e.message || 'No se pudo borrar ese bloque del debate.');
        }
      };

      const openInGemini = async (note) => {
        const thread = aiReplies[note.id] || [];
        const draft = (aiDrafts[note.id] || '').trim();
        const prompt = [
          'Quiero seguir este debate en Gemini.',
          '',
          `Pensamiento original: ${note.content}`,
          '',
          ...(thread.length ? ['Historial del debate:', '', ...thread.flatMap((item, idx) => [
            `${idx + 1}. Usuario: ${item.question}`,
            `Gemini: ${item.reply}`,
            ''
          ])] : []),
          `Nueva consigna: ${draft || 'Segui cuestionando esta idea y llevandola a una conclusion mas fuerte.'}`
        ].join('\n').trim();

        try {
          if(navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(prompt);
          }
          setAiNotice('Contexto copiado. Gemini abierto.');
          setTimeout(() => setAiNotice(''), 3000);
        } catch(_) {
          setAiNotice('No se pudo copiar, pero igual abrimos Gemini.');
          setTimeout(() => setAiNotice(''), 3000);
        }

        window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
      };

      const searchNeedle = taskSearch.trim().toLowerCase();
      const filteredTasks = tasks.filter(task => {
        const text = `${task.title || ''} ${task.details || ''}`.toLowerCase();
        if(searchNeedle && !text.includes(searchNeedle)) return false;
        if(priorityFilter !== 'all' && (task.priority || 'normal') !== priorityFilter) return false;
        if(statusFilter !== 'all' && task.status !== statusFilter) return false;
        if(categoryFilter !== 'all' && (task.category || 'personal') !== categoryFilter) return false;
        return true;
      });
      const filteredNotes = notes.filter(note => {
        if(note.kind === 'converted') return false;
        if(noteKindFilter !== 'all' && (note.kind || 'idea') !== noteKindFilter) return false;
        if(!searchNeedle) return true;
        return `${String(note.note_title || '')} ${String(note.content || '')}`.toLowerCase().includes(searchNeedle);
      });
      const archivedTasks = filteredTasks.filter(t => t.status === 'archived');
      const pendingTasks = filteredTasks.filter(t => t.status !== 'done' && t.status !== 'archived');
      const doneTasks = filteredTasks.filter(t => t.status === 'done');
      const activeNotes = filteredNotes;
      const now = new Date();
      const endOfToday = new Date(now); endOfToday.setHours(23,59,59,999);
      const endOfTomorrow = new Date(now); endOfTomorrow.setDate(now.getDate() + 1); endOfTomorrow.setHours(23,59,59,999);
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      endOfWeek.setHours(23,59,59,999);
      const groupedPending = {
        today: pendingTasks.filter(t => t.due_at && new Date(t.due_at) <= endOfToday),
        tomorrow: pendingTasks.filter(t => t.due_at && new Date(t.due_at) > endOfToday && new Date(t.due_at) <= endOfTomorrow),
        week: pendingTasks.filter(t => t.due_at && new Date(t.due_at) > endOfTomorrow && new Date(t.due_at) <= endOfWeek),
        later: pendingTasks.filter(t => t.due_at && new Date(t.due_at) > endOfWeek),
        someday: pendingTasks.filter(t => !t.due_at)
      };
      const todayFocus = tasks.filter(t => t.status !== 'done' && t.status !== 'archived' && t.due_at && new Date(t.due_at) <= endOfToday);
      const urgentCount = tasks.filter(t => t.status !== 'done' && t.status !== 'archived' && (t.priority || 'normal') === 'high').length;
      const byCategory = CATEGORY_OPTIONS.map(cat => ({
        ...cat,
        count: tasks.filter(t => t.status !== 'done' && t.status !== 'archived' && (t.category || 'personal') === cat.value).length
      }));

      useEffect(() => {
        const runTaskReminderCheck = () => {
          const pending = tasks.filter(t => t.status !== 'done' && t.status !== 'archived' && t.due_at);
          if(pending.length === 0) return;
          const now = Date.now();
          const alerts = loadTaskAlerts();
          const dueSoon = pending
            .map(task => ({ task, dueMs: new Date(task.due_at).getTime() }))
            .filter(item => !Number.isNaN(item.dueMs))
            .sort((a,b) => a.dueMs - b.dueMs)
            .filter(item => item.dueMs <= (now + 15 * 60000));
          if(dueSoon.length === 0) return;
          const unseen = dueSoon.filter(item => !alerts[`${item.task.id}:${item.task.due_at}`]);
          if(unseen.length === 0) return;
          unseen.forEach(item => {
            alerts[`${item.task.id}:${item.task.due_at}`] = new Date().toISOString();
          });
          saveTaskAlerts(alerts);
          const candidate = unseen[0];
          const diffMin = Math.round((candidate.dueMs - now) / 60000);
          const timing = diffMin <= 0 ? 'ya vencio' : diffMin === 1 ? 'vence en 1 minuto' : `vence en ${diffMin} minutos`;
          const extra = unseen.length > 1 ? ` Hay ${unseen.length - 1} mas cerca.` : '';
          const message = `Tarea: ${candidate.task.title} - ${timing}.${extra}`;
          setTaskNotice(message);
          setTimeout(() => setTaskNotice(''), 6000);
          if(typeof Notification !== 'undefined' && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
              if(reg?.showNotification) {
                reg.showNotification('Tarea cercana', {
                  body: message,
                  icon: './icon-192.png',
                  badge: './icon-192.png',
                  tag: `task-${candidate.task.id}`,
                  requireInteraction: false
                });
              }
            }).catch(() => {});
          }
        };
        runTaskReminderCheck();
        const timer = setInterval(runTaskReminderCheck, 60000);
        return () => clearInterval(timer);
      }, [tasks]);

      return html`
        <div style="display:flex;flex-direction:column;gap:12px;">
          <${Card}>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
              <div>
                <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6366F1;">Tareas y pensamientos</p>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Anota rápido, ordena después y manda recordatorios al calendario o mail.</p>
              </div>
              <button class="btn-icon" style="background:#162035;border:1px solid #1E2D45;" onClick=${loadData}>
                <${ISync} s=${16}/>
              </button>
            </div>
            ${taskNotice && html`<div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);color:#FCD34D;font-size:12px;">${taskNotice}</div>`}
            ${aiNotice && html`<div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);color:#7DD3FC;font-size:12px;">${aiNotice}</div>`}
            ${error && html`<div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);color:#FCA5A5;font-size:12px;">${error}</div>`}
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
              ${[
                { label:'Pendientes', val: pendingTasks.length, color:'#10B981' },
                { label:'Hechas', val: doneTasks.length, color:'#6366F1' },
                { label:'Ideas', val: activeNotes.length, color:'#F59E0B' }
              ].map(item => html`
                <div style="padding:10px;border-radius:10px;background:rgba(10,15,30,0.45);border:1px solid #1E2D45;">
                  <p style="margin:0;font-size:9px;color:#64748b;text-transform:uppercase;">${item.label}</p>
                  <p style=${`margin:4px 0 0;font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${item.color};`}>${item.val}</p>
                </div>
              `)}
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px;">
            <${DashboardStatCard} label="Vencen hoy" value=${todayFocus.length} color="#EF4444" />
            <${DashboardStatCard} label="Alta prioridad" value=${urgentCount} color="#F59E0B" />
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            ${byCategory.map(cat => html`<${DashboardTagChip} label=${`${cat.label}: ${cat.count}`} color=${cat.color} />`)}
          </div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
              <input class="inp" placeholder="Buscar tarea o pensamiento..."
                value=${taskSearch} onInput=${e=>setTaskSearch(e.target.value)} />
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                <select class="inp" value=${priorityFilter} onChange=${e=>setPriorityFilter(e.target.value)}>
                  <option value="all">Todas las prioridades</option>
                  <option value="high">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="low">Baja</option>
                </select>
                <select class="inp" value=${categoryFilter} onChange=${e=>setCategoryFilter(e.target.value)}>
                  <option value="all">Todas las categorias</option>
                  ${CATEGORY_OPTIONS.map(cat => html`<option value=${cat.value}>${cat.label}</option>`)}
                </select>
                <select class="inp" value=${statusFilter} onChange=${e=>setStatusFilter(e.target.value)}>
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="done">Hechas</option>
                  <option value="archived">Archivadas</option>
                </select>
              </div>
              <select class="inp" value=${noteKindFilter} onChange=${e=>setNoteKindFilter(e.target.value)}>
                <option value="all">Todos los pensamientos</option>
                ${NOTE_KIND_OPTIONS.map(opt => html`<option value=${opt.value}>${opt.label}</option>`)}
              </select>
            </div>
          <//>

          <${Card}>
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10B981;">Nueva tarea</p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <input class="inp" placeholder="Ej: revisar Termodinamica o pagar algo..."
                value=${taskTitle} onInput=${e=>setTaskTitle(e.target.value)} />
              <div style="display:grid;grid-template-columns:1fr 120px;gap:8px;">
                <input class="inp" type="datetime-local" value=${taskDue} onInput=${e=>setTaskDue(e.target.value)} />
                <select class="inp" value=${taskPriority} onChange=${e=>setTaskPriority(e.target.value)}>
                  <option value="high">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="low">Baja</option>
                </select>
              </div>
              <select class="inp" value=${taskCategory} onChange=${e=>setTaskCategory(e.target.value)}>
                ${CATEGORY_OPTIONS.map(cat => html`<option value=${cat.value}>${cat.label}</option>`)}
              </select>
              <select class="inp" value=${taskRecurrence} onChange=${e=>setTaskRecurrence(e.target.value)}>
                ${RECURRENCE_OPTIONS.map(opt => html`<option value=${opt.value}>${opt.label}</option>`)}
              </select>
              <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;cursor:pointer;">
                <input type="checkbox" checked=${taskAutoEmail} onChange=${e=>setTaskAutoEmail(e.target.checked)} />
                <span>Enviar recordatorio automático por email cuando venza</span>
              </label>
              <button onClick=${addTask}
                style="width:100%;padding:10px;border-radius:10px;border:none;background:#10B981;color:#041018;font-size:13px;font-weight:800;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.06em;cursor:pointer;">
                ${saving === 'task' ? 'GUARDANDO...' : 'AGREGAR TAREA'}
              </button>
            </div>
          <//>

          <${Card}>
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#F59E0B;">Pensamiento rápido</p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <input class="inp" placeholder="Titulo opcional"
                value=${noteTitle} onInput=${e=>setNoteTitle(e.target.value)} />
              <select class="inp" value=${noteKind} onChange=${e=>{ setNoteKind(e.target.value); setNoteKindLocked(true); }}>
                ${NOTE_KIND_OPTIONS.map(opt => html`<option value=${opt.value}>${opt.label}</option>`)}
              </select>
              <textarea
                value=${noteText}
                onInput=${e=>{ const value = e.target.value; setNoteText(value); if(!noteKindLocked) setNoteKind(classifyThoughtKind(value)); }}
                placeholder="Ej: idea, pendiente, algo que no quiero olvidarme..."
                style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:88px;"></textarea>
              <p style="margin:0;font-size:11px;color:#64748b;">Categoria sugerida automaticamente segun lo que escribis. Si cambias el selector, se respeta tu eleccion.</p>
              <button onClick=${addNote}
                style="width:100%;padding:10px;border-radius:10px;border:none;background:#F59E0B;color:#080D1A;font-size:13px;font-weight:800;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.06em;cursor:pointer;">
                ${saving === 'note' ? 'GUARDANDO...' : 'GUARDAR PENSAMIENTO'}
              </button>
            </div>
          <//>

          <${SectionAccordion}
            icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#10B981;display:inline-block;"></span>`}
            title="Pendientes"
            isOpen=${taskSectionOpen.pending}
            onToggle=${()=>setTaskSectionOpen(prev => ({ ...prev, pending: !prev.pending }))}
          >
            ${loading ? html`<p style="margin:0;color:#64748b;font-size:12px;">Cargando...</p>` : pendingTasks.length === 0 ? html`<p style="margin:0;color:#64748b;font-size:12px;">todavía no tenes tareas pendientes.</p>` : html`
              <div style="display:flex;flex-direction:column;gap:12px;">
                ${[
                  ['Hoy', groupedPending.today],
                  ['Manana', groupedPending.tomorrow],
                  ['Mas adelante', groupedPending.later],
                  ['Sin fecha', groupedPending.someday]
                ].filter(([,items]) => items.length > 0).map(([label, items]) => html`
                  <div>
                    <p style="margin:0 0 8px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">${label}</p>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                      ${items.map(task => {
                        const subtasks = normalizeSubtasks(task.subtasks || []);
                        const doneSubtasks = subtasks.filter(subtask => !!subtask.done).length;
                        const priorityAccent = priorityColor(task.priority);
                        return html`
                        <div style=${`padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.45);border:1px solid #1E2D45;box-shadow:inset 3px 0 0 ${priorityAccent};`}>
                          ${editingTaskId === task.id ? html`
                            <div style="display:flex;flex-direction:column;gap:8px;">
                              <input class="inp" value=${editingTaskTitle} onInput=${e=>setEditingTaskTitle(e.target.value)} />
                              <textarea
                                value=${editingTaskDetails}
                                onInput=${e=>setEditingTaskDetails(e.target.value)}
                                placeholder="Detalle opcional"
                                style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:72px;"></textarea>
                              <textarea
                                value=${editingTaskSubtasksText}
                                onInput=${e=>setEditingTaskSubtasksText(e.target.value)}
                                placeholder="Subtareas, una por linea"
                                style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:88px;"></textarea>
                              <div style="display:grid;grid-template-columns:1fr 120px;gap:8px;">
                                <input class="inp" type="datetime-local" value=${editingTaskDue} onInput=${e=>setEditingTaskDue(e.target.value)} />
                                <select class="inp" value=${editingTaskPriority} onChange=${e=>setEditingTaskPriority(e.target.value)}>
                                  <option value="high">Alta</option>
                                  <option value="normal">Normal</option>
                                  <option value="low">Baja</option>
                                </select>
                              </div>
                              <select class="inp" value=${editingTaskCategory} onChange=${e=>setEditingTaskCategory(e.target.value)}>
                                ${CATEGORY_OPTIONS.map(cat => html`<option value=${cat.value}>${cat.label}</option>`)}
                              </select>
                              <select class="inp" value=${editingTaskRecurrence} onChange=${e=>setEditingTaskRecurrence(e.target.value)}>
                                ${RECURRENCE_OPTIONS.map(opt => html`<option value=${opt.value}>${opt.label}</option>`)}
                              </select>
                              <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;cursor:pointer;">
                                <input type="checkbox" checked=${editingTaskAutoEmail} onChange=${e=>setEditingTaskAutoEmail(e.target.checked)} />
                                <span>Recordatorio automático por email</span>
                              </label>
                              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                <button onClick=${()=>saveTaskEdit(task)}
                                  style="padding:6px 10px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#34D399;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                                  ${saving === `edit-task-${task.id}` ? 'GUARDANDO...' : 'GUARDAR'}
                                </button>
                                <button onClick=${()=>setEditingTaskId(null)}
                                  style="padding:6px 10px;border-radius:8px;border:1px solid rgba(100,116,139,0.35);background:rgba(100,116,139,0.12);color:#CBD5E1;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                                  CANCELAR
                                </button>
                              </div>
                            </div>
                          ` : html`
                            <${TaskViewCard}
                              task=${task}
                              subtasks=${subtasks}
                              doneSubtasks=${doneSubtasks}
                              priorityAccent=${priorityAccent}
                              onEdit=${()=>startEditTask(task)}
                              onDone=${()=>updateTaskStatus(task,'done')}
                              onArchive=${()=>updateTaskStatus(task,'archived')}
                              onDelete=${()=>deleteTask(task)}
                              onToggleSubtask=${(idx)=>toggleSubtask(task, idx)}
                              calendarHref=${calendarLinkForTask(task)}
                              onMail=${()=>sendTaskEmail(task)}
                              mailLoading=${saving === `mail-${task.id}`}
                            />
                          `}
                        </div>
                      `})}
                    </div>
                  </div>
                `)}
              </div>
            `}
          <//>

          <${SectionAccordion}
            icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#F59E0B;display:inline-block;"></span>`}
            title="Pensamientos"
            isOpen=${taskSectionOpen.thoughts}
            onToggle=${()=>setTaskSectionOpen(prev => ({ ...prev, thoughts: !prev.thoughts }))}
          >
            ${loading ? html`<p style="margin:0;color:#64748b;font-size:12px;">Cargando...</p>` : activeNotes.length === 0 ? html`<p style="margin:0;color:#64748b;font-size:12px;">todavía no guardaste pensamientos.</p>` : html`
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${activeNotes.map(note => html`
                  <div style="padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.45);border:1px solid ${note.pinned?'rgba(245,158,11,0.35)':'#1E2D45'};">
                    ${editingNoteId === note.id ? html`
                      <div style="display:flex;flex-direction:column;gap:8px;">
                        <input class="inp" value=${editingNoteTitle} onInput=${e=>setEditingNoteTitle(e.target.value)} placeholder="Titulo opcional" />
                        <select class="inp" value=${editingNoteKind} onChange=${e=>{ setEditingNoteKind(e.target.value); setEditingNoteKindLocked(true); }}>
                          ${NOTE_KIND_OPTIONS.map(opt => html`<option value=${opt.value}>${opt.label}</option>`)}
                        </select>
                        <textarea
                          value=${editingNoteContent}
                          onInput=${e=>{ const value = e.target.value; setEditingNoteContent(value); if(!editingNoteKindLocked) setEditingNoteKind(classifyThoughtKind(value)); }}
                          style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:88px;"></textarea>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button onClick=${()=>saveNoteEdit(note)}
                            style="padding:6px 10px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#34D399;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                            ${saving === `edit-note-${note.id}` ? 'GUARDANDO...' : 'GUARDAR'}
                          </button>
                          <button onClick=${()=>setEditingNoteId(null)}
                            style="padding:6px 10px;border-radius:8px;border:1px solid rgba(100,116,139,0.35);background:rgba(100,116,139,0.12);color:#CBD5E1;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                            CANCELAR
                          </button>
                        </div>
                      </div>
                    ` : html`
                      <p style="margin:0 0 6px;font-size:12px;color:#F8FAFC;font-weight:700;">${noteDisplayTitle(note)}</p>
                      <p style="margin:0;font-size:13px;color:#E2E8F0;white-space:pre-wrap;">${note.content}</p>
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap;">
                        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                          <span style=${`font-size:10px;color:${noteKindMeta(note.kind || 'idea').color};font-family:'JetBrains Mono',monospace;`}>${noteKindMeta(note.kind || 'idea').label.toUpperCase()}</span>
                          <span style="font-size:10px;color:${note.pinned?'#FBBF24':'#64748b'};font-family:'JetBrains Mono',monospace;">
                            ${note.pinned ? 'FIJADO' : formatTaskDate(note.created_at)}
                          </span>
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button onClick=${()=>startEditNote(note)}
                            style="padding:6px 10px;border-radius:8px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                            EDITAR
                          </button>
                          <button onClick=${()=>togglePinNote(note)}
                            style="padding:6px 10px;border-radius:8px;border:1px solid rgba(245,158,11,0.35);background:rgba(245,158,11,0.12);color:#FBBF24;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                            ${note.pinned ? 'DESFIJAR' : 'FIJAR'}
                          </button>
                          <button onClick=${()=>exportNote(note)}
                            style="padding:6px 10px;border-radius:8px;border:1px solid rgba(148,163,184,0.35);background:rgba(148,163,184,0.12);color:#CBD5E1;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                            EXPORTAR
                          </button>
                          <button onClick=${()=>setAiOpenNoteId(aiOpenNoteId === note.id ? null : note.id)}
                            style="padding:6px 10px;border-radius:8px;border:1px solid rgba(56,189,248,0.35);background:rgba(56,189,248,0.12);color:#7DD3FC;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                            IA
                          </button>
                          <button onClick=${()=>convertNoteToTask(note)}
                            style="padding:6px 10px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#34D399;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                            ${saving === `convert-${note.id}` ? 'CONVIRTIENDO...' : 'PASAR A TAREA'}
                          </button>
                          <button onClick=${()=>deleteNote(note)}
                            style="padding:6px 10px;border-radius:8px;border:1px solid rgba(239,68,68,0.35);background:rgba(239,68,68,0.12);color:#FCA5A5;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                            BORRAR
                          </button>
                        </div>
                      </div>
                      ${aiOpenNoteId === note.id && html`
                        <div style="margin-top:10px;padding:10px;border-radius:10px;background:rgba(8,13,26,0.75);border:1px solid rgba(56,189,248,0.25);display:flex;flex-direction:column;gap:8px;">
                          <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#7DD3FC;font-weight:700;">Debatir con IA</p>
                          <textarea
                            value=${aiDrafts[note.id] || ''}
                            onInput=${e=>updateAiDraft(note.id, e.target.value)}
                            placeholder="Ej: cuestiona la idea desde la fisica, la logica o el sentido comun..."
                            style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:76px;"></textarea>
                          <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button onClick=${()=>askThoughtAI(note)}
                              style="padding:6px 10px;border-radius:8px;border:1px solid rgba(56,189,248,0.35);background:rgba(56,189,248,0.14);color:#7DD3FC;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                              ${aiLoadingNoteId === note.id ? 'PENSANDO...' : 'PREGUNTAR A GEMINI'}
                            </button>
                            <button onClick=${()=>summarizeThoughtDebate(note)}
                              style="padding:6px 10px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#34D399;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                              RESUMIR DEBATE
                            </button>
                            <button onClick=${()=>openInGemini(note)}
                              style="padding:6px 10px;border-radius:8px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                              SEGUIR EN GEMINI
                            </button>
                            <button onClick=${()=>{ setAiOpenNoteId(null); updateAiDraft(note.id, ''); }}
                              style="padding:6px 10px;border-radius:8px;border:1px solid rgba(100,116,139,0.35);background:rgba(100,116,139,0.12);color:#CBD5E1;font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                              CERRAR
                            </button>
                          </div>
                          ${aiReplies[note.id]?.length > 0 && html`
                            <div style="display:flex;flex-direction:column;gap:8px;">
                              ${aiReplies[note.id].map((item, idx) => html`
                                <div style="padding:10px;border-radius:8px;background:rgba(15,23,41,0.9);border:1px solid #1E2D45;">
                                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                                    <p style="margin:0 0 6px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Pregunta</p>
                                    <button onClick=${()=>removeAiReply(note, idx)}
                                      style="padding:0 6px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.12);color:#FCA5A5;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;cursor:pointer;line-height:18px;">
                                      X
                                    </button>
                                  </div>
                                  <p style="margin:0 0 10px;font-size:12px;color:#E2E8F0;">${item.question}</p>
                                  <p style="margin:0 0 6px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Gemini</p>
                                  <p style="margin:0;font-size:12px;color:#CBD5E1;white-space:pre-wrap;">${item.reply}</p>
                                </div>
                              `)}
                            </div>
                          `}
                        </div>
                      `}
                    `}
                  </div>
                `)}
              </div>
            `}
          <//>

          ${doneTasks.length > 0 && html`
            <${SectionAccordion}
              icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#6366F1;display:inline-block;"></span>`}
              title="Hechas recientemente"
              isOpen=${taskSectionOpen.done}
              onToggle=${()=>setTaskSectionOpen(prev => ({ ...prev, done: !prev.done }))}
            >
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${doneTasks.slice(0,5).map(task => html`
                  <div style="padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.35);border:1px solid rgba(16,185,129,0.2);display:flex;justify-content:space-between;gap:10px;">
                    <div>
                      <p style="margin:0;font-size:13px;color:#94A3B8;text-decoration:line-through;">${task.title}</p>
                      <p style="margin:4px 0 0;font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;">${formatTaskDate(task.updated_at)}</p>
                    </div>
                    <button class="btn-icon" style="background:#162035;border:1px solid rgba(245,158,11,0.35);color:#FBBF24;" onClick=${()=>updateTaskStatus(task,'pending')}>
                      ↺
                    </button>
                  </div>
                `)}
              </div>
            <//>
          `}

          ${archivedTasks.length > 0 && html`
            <${SectionAccordion}
              icon=${html`<span style="width:10px;height:10px;border-radius:999px;background:#94A3B8;display:inline-block;"></span>`}
              title="Archivadas"
              isOpen=${taskSectionOpen.archived}
              onToggle=${()=>setTaskSectionOpen(prev => ({ ...prev, archived: !prev.archived }))}
            >
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${archivedTasks.slice(0,8).map(task => html`
                  <div style="padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.35);border:1px solid rgba(148,163,184,0.2);display:flex;justify-content:space-between;gap:10px;">
                    <div>
                      <p style="margin:0;font-size:13px;color:#94A3B8;">${task.title}</p>
                      <p style="margin:4px 0 0;font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;">${formatTaskDate(task.updated_at)}</p>
                    </div>
                    <button class="btn-icon" style="background:#162035;border:1px solid rgba(99,102,241,0.35);color:#A5B4FC;" onClick=${()=>updateTaskStatus(task,'pending')}>
                      ↺
                    </button>
                  </div>
                `)}
              </div>
            <//>
          `}
        </div>
      `;
    };

    const LoginView = () => {
      const [email, setEmail] = useState('');
      const [status, setStatus] = useState('idle'); // idle | sending | sent | error
      const [msg, setMsg] = useState('');

      const handleLogin = async () => {
        if(!email.trim()) return;
        setStatus('sending');
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if(error){
          setStatus('error');
          setMsg(error.message);
        } else {
          setStatus('sent');
          setMsg('Revisa tu email - el link expira en 1 hora.');
        }
      };

      return html`
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#080D1A;">
          <div style="width:100%;max-width:360px;">
            <div style="text-align:center;margin-bottom:32px;">
              <p style="font-size:28px;font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:0.1em;color:white;margin:0;">
                ENZO <span style="color:#10B981;">TRAINING</span>
              </p>
              <p style="color:#64748b;font-size:13px;margin:8px 0 0;">Ingresa con tu email para sincronizar entre dispositivos</p>
            </div>

            ${status === 'sent' ? html`
              <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;text-align:center;">
                <p style="font-size:32px;margin:0 0 8px;">OK</p>
                <p style="color:#A7F3D0;font-size:13px;margin:0;">${msg}</p>
              </div>
            ` : html`
              <div style="display:flex;flex-direction:column;gap:12px;">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value=${email}
                  onInput=${e=>setEmail(e.target.value)}
                  onKeyDown=${e=>e.key==='Enter' && handleLogin()}
                  style="width:100%;box-sizing:border-box;background:#0F1729;border:1px solid #2A3F5F;border-radius:10px;padding:14px 16px;font-size:16px;color:white;outline:none;"
                />
                <button
                  onClick=${handleLogin}
                  disabled=${status === 'sending'}
                  style="width:100%;padding:14px;border-radius:10px;border:none;background:#10B981;color:white;font-size:14px;font-weight:700;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.08em;cursor:pointer;opacity:${status === 'sending' ? '0.7' : '1'};"
                >
                  ${status === 'sending' ? 'ENVIANDO...' : 'ENVIAR MAGIC LINK'}
                </button>
                ${status === 'error' && html`<p style="color:#EF4444;font-size:12px;text-align:center;margin:0;">${msg}</p>`}
              </div>
            `}
          </div>
        </div>
      `;
    };

    // DEBUG PANEL oculto, activar con ?debug=1
    // Estado rápido de auth, sync, service worker y conflictos
    const DebugPanel = ({ session, syncLog, outboxCount }) => {
      const [open,    setOpen]    = useState(false);
      const [swDebug, setSwDebug] = useState(null);
      const conflictInfo = metaGet('last_conflict');

      // Consultar SW al abrir el panel
      useEffect(() => {
        if(!open || !('serviceWorker' in navigator)) return;
        const onMsg = (e) => {
          if(e.data?.type === 'SW_DEBUG_RESPONSE') setSwDebug(e.data);
        };
        navigator.serviceWorker.addEventListener('message', onMsg);
        navigator.serviceWorker.ready.then(reg => {
          if(reg.active) reg.active.postMessage({ type: 'SW_DEBUG_REQUEST' });
        }).catch(() => {});
        return () => navigator.serviceWorker.removeEventListener('message', onMsg);
      }, [open]);

      if(!open) return html`
        <button onClick=${()=>setOpen(true)}
          style="position:fixed;bottom:90px;left:8px;z-index:999;width:24px;height:24px;border-radius:50%;background:rgba(99,102,241,0.3);border:1px solid rgba(99,102,241,0.5);font-size:10px;cursor:pointer;color:#6366F1;padding:0;">
          i
        </button>`;

      const swCtrl = navigator.serviceWorker?.controller ? 'OK Controlando' : 'NO controla';
      const rows = [
        ['SECCION Auth',''],
        ['User',        session?.user?.email || '-'],
        ['UID',         (session?.user?.id || '-').slice(0,8)+'...'],
        ['SECCION Sync',''],
        ['Device',      DEVICE_ID],
        ['Online',      navigator.onLine ? 'OK' : 'NO'],
        ['Outbox',      outboxCount + ' items'],
        ['Last sync',   syncLog.lastSync  || 'nunca'],
        ['Last error',  syncLog.lastError || '-'],
        ['SECCION SW',''],
        ['SW API',      'serviceWorker' in navigator ? 'OK' : 'NO'],
        ['SW estado',   'serviceWorker' in navigator ? swCtrl : '-'],
        ['SW version',  swDebug?.cacheVersion || '-'],
        ['Auth en SW',  swDebug ? (swDebug.authValid ? 'OK valida' : 'NO sin token') : '-'],
        ['Auth expiry', swDebug?.authExpiry ? new Date(swDebug.authExpiry*1000).toLocaleTimeString('es-AR') : '-'],
        ['Alertas SW',  swDebug?.scheduledCount != null ? swDebug.scheduledCount+' programadas' : '-'],
        ['Notif perm',  typeof Notification!=='undefined' ? Notification.permission : 'N/A'],
        ['SECCION Conflictos',''],
        ['Ultimo conf.', conflictInfo ? `${conflictInfo.count||1} items · ${conflictInfo.at?.slice(0,10)||'?'}` : '-'],
        ['Conf. fechas', conflictInfo?.items ? conflictInfo.items.slice(0,3).join(', ') + (conflictInfo.items.length>3 ? '...' : '') : '-'],
      ];

      return html`
        <div style="position:fixed;bottom:90px;left:8px;z-index:999;background:#0F1729;border:1px solid #2A3F5F;border-radius:10px;padding:12px;font-size:10px;font-family:'JetBrains Mono',monospace;color:#94a3b8;min-width:220px;max-width:280px;max-height:70vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#6366F1;font-weight:700;">DEBUG</span>
            <div style="display:flex;gap:6px;">
              <button onClick=${()=>flushOutbox().catch(()=>{})}
                style="background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.4);border-radius:4px;color:#10B981;font-size:9px;cursor:pointer;padding:2px 5px;">
                Retry sync
              </button>
              <button onClick=${()=>setOpen(false)} style="background:none;border:none;color:#64748b;cursor:pointer;font-size:12px;">x</button>
            </div>
          </div>
          ${rows.map(([k,v])=> k.startsWith('SECCION') ? html`
            <div style="padding:4px 0 2px;color:#6366F1;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;">${k.replace(/^SECCION\s*/, '').trim()}</div>
          ` : html`
            <div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;border-bottom:1px solid #1E2D45;">
              <span style="color:#64748b;flex-shrink:0;">${k}</span>
              <span style="color:${String(v).startsWith('NO')?'#EF4444':String(v).startsWith('OK')?'#10B981':String(v).startsWith('WARN')?'#F59E0B':'white'};text-align:right;word-break:break-all;">${v}</span>
            </div>
          `)}
        </div>
      `;
    };

    return {
      ProductivityView,
      LoginView,
      DebugPanel
    };
};
