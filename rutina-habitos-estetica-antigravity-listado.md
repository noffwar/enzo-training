# Listado para Antigravity - rutina, estetica y habitos faltantes

Objetivo: mejorar la pantalla actual sin tocar funcionamiento. El cronometro/tiempos de rutina esta bien y se debe conservar. Lo que hay que ajustar es la estetica del bloque de rutina y reponer controles diarios que antes estaban en `Parametros Diarios`.

## 0. No tocar

- No cambiar logica de rutina, series, checks, sobrecarga, descanso ni guardado.
- No cambiar el cronometro ni el comportamiento del timer.
- No cambiar los callbacks de `GymPanel`, `HabitsPanel`, `onHabit`, `onInput`, `onSetComplete`, `onCompleteSession`, etc.
- No cambiar Supabase ni estructura de datos.

## 1. Rutina Gimnasio - volver a la estetica anterior

Archivo principal: `app-gym.js`.

La rutina actual funciona, pero visualmente quedo mas dura/tecnica que la anterior. Se ve como una tabla metida en un panel muy oscuro. Hay que volver al look anterior de tracker compacto.

### 1.1 Accordion/header de rutina

Ahora:

- Titulo `Rutina Gimnasio` se ve muy pegado a un panel grande.
- El bloque entero queda muy rectangular y pesado.

Mejorar:

- Mantener `SectionAccordion`, pero que se sienta igual que `Parametros Diarios`:
  - icono verde sutil
  - titulo blanco con `Barlow Condensed`
  - borde `#1E2D45`
  - fondo glass `rgba(15,23,41,0.85)`
  - chevron discreto
- No agregar gradientes ni colores nuevos.

### 1.2 Cronometro / horarios de sesion

Estado actual:

- La parte de inicio/fin y cronometro esta bien.

Indicacion:

- Conservar esa parte como esta.
- Solo ajustar si hace falta para que combine con el card viejo:
  - fondo `rgba(10,15,30,0.5)`
  - borde `#1E2D45`
  - radio `10px`
  - labels pequenos en `#64748b`

### 1.3 Resumen de series / ejercicios / progreso

Ahora:

- Los tres cuadros se ven grandes y separados.
- El progreso queda muy dashboard, menos tracker.

Mejorar:

- Mantener los tres datos, pero con densidad vieja:
  - cards internas `background:#0F1729`
  - borde `#1E2D45`
  - label uppercase `9px`, color `#64748b`
  - valor `JetBrains Mono`, `15px`, peso `700`
- Mantener colores:
  - Series `#10B981`
  - Ejercicios `#6366F1`
  - Progreso `#F59E0B`
- La barra de progreso debe verse integrada, no como protagonista:
  - altura `6px` u `8px`
  - fondo `#0F1729`
  - borde `#1E2D45`
  - fill `linear-gradient(90deg,#10B981,#6366F1)`

### 1.4 Botones de rutina

Ahora:

- `COMPLETAR SESION` y `REINICIAR CHECKS` estan correctos funcionalmente.

Mejorar:

- Mantener estilo anterior:
  - `Barlow Condensed`
  - uppercase
  - `font-size:11px`
  - `letter-spacing:0.05em`
  - verde translucido para completar
  - rojo translucido para reiniciar
- No hacerlos solidos ni demasiado brillantes.

### 1.5 Cards de ejercicios

Ahora:

- Cada ejercicio se ve como bloque muy pesado.
- El contenido queda demasiado "tabla oscura".

Mejorar con estetica vieja:

- Card por ejercicio:
  - borde `1px solid #1E2D45`
  - radio `10px`
  - overflow hidden
  - margen inferior `10px`
- Header del ejercicio:
  - `background:rgba(22,32,53,0.7)`
  - `border-left:3px solid var(--green)`
  - padding `8px 12px`
- Nombre:
  - `Barlow Condensed`
  - `font-size:15px`
  - `font-weight:700`
  - `letter-spacing:0.04em`
  - color blanco
- Musculos debajo:
  - `font-size:10px`
  - color `#475569`

### 1.6 Tabla de series

Mejorar:

- Usar la estetica vieja de tabla:
  - headers pequenos uppercase, color `#475569`
  - filas con borde inferior suave `rgba(30,45,69,0.4)`
  - inputs `inp-xs` con `#0F1729`, borde `#1E2D45`, radio `6px`
  - numeros con `JetBrains Mono`
- Columnas:
  - `#`
  - `Reps`
  - `Peso`
  - `RIR`
  - `Pausa`
  - check
- Evitar que los inputs se vean como cajas blancas o demasiado brillantes.

### 1.7 Checks de series

Ahora:

- En la captura, los checks no completados se ven como circulos muy oscuros, casi apagados.

Mejorar:

- Estado no completado:
  - fondo `#162035`
  - borde `1px solid #1E2D45`
  - check sutil gris
- Estado completado:
  - fondo `#10B981`
  - glow `0 0 10px rgba(16,185,129,0.4)`
  - check visible
- Mantener tamano `32px` redondo.

### 1.8 RPE y sobrecarga

Mejorar:

- Mantener RPE debajo de la serie completada.
- Fondo de fila completada:
  - `rgba(10,15,30,0.3)`
- Slider RPE viejo:
  - gradiente `#6366F1 -> #10B981 -> #F59E0B -> #EF4444`
- Sugerencia `+2,5kg` en verde, pequena, sin convertirla en card gigante.

## 2. Parametros Diarios - faltan controles antiguos

Archivo principal: `app-habits.js`.

En el modelo de datos todavia existen estos campos en `newDay()`:

- `fasted`
- `fastHours`
- `fastStartTime`
- `walked`
- `steps`
- `walkStartTime`
- `walkEndTime`
- `mateOrCoffee`
- `mateOrCoffeeTime`
- `sleepHours`
- `sleepQuality`
- `wakeups`
- `napped`
- `napHours`

Pero en la UI actual de `Parametros Diarios` solo se ve medicacion y alimentacion. Hay que reponer los controles visuales, sin cambiar datos.

### 2.1 Bloque Nutricion & Cardio

Debe quedar como antes, arriba de Alimentacion.

Estilo:

- Contenedor:
  - `padding:12px`
  - `border-radius:10px`
  - `background:rgba(10,15,30,0.5)`
  - `border:1px solid #1E2D45`
  - `display:flex`
  - `flex-direction:column`
  - `gap:10px`
- Titulo:
  - texto `NUTRICION & CARDIO`
  - color `#F59E0B`
  - uppercase
  - `font-size:11px`
  - `letter-spacing:0.08em`
  - `font-weight:700`

### 2.2 Ayuno realizado

Agregar de vuelta:

```js
<${CheckRow} label="Ayuno realizado" checked=${t.fasted} onChange=${v=>onChange('fasted',v)}>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    <${Inp} label="Inicio (HH:MM)" type="time" value=${t.fastStartTime} onChange=${v=>onChange('fastStartTime',v)}/>
    <${Inp} label="Duracion (hs)" value=${t.fastHours} onChange=${v=>onChange('fastHours',v)} placeholder="Ej: 16"/>
  </div>
  ${fs.endStr && html`<span class="badge" style="background:rgba(16,185,129,0.1);color:#10B981;">Finaliza: ${fs.endStr}</span>`}
<//>
```

Notas:

- Usar `getFastStats(t)` como antes.
- Si hay ayuno de ayer, mostrar `yesterdayFastMsg` en badge violeta/indigo como antes.

### 2.3 Mate / Cafe

Agregar:

```js
<${CheckRow} label="Mate / Cafe" checked=${t.mateOrCoffee} onChange=${v=>onChange('mateOrCoffee',v)}>
  <${Inp} label="Hora" type="time" value=${t.mateOrCoffeeTime} onChange=${v=>onChange('mateOrCoffeeTime',v)}/>
<//>
```

Debe permitir marcar si hubo mate/cafe y a que hora.

### 2.4 Caminata / pasos

Agregar:

```js
<${CheckRow} label="Caminata" checked=${t.walked} onChange=${v=>onChange('walked',v)}>
  <${Inp} label="Pasos" value=${t.steps} onChange=${v=>onChange('steps',v)} placeholder="Ej: 10.000"/>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    <${Inp} label="Inicio" type="time" value=${t.walkStartTime} onChange=${v=>onChange('walkStartTime',v)}/>
    <${Inp} label="Fin" type="time" value=${t.walkEndTime} onChange=${v=>onChange('walkEndTime',v)}/>
  </div>
  ${fs.walkStr && html`<span class="badge" style=${`background:${fs.isFasted?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)'};color:${fs.isFasted?'#10B981':'#F59E0B'};`}>${fs.walkStr}</span>`}
<//>
```

Debe volver a mostrar si la caminata fue en ayuno o fuera del ayuno.

### 2.5 Descanso / sueño / siesta

Agregar un bloque aparte, como antes:

Estilo:

- mismo contenedor oscuro que `Nutricion & Cardio`
- titulo `DESCANSO`
- color titulo `#6366F1`

Campos:

```js
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
  <${Inp} label="Dormi (hs)" value=${t.sleepHours} onChange=${v=>onChange('sleepHours',v)} placeholder="Ej: 7,5"/>
  <${Inp} label="Despertares" value=${t.wakeups} onChange=${v=>onChange('wakeups',v)} placeholder="Veces"/>
</div>

<div>
  <label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">Calidad</label>
  <select class="inp" value=${t.sleepQuality} onChange=${e=>onChange('sleepQuality',e.target.value)}>
    <option value="">Seleccionar...</option>
    <option>Excelente</option>
    <option>Bien</option>
    <option>Regular</option>
    <option>Mal</option>
  </select>
</div>

<${CheckRow} label="Dormi siesta?" checked=${t.napped} onChange=${v=>onChange('napped',v)}>
  <${Inp} label="Horas" value=${t.napHours} onChange=${v=>onChange('napHours',v)} placeholder="Ej: 1,5"/>
<//>
```

### 2.6 Medicacion dentro de Parametros

La medicacion actual puede quedarse, pero visualmente deberia convivir mejor:

- No reemplazar Roacutan / Cena Combo.
- Ubicarla debajo de ayuno, mate y caminata, o en una subseccion clara.
- Mantener el estilo viejo oscuro, no cajas demasiado coloreadas.

## 3. Orden visual recomendado en HOY

Sin cambiar funcionamiento, el orden deberia sentirse asi:

1. Header viejo / semana / split / dias.
2. Titulo de rutina del dia y selector.
3. Dashboard de HOY.
4. `Parametros Diarios`.
   - Nutricion & Cardio:
     - Ayuno
     - Mate / Cafe
     - Caminata / pasos
     - Medicacion
   - Alimentacion:
     - comidas + IA
   - Descanso:
     - sueño
     - siesta
5. Macros del dia.
6. Hidratacion.
7. Micros y sugerencias.
8. Asistente nutricional.
9. Rutina Gimnasio.

Si Antigravity decide dejar `Rutina Gimnasio` mas arriba, igual debe conservar la estetica vieja y no tocar el cronometro.

## 4. Checklist concreto

- [ ] Conservar cronometro/horarios de rutina.
- [ ] Mejorar header visual de `Rutina Gimnasio` para que combine con `Parametros Diarios`.
- [ ] Hacer los cards de ejercicios mas parecidos al viejo: header azul oscuro, borde verde izquierdo, tabla compacta.
- [ ] Mejorar checks no completados para que no se vean apagados.
- [ ] Mantener RPE/sobrecarga con estilo chico e integrado.
- [ ] Reponer `Ayuno realizado`.
- [ ] Reponer `Mate / Cafe`.
- [ ] Reponer `Caminata` con pasos, inicio, fin y badge de ayuno.
- [ ] Reponer `Descanso`: horas dormidas, despertares, calidad, siesta y horas de siesta.
- [ ] No tocar estado ni nombres de campos; ya existen en `newDay()`.
- [ ] Mantener estilo anterior: `#080D1A`, `#0F1729`, `#162035`, `#1E2D45`, `#10B981`, `#6366F1`, `#F59E0B`, `#EF4444`.

