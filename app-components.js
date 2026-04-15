// ═══════════════════════════════════════════════════
//  SVG ICONS (inline, sin dependencias)
//  NOTA: Las versiones exportadas requieren html como prop.
//  Las versiones sin-prop se crean dentro de createAppComponents.
// ═══════════════════════════════════════════════════
export const Icon = ({html, d, s=18, c=''}) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class=${c}>${d}</svg>`;
export const IPlay    = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<polygon points="5 3 19 12 5 21 5 3"/>`}/>`;
export const IPause   = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`}/>`;
export const IReset   = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>`}/>`;
export const ICheck   = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<polyline points="20 6 9 17 4 12"/>`}/>`;
export const IClock   = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`}/>`;
export const IChevD   = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<polyline points="6 9 12 15 18 9"/>`}/>`;
export const IChevL   = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<polyline points="15 18 9 12 15 6"/>`}/>`;
export const IChevR   = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<polyline points="9 18 15 12 9 6"/>`}/>`;
export const ISync    = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`}/>`;
export const IHome    = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`}/>`;
export const ICal     = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`}/>`;
export const IBar     = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`}/>`;
export const ITarget  = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`}/>`;
export const IBook    = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`}/>`;
export const IBell    = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`}/>`;
export const IEdit    = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`}/>`;
export const IList    = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`}/>`;
export const IDumb    = ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<path d="M6 5v14M18 5v14"/><path d="M6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3M18 8h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3"/><rect x="6" y="11" width="12" height="2" rx="1"/>`}/>`;
export const IActivity= ({html, s,c}) => html`<${Icon} html=${html} s=${s} c=${c} d=${html`<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`}/>`;

// ═══════════════════════════════════════════════════
//  COMPONENTES BASE (requieren html como prop — versiones legacy)
// ═══════════════════════════════════════════════════
export const Card = ({html, children, style=''}) => html`<div class="glass-card" style=${`padding:16px;${style}`}>${children}</div>`;

export const SectionAccordion = ({html, icon, title, isOpen, onToggle, children}) => html`
  <div class="glass-card" style="overflow:hidden;">
    <button class="section-toggle" onClick=${onToggle}>
      <span style="display:flex;align-items:center;gap:8px;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;letter-spacing:0.05em;">
        ${icon}${title}
      </span>
      <${IChevD} html=${html} s=${18} c=${`chev ${isOpen?'open':''}`}/>
    </button>
    ${isOpen && html`
      <div style="padding:16px;border-top:1px solid #1E2D45;">
        ${children}
      </div>
    `}
  </div>
`;

export const Inp = ({html, label, value, onChange, placeholder, type='text'}) => html`
  <div>
    ${label && html`<label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">${label}</label>`}
    <input type=${type} value=${value} onInput=${e=>onChange(e.target.value)} placeholder=${placeholder||''}
      class="inp" />
  </div>
`;

export const CheckRow = ({html, label, checked, onChange, children}) => html`
  <div style="display:flex;flex-direction:column;gap:8px;">
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;min-height:44px;">
      <input type="checkbox" checked=${checked} onChange=${e=>onChange(e.target.checked)} />
      <span style="font-size:14px;color:#cbd5e1;">${label}</span>
    </label>
    ${checked && html`<div style="padding-left:28px;display:flex;flex-direction:column;gap:8px;">${children}</div>`}
  </div>
