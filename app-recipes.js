export const createRecipesView = ({
  html,
  useState,
  useEffect,
  useCallback,
  supabase,
  SWEETS_STOCK_DEFAULT,
  SWEETS_SOLD_DEFAULT,
  SWEETS_SALE_FIELDS,
  SWEETS_JAM_FIELDS,
  SWEETS_SAUCE_FIELDS,
  SWEETS_STOCK_KEY,
  pickNewestPayload,
  safeLocalSet,
  fetchJsonWithTimeout,
  parseRecipeIngredientsText,
  formatRecipeIngredientsText,
  RECIPE_KIND_META,
  recipeHasIngredientList,
  pn,
  Card,
  SectionAccordion,
  SegmentedPillGroup,
  RecipeLibraryRow,
  ISync
}) => {  return function RecipesView({session, onRecipeUpdated}) {
      const [rows, setRows] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState('');
      const [search, setSearch] = useState('');
      const [typeFilter, setTypeFilter] = useState('all');
      const [inventoryPanel, setInventoryPanel] = useState('library');
      const [editingId, setEditingId] = useState(null);
      const [saving, setSaving] = useState(false);
      const [sweetsStock, setSweetsStock] = useState(SWEETS_STOCK_DEFAULT);
      const [sweetsLoading, setSweetsLoading] = useState(true);
      const [sweetsSaving, setSweetsSaving] = useState(false);
      const [sweetsMsg, setSweetsMsg] = useState('');
      const [recipesOpen, setRecipesOpen] = useState(true);
      const [sweetsOpen, setSweetsOpen] = useState(false);
      const [soldOpen, setSoldOpen] = useState(false);
      const [salesRange, setSalesRange] = useState('all');
      const [editingSaleAt, setEditingSaleAt] = useState('');
      const [soldDraft, setSoldDraft] = useState(SWEETS_SOLD_DEFAULT);
      const [recipeAiPrompt, setRecipeAiPrompt] = useState('');
      const [recipeAiLoading, setRecipeAiLoading] = useState(false);
      const [recipeAiMsg, setRecipeAiMsg] = useState('');
      const [form, setForm] = useState({
        recipe_name: '',
        aliases: '',
        base_qty: '1',
        base_unit: 'porcion',
        track_stock: false,
        stock_qty: '',
        stock_unit: '',
        low_stock_threshold: '',
        cals: '',
        prot: '',
        carb: '',
        fat: '',
        ingredients: '',
        notes: ''
      });

      const loadRecipes = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
          const { data, error } = await supabase
            .from('user_recipes')
            .select('id, recipe_name, aliases, base_qty, base_unit, stock_qty, stock_unit, low_stock_threshold, macros, ingredients, notes, updated_at')
            .order('updated_at', { ascending: false });
          if(error) throw error;
          setRows(data || []);
        } catch(e) {
          setError(e.message || 'No se pudieron cargar las recetas.');
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        loadRecipes();
        const onFocus = () => loadRecipes();
        const onVisible = () => { if(document.visibilityState === 'visible') loadRecipes(); };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, [loadRecipes]);

      const loadSweetsStock = useCallback(async () => {
        setSweetsLoading(true);
        setSweetsMsg('');
        try {
          const local = JSON.parse(localStorage.getItem(SWEETS_STOCK_KEY) || 'null');
          const { data, error } = await supabase
            .from('app_inventory')
            .select('data, updated_at')
            .eq('key', 'sweets_sauces_stock')
            .maybeSingle();
          if(error) {
            setSweetsStock({ ...SWEETS_STOCK_DEFAULT, ...(local || {}) });
            setSweetsMsg('Stock local cargado. El guardado remoto esta restringido por permisos.');
            setSweetsMsg('Stock local cargado. El guardado remoto esta restringido por permisos.');
          }
          const freshest = pickNewestPayload(local, data?.data || null, data?.updated_at || '', {});
          const merged = { ...SWEETS_STOCK_DEFAULT, ...freshest };
          setSweetsStock(merged);
      safeLocalSet(SWEETS_STOCK_KEY, merged);
        } catch(e) {
          try {
            const local = JSON.parse(localStorage.getItem(SWEETS_STOCK_KEY) || 'null');
            setSweetsStock({ ...SWEETS_STOCK_DEFAULT, ...(local || {}) });
            setSweetsMsg('Stock local cargado.');
          } catch(_) {
            setSweetsMsg(e.message || 'No se pudo cargar el stock de dulces y salsas.');
          }
        } finally {
          setSweetsLoading(false);
        }
      }, []);

      useEffect(() => {
        loadSweetsStock();
        const onFocus = () => loadSweetsStock();
        const onVisible = () => { if(document.visibilityState === 'visible') loadSweetsStock(); };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, [loadSweetsStock]);

      const exportRecipesLibrary = () => {
        try {
          const payload = {
            app: 'enzo-training-recipes',
            exported_at: new Date().toISOString(),
            recipes: rows,
            sweets_sauces_stock: sweetsStock
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `recetas-stock-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setSweetsMsg('Biblioteca y stock exportados.');
          setTimeout(() => setSweetsMsg(''), 2500);
        } catch(e) {
          setError(e.message || 'No se pudo exportar la biblioteca.');
        }
      };

      const resetForm = () => {
        setEditingId(null);
        setRecipeAiPrompt('');
        setRecipeAiLoading(false);
        setRecipeAiMsg('');
        setForm({
          recipe_name: '',
          aliases: '',
          base_qty: '1',
          base_unit: 'porcion',
          track_stock: false,
          stock_qty: '',
          stock_unit: '',
          low_stock_threshold: '',
          cals: '',
          prot: '',
          carb: '',
          fat: '',
          ingredients: '',
          notes: ''
        });
      };

      const hydrateForm = (recipe) => {
        const hasIngredients = Array.isArray(recipe.ingredients) && recipe.ingredients.some(it => String(it?.name || '').trim());
        setEditingId(recipe.id);
        setRecipeAiPrompt('');
        setRecipeAiLoading(false);
        setRecipeAiMsg('');
        setForm({
          recipe_name: recipe.recipe_name || '',
          aliases: Array.isArray(recipe.aliases) ? recipe.aliases.join(', ') : '',
          base_qty: String(recipe.base_qty ?? 1),
          base_unit: recipe.base_unit || 'porcion',
          track_stock: !hasIngredients && (!(recipe.stock_qty == null || recipe.stock_qty === '') || !!String(recipe.stock_unit || '').trim()),
          stock_qty: recipe.stock_qty == null ? '' : String(recipe.stock_qty),
          stock_unit: recipe.stock_unit || '',
          low_stock_threshold: recipe.low_stock_threshold == null ? '' : String(recipe.low_stock_threshold),
          cals: String(Math.round(parseFloat(recipe.macros?.cals) || 0)),
          prot: String(Math.round(parseFloat(recipe.macros?.prot) || 0)),
          carb: String(Math.round(parseFloat(recipe.macros?.carb) || 0)),
          fat: String(Math.round(parseFloat(recipe.macros?.fat) || 0)),
          ingredients: formatRecipeIngredientsText(recipe.ingredients),
          notes: recipe.notes || ''
        });
      };

      const applyRecipeAiEdit = async () => {
        if(!editingId) return;
        if(!String(recipeAiPrompt || '').trim()) {
          setRecipeAiMsg('Escribi primero la instruccion para la IA.');
          return;
        }
        setRecipeAiLoading(true);
        setRecipeAiMsg('');
        try {
          const { res: response, data } = await fetchJsonWithTimeout('/.netlify/functions/edit-recipe-with-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instruction: recipeAiPrompt,
              recipe: {
                recipe_name: form.recipe_name,
                aliases: form.aliases.split(',').map(v => v.trim()).filter(Boolean),
                base_qty: form.base_qty,
                base_unit: form.base_unit,
                macros: {
                  cals: form.cals,
                  prot: form.prot,
                  carb: form.carb,
                  fat: form.fat
                },
                ingredients: parseRecipeIngredientsText(form.ingredients),
                notes: form.notes || ''
              }
            })
          });
          if(!response.ok) throw new Error(data?.error || 'No se pudo aplicar el cambio con IA.');

          const nextIngredients = Array.isArray(data.ingredients)
            ? data.ingredients.map(it => `${String(it.qty || '1 porcion').trim()} | ${String(it.name || 'Ingrediente').trim()}`).join('\n')
            : form.ingredients;

          setForm(prev => ({
            ...prev,
            recipe_name: String(data.recipe_name || prev.recipe_name || '').trim(),
            base_qty: String(data.base_qty ?? prev.base_qty ?? '1'),
            base_unit: String(data.base_unit || prev.base_unit || 'porcion').trim() || 'porcion',
            cals: String(Math.max(0, Math.round(parseFloat(data.macros?.cals) || 0))),
            prot: String(Math.max(0, Math.round(parseFloat(data.macros?.prot) || 0))),
            carb: String(Math.max(0, Math.round(parseFloat(data.macros?.carb) || 0))),
            fat: String(Math.max(0, Math.round(parseFloat(data.macros?.fat) || 0))),
            ingredients: nextIngredients,
            notes: String(data.notes ?? prev.notes ?? '').trim()
          }));
          setRecipeAiMsg('Cambios aplicados al formulario.');
        } catch(e) {
          setRecipeAiMsg(e.message || 'No se pudo aplicar el cambio con IA.');
        } finally {
          setRecipeAiLoading(false);
        }
      };

      const saveRecipe = async () => {
        if(!form.recipe_name.trim()) return;
        setSaving(true);
        setError('');
        try {
          const ingredients = parseRecipeIngredientsText(form.ingredients);
          const canTrackStock = ingredients.length === 0;
          const payload = {
            recipe_name: form.recipe_name.trim(),
            aliases: form.aliases.split(',').map(v => v.trim()).filter(Boolean),
            base_qty: parseFloat(String(form.base_qty).replace(',', '.')) || 1,
            base_unit: form.base_unit.trim() || 'porcion',
            stock_qty: (canTrackStock && form.track_stock) ? (form.stock_qty === '' ? null : (parseFloat(String(form.stock_qty).replace(',', '.')) || 0)) : null,
            stock_unit: (canTrackStock && form.track_stock) ? (form.stock_unit.trim() || null) : null,
            low_stock_threshold: (canTrackStock && form.track_stock) ? (form.low_stock_threshold === '' ? null : (parseFloat(String(form.low_stock_threshold).replace(',', '.')) || 0)) : null,
            macros: {
              cals: Math.max(0, Math.round(parseFloat(form.cals) || 0)),
              prot: Math.max(0, Math.round(parseFloat(form.prot) || 0)),
              carb: Math.max(0, Math.round(parseFloat(form.carb) || 0)),
              fat: Math.max(0, Math.round(parseFloat(form.fat) || 0))
            },
            ingredients,
            notes: form.notes.trim() || null,
            updated_at: new Date().toISOString()
          };

          if(editingId) {
            const { data, error } = await supabase.from('user_recipes')
              .update(payload)
              .eq('id', editingId)
              .select()
              .single();
            if(error) throw error;
            setRows(prev => prev.map(r => r.id === editingId ? data : r));
            onRecipeUpdated?.(data);
          } else {
            const { data, error } = await supabase.from('user_recipes')
              .insert(payload)
              .select()
              .single();
            if(error) throw error;
            setRows(prev => [data, ...prev]);
          }
          resetForm();
        } catch(e) {
          setError(e.message || 'No se pudo guardar.');
        } finally {
          setSaving(false);
        }
      };

      const updateSweetsField = (key, value) => {
        setSweetsStock(prev => ({ ...prev, [key]: value }));
      };
      const updateSoldField = (key, value) => {
        setSoldDraft(prev => ({ ...prev, [key]: value }));
      };
      const normalizeSaleDraft = (draft, currentStock) => {
        const soldEntries = [];
        SWEETS_SALE_FIELDS.forEach(([key]) => {
          const sold = parseFloat(String(draft[key] || '').replace(',', '.')) || 0;
          if(sold > 0) soldEntries.push({ key, qty: sold });
        });
        const otherSold = parseFloat(String(draft.otro_dulce_stock || '').replace(',', '.')) || 0;
        if(otherSold > 0 && currentStock.otro_dulce_nombre) {
          soldEntries.push({ key: currentStock.otro_dulce_nombre, qty: otherSold });
        }
        return soldEntries;
      };
      const stockAfterRemovingSale = (baseStock, target) => {
        const next = { ...baseStock };
        (target?.items || []).forEach(item => {
          const key = String(item?.key || '').trim();
          const qty = pn(item?.qty);
          if(!(qty > 0) || !key) return;
          if(['damasco','durazno','ciruela','pera','alcayota','tomate_triturado','tomate_entero'].includes(key)) {
            next[key] = String((pn(next[key]) || 0) + qty);
            return;
          }
          if(String(next.otro_dulce_nombre || '').trim().toLowerCase() === key.toLowerCase()) {
            next.otro_dulce_stock = String((pn(next.otro_dulce_stock) || 0) + qty);
          }
        });
        return next;
      };
      const persistSweetsPayload = async (payload, okMsg) => {
        const stampedPayload = { ...payload, _updatedAt: new Date().toISOString() };
        safeLocalSet(SWEETS_STOCK_KEY, stampedPayload);
        const { error } = await supabase
          .from('app_inventory')
          .upsert({
            key: 'sweets_sauces_stock',
            data: stampedPayload,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
        if(error) {
            setSweetsMsg(`${okMsg} Guardado local porque el remoto esta restringido por permisos.`);
          } else {
            setSweetsMsg(okMsg);
          }
        setTimeout(() => setSweetsMsg(''), 2500);
      };

      const saveSweetsStock = async () => {
        setSweetsSaving(true);
        setSweetsMsg('');
        try {
          const payload = { ...SWEETS_STOCK_DEFAULT, ...sweetsStock, _updatedAt: new Date().toISOString() };
          safeLocalSet(SWEETS_STOCK_KEY, payload);
          const { error } = await supabase
            .from('app_inventory')
            .upsert({
              key: 'sweets_sauces_stock',
              data: payload,
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
          if(error) {
            setSweetsMsg('Stock guardado en este dispositivo. El guardado remoto esta restringido por permisos.');
          } else {
            setSweetsMsg('Stock de dulces y salsas guardado.');
          }
          setTimeout(() => setSweetsMsg(''), 2500);
        } catch(e) {
          setSweetsMsg('Stock guardado en este dispositivo.');
        } finally {
          setSweetsSaving(false);
        }
      };

      const registerSoldSweets = async () => {
        setSweetsSaving(true);
        setSweetsMsg('');
        try {
          const history = Array.isArray(sweetsStock.sales_history) ? sweetsStock.sales_history : [];
          const previousEntry = editingSaleAt ? history.find(entry => entry?.at === editingSaleAt) : null;
          const base = previousEntry ? stockAfterRemovingSale(sweetsStock, previousEntry) : { ...sweetsStock };
          const next = { ...base };
          const soldEntries = normalizeSaleDraft(soldDraft, base);
          SWEETS_SALE_FIELDS.forEach(([key]) => {
            const sold = parseFloat(String(soldDraft[key] || '').replace(',', '.')) || 0;
            const current = parseFloat(String(base[key] || '').replace(',', '.')) || 0;
            next[key] = String(Math.max(0, current - sold));
          });
          const otherSold = parseFloat(String(soldDraft.otro_dulce_stock || '').replace(',', '.')) || 0;
          const otherCurrent = parseFloat(String(base.otro_dulce_stock || '').replace(',', '.')) || 0;
          next.otro_dulce_stock = String(Math.max(0, otherCurrent - otherSold));
          next.sales_history = [
            {
              at: editingSaleAt || new Date().toISOString(),
              items: soldEntries
            },
            ...history.filter(entry => entry?.at !== editingSaleAt)
          ].slice(0, 20);
          setSweetsStock(next);
          await persistSweetsPayload({ ...SWEETS_STOCK_DEFAULT, ...next }, editingSaleAt ? 'Venta actualizada.' : 'Venta descontada del stock.');
          setSoldDraft(SWEETS_SOLD_DEFAULT);
          setEditingSaleAt('');
          setSoldOpen(false);
        } catch(e) {
          setSweetsMsg('No se pudo descontar la venta.');
        } finally {
          setSweetsSaving(false);
        }
      };

      const editSalesEntry = (entry) => {
        const nextDraft = { ...SWEETS_SOLD_DEFAULT };
        (entry?.items || []).forEach(item => {
          const key = String(item?.key || '').trim();
          const qty = item?.qty == null ? '' : String(item.qty);
          if(SWEETS_SALE_FIELDS.some(([fieldKey]) => fieldKey === key)) {
            nextDraft[key] = qty;
            return;
          }
          if(String(sweetsStock.otro_dulce_nombre || '').trim().toLowerCase() === key.toLowerCase()) {
            nextDraft.otro_dulce_stock = qty;
          }
        });
        setSoldDraft(nextDraft);
        setEditingSaleAt(entry?.at || '');
        setSoldOpen(true);
      };

      const deleteSalesEntry = async (entryAt) => {
        if(!entryAt) return;
        setSweetsSaving(true);
        setSweetsMsg('');
        try {
          const history = Array.isArray(sweetsStock.sales_history) ? sweetsStock.sales_history : [];
          const target = history.find(entry => entry?.at === entryAt);
          if(!target) return;

          const next = { ...sweetsStock };
          (target.items || []).forEach(item => {
            const key = String(item?.key || '').trim();
            const qty = pn(item?.qty);
            if(!(qty > 0) || !key) return;

            if(['damasco','durazno','ciruela','pera','alcayota','tomate_triturado','tomate_entero'].includes(key)) {
              next[key] = String((pn(next[key]) || 0) + qty);
              return;
            }
            if(String(next.otro_dulce_nombre || '').trim().toLowerCase() === key.toLowerCase()) {
              next.otro_dulce_stock = String((pn(next.otro_dulce_stock) || 0) + qty);
            }
          });

          next.sales_history = history.filter(entry => entry?.at !== entryAt);
          setSweetsStock(next);
          await persistSweetsPayload({ ...SWEETS_STOCK_DEFAULT, ...next }, 'Venta borrada y stock repuesto.');
          if(editingSaleAt === entryAt) {
            setEditingSaleAt('');
            setSoldDraft(SWEETS_SOLD_DEFAULT);
          }
        } catch(e) {
          setSweetsMsg('No se pudo borrar la venta.');
        } finally {
          setSweetsSaving(false);
        }
      };

      const deleteRecipe = async (id) => {
        try {
          const { error } = await supabase.from('user_recipes').delete().eq('id', id);
          if(error) throw error;
          setRows(prev => prev.filter(r => r.id !== id));
          if(editingId === id) resetForm();
        } catch(e) {
          setError(e.message || 'No se pudo borrar.');
        }
      };

      const isCondimentLike = (recipe) => {
        const hay = [
          recipe?.recipe_name || '',
          Array.isArray(recipe?.aliases) ? recipe.aliases.join(' ') : '',
          recipe?.notes || ''
        ].join(' ').toLowerCase();
        return [
          'sal', 'pimienta', 'oregano', 'orégano', 'aji', 'ají', 'ajo', 'perejil',
          'aceite', 'aderezo', 'picante', 'paprika', 'comino', 'curcuma', 'cúrcuma'
        ].some(token => hay.includes(token));
      };

      const classifyRecipe = (recipe) => {
        if(Array.isArray(recipe.ingredients) && recipe.ingredients.some(it => String(it?.name || '').trim())) return 'receta';
        if(isCondimentLike(recipe)) return 'condimento';
        return 'ingrediente';
      };
      const kindMeta = (kind) => RECIPE_KIND_META[kind] || { label:kind, color:'#94A3B8' };

      const libraryTypeFilter = inventoryPanel === 'library' ? typeFilter : 'all';
      const showingLibrary = inventoryPanel === 'library';
      const showingSweets = inventoryPanel === 'sweets';

      const filtered = rows.filter(recipe => {
        const kind = classifyRecipe(recipe);
        const hay = [
          recipe.recipe_name || '',
          Array.isArray(recipe.aliases) ? recipe.aliases.join(' ') : '',
          Array.isArray(recipe.ingredients) ? recipe.ingredients.map(it => `${it.qty || ''} ${it.name || ''}`).join(' ') : '',
          recipe.notes || ''
        ].join(' ').toLowerCase();
        if(libraryTypeFilter !== 'all' && kind !== libraryTypeFilter) return false;
        if(search.trim() && !hay.includes(search.trim().toLowerCase())) return false;
        return true;
      });
      const salesHistory = Array.isArray(sweetsStock.sales_history) ? sweetsStock.sales_history : [];
      const now = new Date();
      const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0);
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); startOfWeek.setHours(0,0,0,0);
      const sumSales = (entries) => entries.reduce((acc, entry) => {
        const items = Array.isArray(entry?.items) ? entry.items : [];
        acc.movements += 1;
        acc.units += items.reduce((a, item) => a + (pn(item?.qty) || 0), 0);
        return acc;
      }, { movements:0, units:0 });
      const todaySales = sumSales(salesHistory.filter(entry => {
        const at = entry?.at ? new Date(entry.at) : null;
        return at && !Number.isNaN(at.getTime()) && at >= startOfToday;
      }));
      const weekSales = sumSales(salesHistory.filter(entry => {
        const at = entry?.at ? new Date(entry.at) : null;
        return at && !Number.isNaN(at.getTime()) && at >= startOfWeek;
      }));
      const filteredSalesHistory = salesHistory.filter(entry => {
        const at = entry?.at ? new Date(entry.at) : null;
        if(!at || Number.isNaN(at.getTime())) return false;
        if(salesRange === 'today') return at >= startOfToday;
        if(salesRange === 'week') return at >= startOfWeek;
        return true;
      });
      const topSellerMap = filteredSalesHistory.reduce((acc, entry) => {
        (entry.items || []).forEach(item => {
          const key = String(item?.key || '').trim();
          if(!key) return;
          acc[key] = (acc[key] || 0) + (pn(item?.qty) || 0);
        });
        return acc;
      }, {});
      const topSeller = Object.entries(topSellerMap).sort((a,b) => b[1] - a[1])[0] || null;

      return html`
        <div style="display:flex;flex-direction:column;gap:12px;">
          <${Card}>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${[
                ['library','Biblioteca'],
                ['sweets','Dulces y salsas']
              ].map(([id,label]) => html`
                <button onClick=${()=>setInventoryPanel(id)} style=${`padding:8px 12px;border-radius:999px;border:1px solid ${inventoryPanel===id?'rgba(16,185,129,0.35)':'rgba(30,45,69,1)'};background:${inventoryPanel===id?'rgba(16,185,129,0.12)':'rgba(8,13,26,0.45)'};color:${inventoryPanel===id?'#86EFAC':'#94A3B8'};font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;`}>
                  ${label}
                </button>
              `)}
            </div>
          <//>

          ${showingLibrary && html`
          <${SectionAccordion}
            icon=${html`<span style="width:12px;height:12px;border-radius:50%;background:#10B981;box-shadow:0 0 10px rgba(16,185,129,0.4);"></span>`}
            title="Recetas e ingredientes"
            isOpen=${recipesOpen}
            onToggle=${()=>setRecipesOpen(v=>!v)}
          >
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <p style="margin:0;font-size:12px;color:#64748b;">Carga comidas o ingredientes con macros conocidos. Si escribis ese nombre en una comida, la app lo usa antes que Gemini.</p>
                <div style="display:flex;gap:8px;align-items:center;">
                  <button onClick=${exportRecipesLibrary} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.12);color:#7DD3FC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                    EXPORTAR
                  </button>
                  <button class="btn-icon" style="background:#162035;border:1px solid #1E2D45;" onClick=${loadRecipes}>
                    <${ISync} s=${16}/>
                  </button>
                </div>
              </div>
              ${error && html`<div style="padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);color:#FCA5A5;font-size:12px;">${error}</div>`}
              <div style="display:flex;flex-direction:column;gap:8px;">
                <input class="inp" value=${form.recipe_name} onInput=${e=>setForm(prev => ({ ...prev, recipe_name:e.target.value }))} placeholder="Nombre: arroz con pollo casero, avena, banana..." />
                <p style="margin:0;font-size:11px;color:#94A3B8;">Nombre: como lo vas a escribir despues en la comida. Puede ser singular o plural.</p>
                <input class="inp" value=${form.aliases} onInput=${e=>setForm(prev => ({ ...prev, aliases:e.target.value }))} placeholder="Alias separados por coma (opcional)" />
                <p style="margin:0;font-size:11px;color:#94A3B8;">Alias: variantes que tambien queres que reconozca, por ejemplo huevo, huevos o maple de huevos.</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                  <input class="inp" value=${form.base_qty} onInput=${e=>setForm(prev => ({ ...prev, base_qty:e.target.value }))} placeholder="Cantidad base" />
                  <input class="inp" value=${form.base_unit} onInput=${e=>setForm(prev => ({
                    ...prev,
                    base_unit:e.target.value,
                    stock_unit: (!prev.stock_unit || prev.stock_unit === prev.base_unit) ? e.target.value : prev.stock_unit
                  }))} placeholder="Unidad base (g, porcion, unidad...)" />
                </div>
                <p style="margin:0;font-size:11px;color:#94A3B8;">Cantidad base + unidad base: la porcion sobre la que cargas los macros. Ejemplo: 1 unidad, 100 g, 1 porcion.</p>
                <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(15,23,41,0.55);border:1px solid #1E2D45;">
                  <input
                    type="checkbox"
                    checked=${!!form.track_stock}
                    onChange=${e=>setForm(prev => ({
                      ...prev,
                      track_stock: e.target.checked,
                      stock_qty: e.target.checked ? prev.stock_qty : '',
                      stock_unit: e.target.checked ? (prev.stock_unit || prev.base_unit || '') : '',
                      low_stock_threshold: e.target.checked ? prev.low_stock_threshold : ''
                    }))}
                  />
                  <div>
                    <p style="margin:0;font-size:12px;color:#E2E8F0;font-weight:700;">Controlar stock en casa</p>
                    <p style="margin:2px 0 0;font-size:11px;color:#94A3B8;">Activarlo solo si queres que este item descuente inventario al usarlo.</p>
                  </div>
                </label>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                  <input class="inp" value=${form.stock_qty} disabled=${!form.track_stock} onInput=${e=>setForm(prev => ({ ...prev, stock_qty:e.target.value }))} placeholder="Stock actual" />
                  <input class="inp" value=${form.stock_unit} disabled=${!form.track_stock} onInput=${e=>setForm(prev => ({ ...prev, stock_unit:e.target.value }))} placeholder="Unidad stock" />
                  <input class="inp" value=${form.low_stock_threshold} disabled=${!form.track_stock} onInput=${e=>setForm(prev => ({ ...prev, low_stock_threshold:e.target.value }))} placeholder="Minimo de reposicion" />
                </div>
                <p style="margin:0;font-size:11px;color:#94A3B8;">Stock actual: cuanto te queda en casa ahora mismo. Unidad stock: en que lo medis para descontar, por ejemplo g, porcion o unidad.</p>
                <p style="margin:0;font-size:11px;color:#94A3B8;">Si esta opcion esta apagada, el item sirve para macros y reconocimiento, pero no mueve stock. Ideal para cumpleaños, comidas afuera o cosas que no compras para tu casa.</p>
                <p style="margin:0;font-size:11px;color:#94A3B8;">Además, el descuento automático de stock queda pensado para ingredientes simples como huevo, pollo, arvejas o lentejas. Las recetas compuestas no descuentan stock automático.</p>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                  <input class="inp" value=${form.cals} onInput=${e=>setForm(prev => ({ ...prev, cals:e.target.value }))} placeholder="Kcal" />
                  <input class="inp" value=${form.prot} onInput=${e=>setForm(prev => ({ ...prev, prot:e.target.value }))} placeholder="P" />
                  <input class="inp" value=${form.carb} onInput=${e=>setForm(prev => ({ ...prev, carb:e.target.value }))} placeholder="C" />
                  <input class="inp" value=${form.fat} onInput=${e=>setForm(prev => ({ ...prev, fat:e.target.value }))} placeholder="G" />
                </div>
                <p style="margin:0;font-size:11px;color:#94A3B8;">Macros: los valores conocidos para esa cantidad base.</p>
                <textarea value=${form.ingredients} onInput=${e=>setForm(prev => ({ ...prev, ingredients:e.target.value }))} placeholder="Ingredientes, una linea por item. Formato: cantidad | nombre" style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:12px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:88px;"></textarea>
                <p style="margin:0;font-size:11px;color:#94A3B8;">Ingredientes: útil si es una receta compuesta. Si es un ingrediente simple, lo podés dejar vacío.</p>
                <p style="margin:0;font-size:11px;color:#94A3B8;">Nota: aclaraciones tuyas, por ejemplo marca, cocido/crudo o donde lo compras.</p>
                ${editingId && html`
                  <div style="padding:10px;border-radius:10px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.22);display:flex;flex-direction:column;gap:8px;">
                    <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#A5B4FC;">IA para editar receta</p>
                    <p style="margin:0;font-size:11px;color:#94A3B8;">Escribi cambios naturales, por ejemplo: bajale 10 g de carne y recalcula las macros.</p>
                    <textarea value=${recipeAiPrompt} onInput=${e=>setRecipeAiPrompt(e.target.value)} placeholder="Ej: bajale 10 g de carne a la receta y ajusta las macros" style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:12px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:64px;"></textarea>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                      <button onClick=${applyRecipeAiEdit} disabled=${recipeAiLoading} style=${`padding:8px 12px;border-radius:8px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.16);color:#C7D2FE;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:${recipeAiLoading?'not-allowed':'pointer'};letter-spacing:0.06em;opacity:${recipeAiLoading?'0.7':'1'};`}>
                        ${recipeAiLoading ? 'APLICANDO...' : 'APLICAR CON IA'}
                      </button>
                      ${recipeAiMsg && html`<span style="font-size:11px;color:${String(recipeAiMsg).includes('aplicados')?'#86EFAC':'#FCA5A5'};">${recipeAiMsg}</span>`}
                    </div>
                  </div>
                `}
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button onClick=${saveRecipe} style="padding:8px 12px;border-radius:8px;border:none;background:#10B981;color:#041018;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.06em;">
                    ${saving ? 'GUARDANDO...' : (editingId ? 'GUARDAR CAMBIOS' : 'AGREGAR A LA BIBLIOTECA')}
                  </button>
                  ${editingId && html`
                    <button onClick=${resetForm} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(100,116,139,0.35);background:rgba(100,116,139,0.12);color:#CBD5E1;font-size:12px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                      CANCELAR
                    </button>
                  `}
                </div>
              </div>

              <${Card}>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <input class="inp" value=${search} onInput=${e=>setSearch(e.target.value)} placeholder="Buscar por nombre..." />
                  <${SegmentedPillGroup}
                    options=${[['all','Todo'],['ingrediente','Ingredientes'],['condimento','Condimentos'],['receta','Recetas']]}
                    value=${typeFilter}
                    onChange=${setTypeFilter}
                  />
                </div>
              <//>

              <${Card}>
                <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Biblioteca</p>
                ${loading ? html`<p style="margin:0;color:#64748b;font-size:12px;">Cargando...</p>` : filtered.length === 0 ? html`<p style="margin:0;color:#64748b;font-size:12px;">Todavia no hay elementos cargados.</p>` : html`
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    ${filtered.map(recipe => html`<${RecipeLibraryRow} recipe=${recipe} classifyRecipe=${classifyRecipe} recipeHasIngredientList=${recipeHasIngredientList} onEdit=${hydrateForm} onDelete=${deleteRecipe} />`)}
                  </div>
                `}
              <//>
            </div>
          <//>

          `}

          ${showingSweets && html`
          <${SectionAccordion}
            icon=${html`<span style="width:12px;height:12px;border-radius:50%;background:#F59E0B;box-shadow:0 0 10px rgba(245,158,11,0.4);"></span>`}
            title="Dulces y Salsas"
            isOpen=${sweetsOpen}
            onToggle=${()=>setSweetsOpen(v=>!v)}
          >
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <p style="margin:0;font-size:12px;color:#64748b;">Stock de venta para saber cuantos te van quedando. Este bloque no se usa para las macros de comida.</p>
                <button class="btn-icon" style="background:#162035;border:1px solid #1E2D45;" onClick=${loadSweetsStock}>
                  <${ISync} s=${16}/>
                </button>
              </div>
              ${sweetsMsg && html`<div style="padding:8px 10px;border-radius:8px;background:${String(sweetsMsg).includes('guardado')?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)'};border:1px solid ${String(sweetsMsg).includes('guardado')?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'};color:${String(sweetsMsg).includes('guardado')?'#86EFAC':'#FCA5A5'};font-size:12px;">${sweetsMsg}</div>`}
              ${sweetsLoading ? html`
                <p style="margin:0;color:#64748b;font-size:12px;">Cargando stock...</p>
              ` : html`
                <div style="display:flex;flex-direction:column;gap:10px;">
                  <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Dulces</p>
                  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                    ${SWEETS_JAM_FIELDS.map(([key,label]) => html`
                      <label style="display:flex;flex-direction:column;gap:4px;">
                        <span style="font-size:11px;color:#CBD5E1;">${label}</span>
                        <input class="inp" value=${sweetsStock[key] || ''} onInput=${e=>updateSweetsField(key, e.target.value)} placeholder="Cantidad" />
                      </label>
                    `)}
                  </div>
                  <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">
                    <label style="display:flex;flex-direction:column;gap:4px;">
                      <span style="font-size:11px;color:#CBD5E1;">Otro dulce</span>
                      <input class="inp" value=${sweetsStock.otro_dulce_nombre || ''} onInput=${e=>updateSweetsField('otro_dulce_nombre', e.target.value)} placeholder="Ej: higo, frutilla..." />
                    </label>
                    <label style="display:flex;flex-direction:column;gap:4px;">
                      <span style="font-size:11px;color:#CBD5E1;">Stock</span>
                      <input class="inp" value=${sweetsStock.otro_dulce_stock || ''} onInput=${e=>updateSweetsField('otro_dulce_stock', e.target.value)} placeholder="Cantidad" />
                    </label>
                  </div>
                  <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Salsas</p>
                  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                    ${SWEETS_SAUCE_FIELDS.map(([key,label]) => html`
                      <label style="display:flex;flex-direction:column;gap:4px;">
                        <span style="font-size:11px;color:#CBD5E1;">${label}</span>
                        <input class="inp" value=${sweetsStock[key] || ''} onInput=${e=>updateSweetsField(key, e.target.value)} placeholder="Cantidad" />
                      </label>
                    `)}
                  </div>
                  <p style="margin:0;font-size:11px;color:#94A3B8;">Carga la cantidad que te queda de cada variedad. Si vendes otra mermelada o dulce, usa la casilla de Otro dulce.</p>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button onClick=${()=>setSoldOpen(v=>!v)} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.06em;">
                      ${soldOpen ? 'CERRAR VENTA' : 'VENDI'}
                    </button>
                    <button onClick=${saveSweetsStock} style="padding:8px 12px;border-radius:8px;border:none;background:#F59E0B;color:#041018;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.06em;">
                      ${sweetsSaving ? 'GUARDANDO...' : 'GUARDAR STOCK'}
                    </button>
                  </div>
                  ${soldOpen && html`
                    <div style="margin-top:6px;padding:10px;border-radius:8px;background:rgba(15,23,41,0.7);border:1px solid rgba(99,102,241,0.22);display:flex;flex-direction:column;gap:10px;">
                      <p style="margin:0;font-size:11px;color:#C7D2FE;">${editingSaleAt ? 'Edita la venta y al guardar se reajusta el stock.' : 'Indica cuanto vendiste de cada uno. Si un campo queda vacio, cuenta como 0.'}</p>
                      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                        ${SWEETS_SALE_FIELDS.map(([key,label]) => html`
                          <label style="display:flex;flex-direction:column;gap:4px;">
                            <span style="font-size:11px;color:#CBD5E1;">${label}</span>
                            <input class="inp" value=${soldDraft[key] || ''} onInput=${e=>updateSoldField(key, e.target.value)} placeholder="Vendidos" />
                          </label>
                        `)}
                      </div>
                      ${sweetsStock.otro_dulce_nombre && html`
                        <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">
                          <div style="display:flex;flex-direction:column;gap:4px;">
                            <span style="font-size:11px;color:#CBD5E1;">${sweetsStock.otro_dulce_nombre}</span>
                            <span style="font-size:10px;color:#64748b;">Otro dulce cargado</span>
                          </div>
                          <label style="display:flex;flex-direction:column;gap:4px;">
                            <span style="font-size:11px;color:#CBD5E1;">Vendidos</span>
                            <input class="inp" value=${soldDraft.otro_dulce_stock || ''} onInput=${e=>updateSoldField('otro_dulce_stock', e.target.value)} placeholder="Vendidos" />
                          </label>
                        </div>
                      `}
                      <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button onClick=${registerSoldSweets} style="padding:8px 12px;border-radius:8px;border:none;background:#6366F1;color:#F8FAFC;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.06em;">
                          ${editingSaleAt ? 'GUARDAR CAMBIOS' : 'DESCONTAR VENTA'}
                        </button>
                        ${editingSaleAt && html`
                          <button onClick=${()=>{ setEditingSaleAt(''); setSoldDraft(SWEETS_SOLD_DEFAULT); setSoldOpen(false); }} style="padding:8px 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.35);background:rgba(148,163,184,0.12);color:#CBD5E1;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.06em;">
                            CANCELAR
                          </button>
                        `}
                      </div>
                    </div>
                  `}
                  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                    ${[
                      { label:'Hoy', movements: todaySales.movements, units: todaySales.units, color:'#10B981' },
                      { label:'Semana', movements: weekSales.movements, units: weekSales.units, color:'#38BDF8' }
                    ].map(block => html`
                      <div style="padding:10px;border-radius:8px;background:rgba(15,23,41,0.72);border:1px solid #1E2D45;">
                        <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Ventas ${block.label}</p>
                        <p style=${`margin:0;font-size:18px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${block.color};`}>${block.units}</p>
                        <p style="margin:4px 0 0;font-size:11px;color:#64748b;">${block.movements} movimiento(s)</p>
                      </div>
                    `)}
                  </div>
                  <div style="margin-top:6px;padding:10px;border-radius:8px;background:rgba(8,13,26,0.45);border:1px solid #1E2D45;display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                      <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Historial de ventas</p>
                      <select class="inp" value=${salesRange} onChange=${e=>setSalesRange(e.target.value)} style="max-width:140px;">
                        <option value="all">Todo</option>
                        <option value="today">Hoy</option>
                        <option value="week">Semana</option>
                      </select>
                    </div>
                    <div style="padding:8px 10px;border-radius:8px;background:rgba(15,23,41,0.7);border:1px solid rgba(56,189,248,0.18);">
                      <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Mas vendido</p>
                      <p style="margin:4px 0 0;font-size:13px;color:#E2E8F0;font-weight:700;">
                        ${topSeller ? `${topSeller[0]} · ${topSeller[1]}` : 'Sin ventas en este rango'}
                      </p>
                    </div>
                    ${!(filteredSalesHistory.length) ? html`
                      <p style="margin:0;color:#64748b;font-size:12px;">Todavia no hay ventas registradas.</p>
                    ` : html`
                      <div style="display:flex;flex-direction:column;gap:6px;">
                        ${filteredSalesHistory.slice(0, 8).map(entry => html`
                          <div style="padding:8px 10px;border-radius:8px;background:rgba(15,23,41,0.7);border:1px solid rgba(99,102,241,0.18);">
                            <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
                              <div style="flex:1;">
                                <p style="margin:0 0 4px;font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;">${entry.at ? new Date(entry.at).toLocaleString('es-AR') : ''}</p>
                                <p style="margin:0;font-size:12px;color:#E2E8F0;white-space:pre-wrap;">
                                  ${(entry.items || []).map(item => `${item.key}: ${item.qty}`).join(' · ') || 'Venta sin detalle'}
                                </p>
                              </div>
                              <div style="display:flex;flex-direction:column;gap:6px;">
                                <button onClick=${()=>editSalesEntry(entry)} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                                  EDITAR
                                </button>
                                <button onClick=${()=>deleteSalesEntry(entry.at)} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.12);color:#FCA5A5;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                                  BORRAR
                                </button>
                              </div>
                            </div>
                          </div>
                        `)}
                      </div>
                    `}
                  </div>
                </div>
              `}
            </div>
          <//>
          `}
        </div>
      `;
  };
};
