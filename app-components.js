export const createAppComponents = ({
  html,
  ICheck,
  RECIPE_KIND_META,
  priorityColor,
  categoryMeta,
  recurrenceLabel,
  formatTaskDate
}) => {
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
            <${ICheck} s=${16} c="text-green"/>
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

  return {
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
