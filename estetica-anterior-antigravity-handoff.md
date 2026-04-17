# Handoff Antigravity - volver a la estetica anterior sin tocar funcionamiento

Objetivo: recuperar la estetica del `index (1).html` viejo en la app modular actual, manteniendo la logica y conexiones nuevas. No cambiar handlers, persistencia, Supabase, IA ni estados; solo layout, colores, tipografias, radios, densidad y estructura visual.

## Diferencias principales que se ven

### 1. Ancho general y sensacion de app

Viejo:

- La app vivia sobre `background:#080D1A`.
- El contenido y header usaban `max-width:640px`.
- Se sentia como dashboard mobile amplio, no como telefono encajonado.
- `main` era:

```js
<main style="max-width:640px;margin:0 auto;padding:16px 16px calc(88px + env(safe-area-inset-bottom, 12px));">
```

Nuevo:

- La app entera esta dentro de un shell:

```js
<div style="max-width:480px;margin:0 auto;...background:#05070A;">
```

- Esto la hace mas angosta, mas negra y mas parecida a una app-phone.
- El fondo nuevo `#05070A` es mas profundo que el viejo `#080D1A`.

Recomendacion visual:

- Volver a `min-height:100vh;background:#080D1A`.
- Header, main y bottom nav con `max-width:640px`.
- Evitar el wrapper global `max-width:480px` como contenedor de toda la app.

### 2. Header

Viejo:

- Header alto, con `background:rgba(8,13,26,0.97)`, borde `#1E2D45`, blur `20px`.
- Titulo grande: `font-family:'Barlow Condensed'`, `font-size:22px`, `font-weight:800`, `letter-spacing:0.08em`.
- Tenia controles integrados: CARGAR, GUARDAR, semana, split semanal y tabs de dias.
- La marca era texto directo: `ENZO TRAINING`, sin icono gradient.

Nuevo:

- Header mas chico y minimal:
  - `background:rgba(5,7,10,0.8)`
  - `padding:14px 16px`
  - borde casi invisible `rgba(255,255,255,0.03)`
- Agrega un icono cuadrado con gradiente verde/azul y sombra.
- Titulo mas chico: `font-size:16px`, `font-weight:900`.
- Semana, split y dias fueron bajados al contenido.

Recomendacion visual:

- Restaurar header viejo como estructura visual:
  - marca textual grande
  - fondo `rgba(8,13,26,0.97)`
  - borde `1px solid #1E2D45`
  - blur `20px`
  - max-width interno `640px`
- Quitar o esconder el icono gradient para volver a la identidad anterior.
- Mantener las funciones nuevas, pero visualmente ubicar semana/split/dias en el header como antes.

### 3. Navegacion inferior

Viejo:

- `bottom-nav` con `max-width:640px`.
- Botones `flex:1`, repartidos proporcionalmente.
- Labels completos: `PROGRESO`, `ESTUDIO`, `LIBROS`, `RECETAS`, `ALERTAS`, `RUTINAS`.
- Inactivo en gris oscuro `#374151`.
- Activo verde con barrita inferior de `14px x 2px`.

Nuevo:

- Nav fija en `max-width:480px`.
- Contenido horizontal con `min-width:max-content`.
- Cada tab mide `56px`.
- Labels abreviados: `PROGR`, `ESTUD`, `OCIO`, `RECET`, `ALERTA`, `RUTINA`.
- Inactivo mas claro `#64748B`.
- Ya no aparece la barrita verde inferior del tab activo.

Recomendacion visual:

- Volver a:

```js
<nav class="bottom-nav" style="position:fixed;bottom:0;left:0;right:0;z-index:30;">
  <div style="max-width:640px;margin:0 auto;display:flex;">
```

- Botones con `flex:1`.
- Labels completos y `font-size:8px`, `letter-spacing:0.1em`.
- Restaurar indicador inferior verde del activo.

### 4. Cards y secciones

Viejo:

- `.glass-card` ya era `rgba(15,23,41,0.85)`, borde `#1E2D45`, radio `12px`.
- Muchas subsecciones internas usaban `rgba(10,15,30,0.5)` o `rgba(22,32,53,0.6)`.
- Secciones estaban mas agrupadas por tema: `Nutricion & Cardio`, `Alimentacion`, totales, agua, asistente.

Nuevo:

- Usa la misma base `.glass-card`, pero mete mas tarjetas pequeñas sueltas.
- El bloque de rutina/split ahora esta dentro de una card propia grande. Antes era un header de dia mas liviano, no una card tan encerrada.
- Varias tarjetas nuevas usan `border-radius:10px`, `padding:10px 12px`, `background:rgba(...)`, lo que hace que se sienta mas “dashboard moderno modular” y menos “tracker compacto viejo”.

Recomendacion visual:

- Mantener `.glass-card`, pero recuperar jerarquia vieja:
  - rutina como header simple de dia, no card dominante
  - `SectionAccordion` viejo para habitos
  - subcards internas oscuras para `Nutricion & Cardio` y `Alimentacion`
- Evitar poner cada selector/control dentro de una card nueva si antes estaba integrado al header.

### 5. Acordeon de habitos/comidas

Viejo:

- Titulo: `Parametros Diarios`.
- Icono era `IActivity`, no emoji.
- Dentro tenia dos bloques visuales claros:
  - `Nutricion & Cardio` en amber `#F59E0B`
  - `Alimentacion` en verde `#10B981`