`;

// ═══════════════════════════════════════════════════
//  createAppComponents: factory que captura `html` por closure
//  y devuelve versiones de iconos/componentes que NO necesitan
//  recibir `html` como prop — para uso en view modules.
// ═══════════════════════════════════════════════════
export const createAppComponents = ({
  html,
  ICheck: _ICheck,
  RECIPE_KIND_META,
  priorityColor,
  categoryMeta,
  recurrenceLabel,
  formatTaskDate
}) => {

  // ─── Iconos con html en closure ───
  const _Icon = ({d, s=18, c=''}) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class=${c}>${d}</svg>`;
  const BoundIPlay    = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<polygon points="5 3 19 12 5 21 5 3"/>`}/>`;
  const BoundIPause   = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`}/>`;
  const BoundIReset   = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>`}/>`;
  const BoundICheck   = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<polyline points="20 6 9 17 4 12"/>`}/>`;
  const BoundIClock   = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`}/>`;
  const BoundIChevD   = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<polyline points="6 9 12 15 18 9"/>`}/>`;
  const BoundIChevL   = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<polyline points="15 18 9 12 15 6"/>`}/>`;
  const BoundIChevR   = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<polyline points="9 18 15 12 9 6"/>`}/>`;
  const BoundISync    = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`}/>`;
  const BoundIHome    = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`}/>`;
  const BoundICal     = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`}/>`;
  const BoundIBar     = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`}/>`;
  const BoundITarget  = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`}/>`;
  const BoundIBook    = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`}/>`;
  const BoundIBell    = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`}/>`;
  const BoundIEdit    = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`}/>`;
  const BoundIList    = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`}/>`;
  const BoundIDumb    = ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<path d="M6 5v14M18 5v14"/><path d="M6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3M18 8h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-3"/><rect x="6" y="11" width="12" height="2" rx="1"/>`}/>`;
  const BoundIActivity= ({s,c}) => html`<${_Icon} s=${s} c=${c} d=${html`<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`}/>`;

  // ─── Componentes base con html en closure ───
  const BoundCard = ({children, style=''}) => html`<div class="glass-card" style=${`padding:16px;${style}`}>${children}</div>`;

  const BoundSectionAccordion = ({icon, title, isOpen, onToggle, children}) => html`
    <div class="glass-card" style="overflow:hidden;">
      <button class="section-toggle" onClick=${onToggle}>
        <span style="display:flex;align-items:center;gap:8px;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;letter-spacing:0.05em;">
          ${icon}${title}
        </span>
        <${BoundIChevD} s=${18} c=${`chev ${isOpen?'open':''}`}/>
      </button>
      ${isOpen && html`
        <div style="padding:16px;border-top:1px solid #1E2D45;">
          ${children}
        </div>
      `}
    </div>
  `;

  const BoundInp = ({label, value, onChange, placeholder, type='text'}) => html`
    <div>
      ${label && html`<label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">${label}</label>`}
      <input type=${type} value=${value} onInput=${e=>onChange(e.target.value)} placeholder=${placeholder||''}
        class="inp" />
    </div>
  `;

  const BoundCheckRow = ({label, checked, onChange, children}) => html`
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;min-height:44px;">
        <input type="checkbox" checked=${checked} onChange=${e=>onChange(e.target.checked)} />
        <span style="font-size:14px;color:#cbd5e1;">${label}</span>
      </label>
      ${checked && html`<div style="padding-left:28px;display:flex;flex-direction:column;gap:8px;">${children}</div>`}
    </div>
  `;

  // ─── Dynamic components (already use html from closure) ───
  const SegmentedPillGroup = ({
    options,
    value,
    onChange,
    activeBorder='rgba(99,102,241,0.35)',
    activeBg='rgba(99,102,241,0.14)',
    activeColor='#C7D2FE',
    inactiveBorder='rgba(30,45,69,1)',
    inactiveBg='rgba(8,13,26,0.45)',
    inactiveColor='#94A3B8',
    size='11px'
  }) => html`
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${options.map(([id,label]) => html`
        <button
          onClick=${()=>onChange(id)}
          style=${`padding:8px 12px;border-radius:999px;border:1px solid ${value===id?activeBorder:inactiveBorder};background:${value===id?activeBg:inactiveBg};color:${value===id?activeColor:inactiveColor};font-size:${size};font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;`}>
          ${label}
        </button>
      `)}
    </div>
  `;

  const RecipeLibraryRow = ({ recipe, classifyRecipe, recipeHasIngredientList, onEdit, onDelete }) => {
    const kind = classifyRecipe(recipe);
    const kindMeta = RECIPE_KIND_META[kind] || { label:kind, color:'#94A3B8' };
    return html`
      <div style="padding:10px;border-radius:8px;background:rgba(15,23,41,0.85);border:1px solid #1E2D45;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#E2E8F0;">${recipe.recipe_name}</p>
              <span style=${`font-size:10px;color:${kindMeta.color};font-family:'JetBrains Mono',monospace;text-transform:uppercase;`}>${kindMeta.label}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
              <span style="font-size:10px;color:#F59E0B;font-family:'JetBrains Mono',monospace;">${Math.round(parseFloat(recipe.macros?.cals)||0)} kcal</span>
              <span style="font-size:10px;color:#10B981;font-family:'JetBrains Mono',monospace;">${Math.round(parseFloat(recipe.macros?.prot)||0)}g P</span>
              <span style="font-size:10px;color:#6366F1;font-family:'JetBrains Mono',monospace;">${Math.round(parseFloat(recipe.macros?.carb)||0)}g C</span>
              <span style="font-size:10px;color:#EF4444;font-family:'JetBrains Mono',monospace;">${Math.round(parseFloat(recipe.macros?.fat)||0)}g G</span>
            </div>
            <p style="margin:6px 0 0;font-size:11px;color:#94A3B8;">Base: ${recipe.base_qty || 1} ${recipe.base_unit || 'porcion'}</p>
            ${(recipe.stock_qty === null || recipe.stock_qty === undefined || recipe.stock_qty === '' || !String(recipe.stock_unit || '').trim()) && html`
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
                <span style="font-size:10px;color:#94A3B8;font-family:'JetBrains Mono',monospace;">Sin control de stock</span>
              </div>
            `}
            ${recipeHasIngredientList(recipe) && html`
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
                <span style="font-size:10px;color:#94A3B8;font-family:'JetBrains Mono',monospace;">Receta compuesta · sin stock automático</span>
              </div>
            `}
            ${(recipe.stock_qty !== null && recipe.stock_qty !== undefined && recipe.stock_qty !== '') && html`
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
                <span style="font-size:10px;color:#7DD3FC;font-family:'JetBrains Mono',monospace;">Stock: ${recipe.stock_qty} ${recipe.stock_unit || ''}</span>
                ${(recipe.low_stock_threshold !== null && recipe.low_stock_threshold !== undefined && recipe.low_stock_threshold !== '' && Number(recipe.stock_qty) <= Number(recipe.low_stock_threshold)) && html`
                  <span style="font-size:10px;color:#FCA5A5;font-family:'JetBrains Mono',monospace;">Reponer</span>
                `}
              </div>
            `}
            ${Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && html`
              <p style="margin:6px 0 0;font-size:11px;color:#94A3B8;white-space:pre-wrap;">
                ${recipe.ingredients.map(it => `${it.qty || '1 porcion'} ${it.name || 'Ingrediente'}`).join(' · ')}
              </p>
            `}
            ${recipe.notes && html`<p style="margin:6px 0 0;font-size:10px;color:#64748b;">${recipe.notes}</p>`}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
            <button onClick=${()=>onEdit(recipe)} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">EDITAR</button>
            <button onClick=${()=>onDelete(recipe.id)} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.12);color:#FCA5A5;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">BORRAR</button>
          </div>
        </div>
      </div>
    `;
  };

  const HealthStatusCard = ({ title, status }) => html`
    <div style=${`padding:8px 10px;border-radius:8px;border:1px solid ${status.border};background:${status.bg};`}>
      <p style="margin:0;font-size:10px;text-transform:uppercase;color:#94A3B8;">${title}</p>
      <p style=${`margin:4px 0 0;font-size:13px;font-weight:700;color:${status.color};`}>${status.label}</p>
    </div>
  `;

  const HealthHistoryRow = ({ entry, meta, editingHistoryAt, onEdit, onDelete }) => html`
    <div style="padding:8px 10px;border-radius:8px;background:rgba(8,13,26,0.5);border:1px solid #1E2D45;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
      <div style="flex:1;min-width:0;">
        <p style="margin:0 0 4px;font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;">${entry.at ? new Date(entry.at).toLocaleString('es-AR') : ''}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:4px;">
          <span style=${`padding:3px 7px;border-radius:999px;border:1px solid ${meta.border};background:${meta.bg};color:${meta.color};font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;`}>${meta.badge}</span>
        </div>
        <p style="margin:0;font-size:12px;color:#E2E8F0;">${meta.text}</p>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <button onClick=${()=>onEdit(entry.at)} disabled=${editingHistoryAt === entry.at} style=${`padding:4px 8px;border-radius:6px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;opacity:${editingHistoryAt === entry.at ? 0.7 : 1};`}>EDITAR</button>
        <button onClick=${()=>onDelete(entry.at)} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.12);color:#FCA5A5;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">BORRAR</button>
      </div>
    </div>
  `;

  const OcioNoteEntry = ({ metaLabel, text, collapsed, onToggle, onDelete, onTask }) => html`
    <div style="padding:10px;border-radius:8px;background:rgba(15,23,41,0.75);border:1px solid #1E2D45;">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
        <div style="flex:1;">
          <p style="margin:0 0 6px;font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;">${metaLabel}</p>
          ${!collapsed && html`<p style="margin:0;font-size:13px;color:#E2E8F0;white-space:pre-wrap;">${text}</p>`}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
          <button onClick=${onToggle} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(148,163,184,0.3);background:rgba(148,163,184,0.12);color:#CBD5E1;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
            ${collapsed ? 'ABRIR' : 'PLEGAR'}
          </button>
          ${onTask && html`
            <button onClick=${onTask} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
              TAREA
            </button>
          `}
          <button onClick=${onDelete} style="padding:4px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.12);color:#FCA5A5;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
            BORRAR
          </button>
        </div>
      </div>
    </div>
  `;

  const DashboardStatCard = ({ label, value, color }) => html`
    <div style="padding:10px 8px;border-radius:10px;background:rgba(10,15,30,0.45);border:1px solid #1E2D45;">
      <p style="margin:0;font-size:9px;color:#64748b;text-transform:uppercase;">${label}</p>
      <p style=${`margin:4px 0 0;font-size:17px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${color};`}>${value}</p>
    </div>
  `;

  const DashboardActionCard = ({ onClick, title, value, detail, border, background, accent }) => html`
    <button onClick=${onClick} style=${`text-align:left;padding:10px 12px;border-radius:10px;border:1px solid ${border};background:${background};cursor:pointer;`}>
      <p style=${`margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${accent};font-weight:700;`}>${title}</p>
      <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">${value}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${detail}</p>
    </button>
  `;

  const DashboardTagChip = ({ label, color }) => html`
    <div style=${`padding:6px 10px;border-radius:999px;background:${color}18;border:1px solid ${color}55;color:${color};font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;`}>
      ${label}
    </div>
  `;

  const TaskBadgeChip = ({ label, color }) => html`
    <span style=${`font-size:10px;color:${color};font-family:'JetBrains Mono',monospace;`}>${label}</span>
  `;

  const TaskActionButton = ({ onClick, label, border, background, color, className='' }) => html`
    <button
      class=${className}
      onClick=${onClick}
      style=${className ? '' : `padding:6px 10px;border-radius:8px;border:1px solid ${border};background:${background};color:${color};font-size:11px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;`}>
      ${label}
    </button>
  `;

  const TaskViewCard = ({ task, subtasks, doneSubtasks, priorityAccent, onEdit, onDone, onArchive, onDelete, onToggleSubtask, calendarHref, onMail, mailLoading }) => html`
    <div style=${`padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.45);border:1px solid #1E2D45;box-shadow:inset 3px 0 0 ${priorityAccent};`}>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
        <div style="flex:1;">
          <p style="margin:0;font-size:14px;color:#E2E8F0;font-weight:700;">${task.title}</p>
          ${task.details && task.details !== task.title && html`<p style="margin:4px 0 0;font-size:12px;color:#94A3B8;">${task.details}</p>`}
          ${subtasks.length > 0 && html`
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
              ${subtasks.map((subtask, idx) => html`
                <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#CBD5E1;cursor:pointer;">
                  <input type="checkbox" checked=${!!subtask.done} onChange=${()=>onToggleSubtask(idx)} />
                  <span style=${`line-height:1.35;${subtask.done ? 'text-decoration:line-through;color:#64748B;' : ''}`}>${subtask.text}</span>
                </label>
              `)}
            </div>
          `}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
            <${TaskBadgeChip} label=${(task.priority || 'normal').toUpperCase()} color=${priorityColor(task.priority)} />
            <${TaskBadgeChip} label=${categoryMeta(task.category || 'personal').label.toUpperCase()} color=${categoryMeta(task.category || 'personal').color} />
            ${(task.recurrence || 'none') !== 'none' && html`<${TaskBadgeChip} label=${recurrenceLabel(task.recurrence).toUpperCase()} color="#7DD3FC" />`}
            ${subtasks.length > 0 && html`<${TaskBadgeChip} label=${`${doneSubtasks}/${subtasks.length} SUB`} color="#CBD5E1" />`}
            <${TaskBadgeChip} label=${formatTaskDate(task.due_at)} color="#64748b" />
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <${TaskActionButton} className="btn-icon" onClick=${onEdit} label="E" />
          <button class="btn-icon" style="background:#162035;border:1px solid rgba(16,185,129,0.35);" onClick=${onDone}>
            <${BoundICheck} s=${16} c="text-green"/>
          </button>
          <${TaskActionButton} className="btn-icon" onClick=${onArchive} label="A" />
          <${TaskActionButton} className="btn-icon" onClick=${onDelete} label="X" />
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
        <a href=${calendarHref} target="_blank" rel="noreferrer"
          style="padding:6px 10px;border-radius:8px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.35);color:#818CF8;font-size:11px;font-weight:700;text-decoration:none;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;">
          CALENDARIO
        </a>
        <${TaskActionButton}
          onClick=${onMail}
          label=${mailLoading ? 'ENVIANDO...' : 'MAIL'}
          border="rgba(245,158,11,0.35)"
          background="rgba(245,158,11,0.12)"
          color="#FBBF24"
        />
      </div>
    </div>
  `;

  // ─── ProteinProgress with closure html ───
  const BoundProteinProgress = ({current, TARGETS: targets, fn}) => {
    const goal = targets.prot;
    const pct  = Math.min((current / goal) * 100, 100);
    const minCovered = Math.round(goal * 0.75);
    const color = current >= goal ? '#10B981' : current >= minCovered ? '#F59E0B' : '#EF4444';
    return html`
      <div style="margin-top:12px;padding:12px;background:rgba(16,185,129,0.05);border-radius:8px;border:1px solid rgba(16,185,129,0.1);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;">Progreso Proteico</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${color};">${fn(current)} / ${goal}g</span>
        </div>
        <div style="width:100%;height:6px;background:#1E2D45;border-radius:3px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${color};transition:width 0.5s ease;box-shadow:0 0 8px ${color}66;"></div>
        </div>
        <p style="margin:6px 0 0;font-size:10px;color:#475569;">
          ${current >= goal ? '✅ Objetivo alcanzado' : current >= minCovered ? '⚠️ Mínimo cubierto' : '🚀 Falta para el ideal'}
        </p>
      </div>
    `;
  };

  // ─── WaterTracker with closure html ───
  const BoundWaterTracker = ({val, onChange, roacuttan}) => {
    const goal  = 3500;
    const pct   = Math.min((val/goal)*100, 100);
    const color = !roacuttan && val >= 1000
      ? '#EF4444'
      : val >= goal ? '#10B981' : val >= 2000 ? '#6366F1' : '#F59E0B';
    const warn  = !roacuttan;

    return html`
      <div class="glass-card" style="padding:12px;border:1px solid ${warn?'rgba(239,68,68,0.3)':'var(--border)'};display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">💧 Hidratación</span>
              <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${color};">${(val/1000).toFixed(1)}L / 3.5L</span>
            </div>
            <div style="width:100%;height:6px;background:#1E2D45;border-radius:3px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;transition:width 0.3s;"></div>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn-icon" style="background:#1E2D45;color:white;border:1px solid #1E2D45;font-size:16px;"
              onClick=${()=>onChange(Math.max(0, val-250))}>−</button>
            <button class="btn-icon" style="background:#6366F1;color:white;border:none;font-size:16px;"
              onClick=${()=>onChange(val+250)}>+</button>
          </div>
        </div>
        ${warn && html`
          <p style="margin:0;font-size:10px;color:#EF4444;display:flex;align-items:center;gap:4px;">
            ⚠ Roacuttan no marcado — hidratate bien para reducir toxicidad acumulada
          </p>
        `}
      </div>
    `;
  };

  return {
    // Bound icons (no html prop needed)
    IPlay: BoundIPlay,
    IPause: BoundIPause,
    IReset: BoundIReset,
    ICheck: BoundICheck,
    IClock: BoundIClock,
    IChevD: BoundIChevD,
    IChevL: BoundIChevL,
    IChevR: BoundIChevR,
    ISync: BoundISync,
    IHome: BoundIHome,
    ICal: BoundICal,
    IBar: BoundIBar,
    ITarget: BoundITarget,
    IBook: BoundIBook,
    IBell: BoundIBell,
    IEdit: BoundIEdit,
    IList: BoundIList,
    IDumb: BoundIDumb,
    IActivity: BoundIActivity,
    // Bound base components (no html prop needed)
    Card: BoundCard,
    SectionAccordion: BoundSectionAccordion,
    Inp: BoundInp,
    CheckRow: BoundCheckRow,
    ProteinProgress: BoundProteinProgress,
    WaterTracker: BoundWaterTracker,
    // Dynamic components
    SegmentedPillGroup,
    RecipeLibraryRow,
    HealthStatusCard,
    HealthHistoryRow,
    OcioNoteEntry,
    DashboardStatCard,
    DashboardActionCard,
    DashboardTagChip,
    TaskBadgeChip,
    TaskActionButton,
    TaskViewCard
  };
};

// SmartCena and NutritionReviewCard are still exported as standalone
// because they receive deps like useState/useMemo as props from the caller.
export const SmartCena = ({html, useState, useMemo, currentProt, tracker, TARGETS, HOME_FOODS, dayTotals, pn}) => {
  const [rec, setRec] = useState(null);
  const [open, setOpen] = useState(false);
  const meals = tracker?.meals || [];
  const totals = dayTotals(meals);
  const normalizeFoodHint = (s='') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  const fiberEstimate = (meals || []).reduce((acc, meal) => acc + (meal?.items || []).reduce((sum, item) => {
    const text = normalizeFoodHint(`${item?.name || ''} ${item?.qty || ''}`);
    let next = sum;
    if(/avena|salvado|integral|legumbre|lenteja|garbanzo|poroto|verdura|brocoli|zanahoria|espinaca|banana|manzana|pera|papa|batata/.test(text)) next += 4;
    if(/fruta|ensalada|vegetal|verduras|frutos secos/.test(text)) next += 2;
    return next;
  }, 0), 0);

  const lastMealTime = (meals || [])
    .map(m => String(m?.lastBite || '').trim())
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || '';

  const fastingAdvice = useMemo(() => {
    const proteinOk = totals.prot >= TARGETS.prot * 0.85;
    const caloriesOk = totals.cals >= TARGETS.kcal * 0.78;
    const fatOk = totals.fat >= 45;
    const fiberOk = fiberEstimate >= 18;
    const shouldFast = proteinOk && caloriesOk && (fatOk || fiberOk);
    const caution = !proteinOk || totals.cals < TARGETS.kcal * 0.65;
    let hungerWindow = 'Sin datos';
    if(lastMealTime) {
      const [h,m] = lastMealTime.split(':').map(Number);
      if(!Number.isNaN(h)) {
        const base = new Date();
        base.setHours(h, m || 0, 0, 0);
        const holdHours = 8.5
          + Math.min(2, totals.fat / 35)
          + Math.min(1.5, totals.prot / 90)
          + Math.min(1.5, fiberEstimate / 16)
          - (totals.cals < TARGETS.kcal * 0.7 ? 1.2 : 0);
        const start = new Date(base.getTime() + holdHours * 3600000);
        const end = new Date(start.getTime() + 90 * 60000);
        const fmt = dt => dt.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' });
        hungerWindow = `${fmt(start)}-${fmt(end)}`;
      }
    }
    return {
      shouldFast,
      caution,
      label: shouldFast ? 'Hoy sí conviene ayuno corto' : caution ? 'Hoy no conviene forzar ayuno' : 'Ayuno opcional y flexible',
      detail: shouldFast ? 'Buen cierre de energía/proteína para probar 12-14 h.' : caution ? 'Quedaste corto en energía o proteína; mejor cenar bien y no estirar de más.' : 'Podés hacer ayuno suave si mañana te sentís bien.',
      hungerWindow
    };
  }, [fiberEstimate, lastMealTime, totals.cals, totals.fat, totals.prot, TARGETS]);

  const calculate = () => {
    const missP = TARGETS.prot - currentProt;
    if(missP <= 0) { setRec('ok'); return; }
    const list = HOME_FOODS.map(f => {
      const qty = f.unit === 'unidad' ? Math.ceil(missP / f.p) : Math.round(missP / (f.p / 100));
      const kcal = f.unit === 'unidad' ? qty * (f.p*4 + f.c*4 + f.f*9) : (qty/100) * (f.p*4 + f.c*4 + f.f*9);
      return { ...f, qty, kcal: Math.round(kcal) };
    });
    setRec(list);
    setOpen(true);
  };

  return html`
    <div class="glass-card" style="padding:12px;border-color:rgba(245,158,11,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.06em;">💡 Asistente Nutricional</span>
        <button onClick=${calculate} style="padding:5px 12px;border-radius:8px;border:none;background:#F59E0B;color:#080D1A;font-size:12px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;">Recomendar</button>
      </div>
      ${rec === 'ok' && html`<p style="margin:8px 0 0;font-size:13px;color:#10B981;">✅ Objetivo proteico alcanzado</p>`}
      ${rec && Array.isArray(rec) && open && html`
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
          ${rec.map(f => html`
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(10,15,30,0.4);padding:6px 10px;border-radius:6px;border:1px solid #1E2D45;">
              <span style="font-size:12px;color:#cbd5e1;">${f.name}</span>
              <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#F59E0B;white-space:nowrap;">${f.qty}${f.unit==='unidad'?'u':'g'} · ${f.kcal}kcal</span>
            </div>
          `)}
        </div>
      `}
      <div style="margin-top:10px;padding:10px;border-radius:8px;background:rgba(10,15,30,0.42);border:1px solid #1E2D45;">
        <p style="margin:0;font-size:10px;text-transform:uppercase;color:#64748b;">Ayuno nocturno</p>
        <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:${fastingAdvice.shouldFast ? '#10B981' : (fastingAdvice.caution ? '#F59E0B' : '#CBD5E1')};">${fastingAdvice.label}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${fastingAdvice.detail}</p>
        <p style="margin:6px 0 0;font-size:11px;color:#7DD3FC;">Hambre probable: ${fastingAdvice.hungerWindow}</p>
      </div>
    </div>
  `;
};

export const NutritionReviewCard = ({html, useState, useCallback, useEffect, serializeMeals, fetchJsonWithTimeout, dayTotals, pn, currentDateKey, currentTracker, previousDateKey, previousTracker}) => {
  const [review, setReview] = useState({ today:null, previous:null, loadingToday:false, loadingPrevious:false, error:'' });
  
  const fetchReview = useCallback(async (dateKey, tracker, targetKey) => {
    if(!dateKey || !(tracker?.meals || []).some(m => (m.items || []).length > 0)) return;
    const cacheKey = `enzo_nutrition_review_${dateKey}`;
    const mealsFingerprint = serializeMeals(tracker);
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if(cached?.fingerprint === mealsFingerprint && cached?.payload) {
        setReview(prev => ({ ...prev, [targetKey]: cached.payload }));
        return;
      }
    } catch(_) {}

    setReview(prev => ({ ...prev, [`loading${targetKey === 'today' ? 'Today' : 'Previous'}`]: true, error:'' }));
    try {
      const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/daily-nutrition-review', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ date: dateKey, meals: tracker.meals || [], totals: dayTotals(tracker.meals || []) })
      });
      if(!res.ok) throw new Error(data?.error || 'No se pudo revisar la nutricion.');
      setReview(prev => ({ ...prev, [targetKey]: data }));
      try { localStorage.setItem(cacheKey, JSON.stringify({ fingerprint: mealsFingerprint, payload: data })); } catch(_) {}
    } catch(e) {
      setReview(prev => ({ ...prev, error: e.message || 'No se pudo revisar la nutricion.' }));
    } finally {
      setReview(prev => ({ ...prev, [`loading${targetKey === 'today' ? 'Today' : 'Previous'}`]: false }));
    }
  }, [serializeMeals, fetchJsonWithTimeout, dayTotals]);

  useEffect(() => { fetchReview(previousDateKey, previousTracker, 'previous'); }, [fetchReview, previousDateKey, serializeMeals(previousTracker)]);
  useEffect(() => {
    const now = new Date();
    if(now.getHours() < 20) return;
    fetchReview(currentDateKey, currentTracker, 'today');
  }, [fetchReview, currentDateKey, serializeMeals(currentTracker)]);

  const renderNutrients = (nutrients) => {
    const entries = Object.entries(nutrients || {});
    if(entries.length === 0) return null;
    return html`
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
        ${entries.map(([key, status]) => html`
          <span style=${`padding:4px 7px;border-radius:999px;border:1px solid rgba(30,41,59,0.8);background:${status === 'low' ? 'rgba(245,158,11,0.12)' : status === 'high' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'};color:${status === 'low' ? '#FBBF24' : status === 'high' ? '#FCA5A5' : '#86EFAC'};font-size:10px;font-weight:700;text-transform:uppercase;`}>
            ${key}: ${status}
          </span>
        `)}
      </div>
    `;
  };

  if(!review.previous && !review.today && !review.loadingPrevious && !review.loadingToday) return null;

  return html`
    <div class="glass-card" style="padding:12px;border-color:rgba(56,189,248,0.25);display:flex;flex-direction:column;gap:10px;">
      <div>
        <p style="margin:0;font-size:12px;font-weight:700;color:#38BDF8;text-transform:uppercase;letter-spacing:0.06em;">Micros y sugerencias</p>
        <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">Estimacion orientativa de fibra, minerales, sodio y cierre del dia.</p>
      </div>
      ${review.previous && html`
        <div style="padding:10px;border-radius:8px;background:rgba(10,15,30,0.42);border:1px solid #1E2D45;">
          <p style="margin:0;font-size:10px;text-transform:uppercase;color:#64748b;">Para hoy, segun ayer</p>
          <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#E2E8F0;">${review.previous.day_summary || 'Sin resumen'}</p>
          ${renderNutrients(review.previous.nutrients)}
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
            ${(review.previous.tomorrow_recommendations || []).slice(0,3).map(line => html`<p style="margin:0;font-size:11px;color:#CBD5E1;">• ${line}</p>`)}
          </div>
        </div>
      `}
      ${(review.today || review.loadingToday) && html`
        <div style="padding:10px;border-radius:8px;background:rgba(10,15,30,0.42);border:1px solid #1E2D45;">
          <p style="margin:0;font-size:10px;text-transform:uppercase;color:#64748b;">Cierre del dia</p>
          <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:#E2E8F0;">${review.loadingToday ? 'Analizando...' : (review.today?.day_summary || 'Sin resumen')}</p>
          ${renderNutrients(review.today?.nutrients)}
        </div>
      `}
      ${review.error && html`<p style="margin:0;font-size:11px;color:#FCA5A5;">${review.error}</p>`}
    </div>
  `;
};
