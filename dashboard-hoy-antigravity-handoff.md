# Handoff: dashboard anterior para HOY

Referencia vieja: `C:\Users\castr\Downloads\index (1).html`, bloque `TodayDashboard` alrededor de lineas `7249-7620`.

Objetivo: que Antigravity reconstruya la parte de HOY con el tablero anterior que gustaba, manteniendo la app modularizada.

## Lectura rapida

El dashboard viejo era bueno porque era un resumen compacto, no un centro de configuracion:

- encabezado: `Tablero principal` + boton `VER TAREAS`
- fila de 4 metricas: `Pend.`, `Hoy`, `Ideas`, `Alta`
- grilla 2x2 de modulos: `Estudio`, `Libro actual`, `Salud`, `Biblioteca`
- grilla inferior con clima, medicacion y vencimiento
- backup recomendado solo si corresponde
- `Siguiente foco` con acciones rapidas: `HECHA`, `ARCHIVAR`, `ABRIR`

Importante: en el viejo dashboard NO habia tarjeta `Gimnasio`. La rutina estaba arriba en HOY con su selector/split, y el detalle del entrenamiento abajo con `GymPanel`.

Para recuperar la sensacion anterior, no meter gimnasio dentro de la grilla del dashboard. Si se quiere acceso a rutinas, que quede en la cabecera de rutina o en la nav inferior.

## Donde va

`app-main.js`, dentro de `view === 'today'`, el orden recomendado es:

```js
// 1. Semana/dias + split + rutina del dia
// 2. TodayDashboard viejo
// 3. HabitsPanel
// 4. GymPanel
```

El dashboard debe recibir:

```js
<${TodayDashboard}
  session=${session}
  tracker=${tracker}
  selectedDateKey=${activeDateKey}
  onOpenTasks=${() => navigateTo('tasks')}
  onOpenStudy=${() => navigateTo('study')}
  onOpenBooks=${() => navigateTo('books')}
  onOpenHealth=${() => navigateTo('health')}
  onOpenRecipes=${() => navigateTo('recipes')}
  onOpenNotif=${() => navigateTo('notif')}
/>
```

No necesita `gymSession` ni `onOpenRoutines` para el look anterior.

## Estructura visual exacta

En `app-dashboard.js`, dejar el `return html` de `TodayDashboard` con esta forma.

Se puede usar `DashboardStatCard` y `DashboardActionCard` como ya existen, pero la estructura debe quedar asi:

```js
return html`
  <div class="glass-card" style="padding:12px 14px;display:flex;flex-direction:column;gap:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div>
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6366F1;font-weight:700;">Tablero principal</p>
        <p style="margin:4px 0 0;font-size:12px;color:#94A3B8;">Lo importante del dia, sin salir del Diario.</p>
      </div>
      <button onClick=${onOpenTasks}
        style="padding:8px 10px;border-radius:8px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
        VER TAREAS
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
      ${[
        { label:'Pend.', val: summary.pending, color:'#10B981' },
        { label:'Hoy', val: summary.dueToday, color:'#EF4444' },
        { label:'Ideas', val: summary.notes, color:'#F59E0B' },
        { label:'Alta', val: summary.high, color:'#38BDF8' }
      ].map(item => html`<${DashboardStatCard} label=${item.label} value=${loading ? '...' : item.val} color=${item.color} />`)}
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
      <${DashboardActionCard}
        onClick=${onOpenStudy}
        title="Estudio"
        value=${loading ? '...' : summary.studyPending}
        detail=${`Pendientes de ${summary.studySubjects} materias - ${summary.studyDone} hechos`}
        border="rgba(99,102,241,0.25)"
        background="rgba(99,102,241,0.08)"
        accent="#A5B4FC"
      />
      <${DashboardActionCard}
        onClick=${onOpenBooks}
        title="Libro actual"
        value=${summary.book?.title || 'Sin libro'}
        detail=${`Pag ${pn(summary.book?.current_page)} / ${pn(summary.book?.total_pages)} - ${summary.bookPct}%`}
        border="rgba(245,158,11,0.25)"
        background="rgba(245,158,11,0.08)"
        accent="#FCD34D"
      />
      <${DashboardActionCard}
        onClick=${onOpenHealth}
        title="Salud"
        value=${`R ${pn(summary.meds?.roaccutan)} - M ${pn(summary.meds?.minoxidil_finasteride)}`}
        detail=${summary.medsLow ? 'Reponer pronto' : medDashboardStatus.label}
        border=${summary.medsLow ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)'}
        background=${summary.medsLow ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)'}
        accent=${summary.medsLow ? '#FCA5A5' : '#86EFAC'}
      />
      <${DashboardActionCard}
        onClick=${onOpenRecipes}
        title="Biblioteca"
        value=${loading ? '...' : summary.pantryLow}
        detail=${summary.pantryLow > 0 ? 'Items con stock bajo' : 'Sin alertas de stock'}
        border=${summary.pantryLow > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.25)'}
        background=${summary.pantryLow > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(56,189,248,0.08)'}
        accent=${summary.pantryLow > 0 ? '#FCD34D' : '#7DD3FC'}
      />
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
      <div style="text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(56,189,248,0.25);background:rgba(56,189,248,0.08);">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7DD3FC;font-weight:700;">Tiempo San Rafael</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">
          ${weather.loading ? 'Cargando...' : weather.data ? `${weather.data.temp_current}° ahora · prox 24h ${weather.data.temp_next24_max}/${weather.data.temp_next24_min}°` : 'Sin datos'}
        </p>
        <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">
          ${weather.data
            ? `Noche ${weather.data.temp_tonight_min}° · H ${weather.data.humidity_min}-${weather.data.humidity_max}% · lluvia ${weather.data.rain_probability}% · rafagas ${weather.data.wind_gusts} km/h · UV ${weather.data.uv_max}`
            : (weather.error || 'Sin datos meteorologicos')}
        </p>
        ${weather.data && html`
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
            <span style=${`padding:4px 7px;border-radius:999px;border:1px solid rgba(30,41,59,0.8);background:${weather.data.storm_risk_today === 'alto' ? 'rgba(239,68,68,0.14)' : weather.data.storm_risk_today === 'medio' ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.12)'};color:${weather.data.storm_risk_today === 'alto' ? '#FCA5A5' : weather.data.storm_risk_today === 'medio' ? '#FBBF24' : '#86EFAC'};font-size:10px;font-weight:700;text-transform:uppercase;`}>
              Hoy tormenta: ${weather.data.storm_risk_today}
            </span>
            <span style=${`padding:4px 7px;border-radius:999px;border:1px solid rgba(30,41,59,0.8);background:${weather.data.storm_risk_next24 === 'alto' ? 'rgba(239,68,68,0.14)' : weather.data.storm_risk_next24 === 'medio' ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.12)'};color:${weather.data.storm_risk_next24 === 'alto' ? '#FCA5A5' : weather.data.storm_risk_next24 === 'medio' ? '#FBBF24' : '#86EFAC'};font-size:10px;font-weight:700;text-transform:uppercase;`}>
              Prox 24h: ${weather.data.storm_risk_next24}
            </span>
          </div>
        `}
        <p style="margin:6px 0 0;font-size:11px;color:${weatherGymAdvice.color};font-weight:700;">${weatherGymAdvice.label}</p>
        ${weatherGymAdvice.detail && html`<p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${weatherGymAdvice.detail}</p>`}
        <p style="margin:6px 0 0;font-size:10px;color:#64748b;">Fuente: Open-Meteo para tiempo horario/24h + SMN para alertas.</p>
        ${weather.data && html`
          <p style="margin:6px 0 0;font-size:11px;color:${weather.data.zonda || weather.data.hail_risk || weather.data.lightning_risk ? '#FCA5A5' : '#86EFAC'};">
            ${[
              weather.data.storm_probable_today ? 'tormentas probables hoy' : null,
              weather.data.storm_probable_next24 ? 'inestabilidad proximas 24h' : null,
              weather.data.zonda ? 'Zonda' : null,
              weather.data.hail_risk ? 'granizo' : null,
              weather.data.lightning_risk ? 'rayos' : null
            ].filter(Boolean).join(' · ') || 'Sin alertas fuertes detectadas'}
          </p>
        `}
      </div>

      <button onClick=${onOpenHealth} style="text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(16,185,129,0.25);background:rgba(16,185,129,0.08);cursor:pointer;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#86EFAC;font-weight:700;">Proxima medicacion</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">${loading ? 'Cargando...' : medDashboardStatus.label}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${loading ? '' : (medDashboardStatus.detail || 'Sin detalles')}</p>
      </button>

      <button onClick=${onOpenTasks} style="text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(99,102,241,0.25);background:rgba(99,102,241,0.08);cursor:pointer;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#A5B4FC;font-weight:700;">Proximo vencimiento</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">${loading ? 'Cargando...' : (summary.nextTask?.title || 'Nada urgente')}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${loading ? '' : (summary.nextTask?.due_at ? formatTaskDate(summary.nextTask.due_at) : 'Sin tareas cerca')}</p>
      </button>
    </div>

    ${summary.backupDue && html`
      <button onClick=${onOpenNotif} style="text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.08);cursor:pointer;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#FCD34D;font-weight:700;">Backup recomendado</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">Hace backup desde ALERTAS</p>
        <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${summary.backupLabel || 'Pasaron mas de 72 horas sin backup manual.'}</p>
      </button>
    `}

    <div style="padding:10px;border-radius:10px;background:rgba(10,15,30,0.45);border:1px solid #1E2D45;">
      <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Siguiente foco</p>
      <p style="margin:6px 0 0;font-size:13px;color:#E2E8F0;font-weight:700;">
        ${loading ? 'Cargando...' : (summary.nextTask?.title || 'Nada urgente. Buen momento para ordenar ideas.')}
      </p>
      ${!loading && summary.nextTask?.due_at && html`
        <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;font-family:'JetBrains Mono',monospace;">
          ${formatTaskDate(summary.nextTask.due_at)}
        </p>
      `}
      ${!loading && summary.nextTask && html`
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
          <button onClick=${()=>quickUpdateTask(summary.nextTask,'done')} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">HECHA</button>
          <button onClick=${()=>quickUpdateTask(summary.nextTask,'archived')} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(148,163,184,0.35);background:rgba(148,163,184,0.12);color:#CBD5E1;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">ARCHIVAR</button>
          <button onClick=${onOpenTasks} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">ABRIR</button>
        </div>
      `}
    </div>
  </div>
`;
```

## Mantener del presente

Aunque el layout sea el viejo, conviene mantener estas mejoras del presente:

- `fetchJsonWithTimeout('/.netlify/functions/weather-san-rafael')` en lugar de `fetch` directo.
- `getMedicationStatusForView(...)` para calcular medicacion.
- `DashboardStatCard` y `DashboardActionCard` para no duplicar markup.
- query de tareas con campos completos si se usa recurrencia: `details`, `subtasks`, `recurrence`, `auto_email_reminder`, `email_reminder_sent_at`.

## Cambios puntuales para parecerse al anterior

1. Quitar del dashboard la tarjeta:

```js
<${DashboardActionCard} onClick=${onOpenRoutines} title="Gimnasio" ... />
```

2. Quitar props no usadas de `TodayDashboard` si se busca exactitud:

```js
onOpenRoutines,
gymSession = []
```

3. En `app-main.js`, pasar `TodayDashboard` sin `gymSession` ni `onOpenRoutines`.

4. Dejar la rutina fuera del dashboard: arriba va cabecera/split/rutina; abajo va `GymPanel`.

## Criterios de aceptacion

- La primera tarjeta grande de HOY se siente igual al dashboard viejo.
- La grilla principal tiene exactamente 4 cards: Estudio, Libro actual, Salud, Biblioteca.
- No aparece una quinta card de Gimnasio dentro del dashboard.
- Clima, medicacion, proximo vencimiento, backup y siguiente foco siguen dentro del tablero.
- Las acciones `HECHA`, `ARCHIVAR`, `ABRIR` siguen funcionando.
- La rutina se maneja fuera del dashboard, en su bloque propio de HOY.