- Las comidas tenian:
  - card interna `background:rgba(22,32,53,0.6)`
  - titulo `Comida 1` color `#6366F1`
  - input IA con boton `LIMPIAR` e `IA`
  - chips de recetas en verde
  - lista de items con cantidad en verde, nombre, proteina, editar, borrar
  - totales de comida en 4 cuadritos `Kcal/P/C/G`
  - boton `GUARDAR COMO RECETA`
  - horarios de bocados abajo

Nuevo:

- Titulo: `Habitos y Nutricion`.
- Icono como emoji/string, se ve menos consistente con el sistema de iconos anterior.
- Las meds aparecen antes y las comidas se ven mas planas.
- No se ve el bloque superior `Nutricion & Cardio` como antes.
- Las comidas son cards directas, no subcards dentro de `Alimentacion`.
- El boton de guardar receta es chico, texto `Guardar Receta`, gris.
- La IA usa boton verde fuerte `IA`, no el boton anterior violeta/indigo mas integrado.
- Los chips de recetas son violetas; antes eran verdes (`rgba(16,185,129,...)`).
- Faltan visualmente los totales por comida en 4 cuadritos.

Recomendacion visual:

- Restaurar titulo `Parametros Diarios`.
- Usar icono `IActivity`.
- Volver a la estructura:
  - `Nutricion & Cardio`
  - `Alimentacion`
- Volver los chips de receta a verde.
- Boton IA al estilo viejo:
  - borde `rgba(99,102,241,0.3)`
  - fondo `rgba(99,102,241,0.25)`
  - texto `#A5B4FC`
- Restaurar totales por comida.
- Restaurar texto y jerarquia `GUARDAR COMO RECETA`.

### 6. Tipografia y jerarquia

Viejo:

- Marca/header mas grande y condensado.
- Labels de nav completos pero en `8px`.
- Mucho texto secundario en `#64748b` o `#374151`.
- Acciones en `Barlow Condensed` con `letter-spacing:0.05em`.
- `JetBrains Mono` para datos numericos.

Nuevo:

- Marca mas pequena pero mas pesada (`font-weight:900`).
- Nav con labels abreviados de `9px`.
- Inactivos mas visibles (`#64748B`), por eso la nav pesa mas visualmente.
- Se usa mas texto blanco/alto contraste en cards chicas.

Recomendacion visual:

- Volver a header `22px` con `Barlow Condensed`.
- Nav labels completos, `8px`, `letter-spacing:0.1em`, inactivo `#374151`.
- Mantener `JetBrains Mono` solo para numeros, cantidades y badges.

### 7. Colores

Paleta vieja base:

```css
--bg: #080D1A;
--surface: #0F1729;
--surface2: #162035;
--border: #1E2D45;
--green: #10B981;
--indigo: #6366F1;
--amber: #F59E0B;
--red: #EF4444;
```

Nuevo:

- Mantiene la paleta, pero agrega mas `#05070A`, mas gradiente, mas negro absoluto y mas cards con fondos azulados/transparentes.
- El icono del header mete `linear-gradient(135deg,#10B981,#3B82F6)`, que no estaba en la identidad anterior.
- Algunos elementos nuevos usan `#38BDF8` y `#7DD3FC` mas seguido, haciendo la UI mas celeste/azul que antes.

Recomendacion visual:

- Mantener la paleta vieja como dominante.
- Reducir el uso de celeste salvo badges puntuales como antes.
- Quitar gradiente del header.
- Fondo global `#080D1A`, no `#05070A`.

### 8. Dashboard HOY

Viejo:

- `TodayDashboard` estaba bien integrado como una card mas dentro de HOY.
- Tenia `Tablero principal`, stats, cards de modulos y foco.
- No era lo primero visual absoluto del dia; convivía con rutina/habitos.

Nuevo:

- El dashboard sigue bastante parecido, pero al estar dentro del shell de 480 y con header reducido se siente mas comprimido.
- Las cards de `DashboardActionCard` mantienen radios/paddings actuales, pero por ancho menor se apilan mas.

Recomendacion visual:

- No tocar la logica del dashboard.
- Volver al ancho viejo y al header viejo; eso solo ya recupera gran parte de la sensacion.
- Mantener el dashboard sin tarjeta extra de gimnasio si se busca la version anterior exacta.

## Checklist visual para Antigravity

- [ ] Cambiar wrapper global de `max-width:480px;background:#05070A` a estructura vieja `min-height:100vh;background:#080D1A`.
- [ ] Usar `max-width:640px` en header, main y bottom nav.
- [ ] Restaurar header viejo con marca textual grande y controles integrados.
- [ ] Quitar icono gradient del header.
- [ ] Volver nav inferior a `flex:1`, labels completos y barrita activa verde.
- [ ] Mantener `.glass-card` base, pero evitar cards nuevas alrededor de controles que antes estaban en header.
- [ ] Cambiar `Habitos y Nutricion` a `Parametros Diarios`.
- [ ] Rehacer visualmente `HabitsPanel` con bloques `Nutricion & Cardio` y `Alimentacion`.
- [ ] Volver chips de recetas a verde.
- [ ] Volver boton IA a estilo indigo/violeta anterior.
- [ ] Restaurar totales por comida `Kcal/P/C/G`.
- [ ] Mantener `WaterTracker`, `NutritionReviewCard`, `SmartCena` como funcionalidad, pero con posicion/espaciado viejo.
- [ ] No tocar callbacks ni estado salvo que sea estrictamente necesario para pasar props visuales.

## Regla de seguridad

Antigravity deberia hacer esto como una capa visual:

- CSS global
- estilos inline/layout
- clases auxiliares
- etiquetas/textos de nav
- orden visual de bloques

No deberia cambiar:

- Supabase
- guardado
- IA de comidas
- recetas
- salud
- rutinas
- persistencia local
- callbacks de `app-main.js`

