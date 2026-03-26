# Enzo Training PWA v3.1

Panel personal de entrenamiento, nutrición y hábitos.

## Stack

- **Frontend**: Preact + HTM (sin build step)
- **Base de datos**: Supabase (PostgreSQL)
- **IA nutricional**: Google Gemini Flash (v3-preview) via Netlify Functions
- **Hosting**: Netlify

## Archivos

## Archivos

```
index.html          → App completa (Preact + HTM)
sw.js               → Service Worker (notificaciones + offline)
manifest.json       → PWA config
get-macros.js       → Netlify Function (análisis IA de comidas)
icon-192.png        → Ícono PWA
icon-512.png        → Ícono PWA splash
```

## Variables de entorno (Netlify)

```
GEMINI_API_KEY=...
```

## Supabase — Tablas requeridas

```sql
CREATE TABLE daily_logs (
  date       TEXT PRIMARY KEY,
  data       JSONB,
  updated_at TIMESTAMPTZ
);

CREATE TABLE weekly_configs (
  week_key   TEXT PRIMARY KEY,
  data       JSONB,
  updated_at TIMESTAMPTZ
);
```

## Deploy

1. Conectar repo a Netlify
2. Agregar `GEMINI_API_KEY` en Environment Variables
3. El archivo `get-macros.js` va en `netlify/functions/get-macros.js`

## Estructura de datos

- `weekly_configs` → `{ dayMapping, sessions }` (estructura de rutinas de la semana)
- `daily_logs` → `{ meds, meals, fasted, water, ... , _session, _updatedAt }` (log del día)
