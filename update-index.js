const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf-8');

// The lines we extracted
const weekSummaryMatch = html.match(/(const WeekSummary = \(\{weekData, weekKey\}\) => \{[\s\S]*?\n    \};)/);
const progressViewMatch = html.match(/(const ProgressView = \(\{allWeeks, onMount\}\) => \{[\s\S]*?\n    \};)/);
const timerMatch = html.match(/(const FloatingTimer = \(\{left, active, onToggle, onReset\}\) => \{[\s\S]*?\n    \};)/);
const notifMatch = html.match(/(const NotifView = \(\{session\}\) => \{[\s\S]*?\n    \};)/);

if (weekSummaryMatch) html = html.replace(weekSummaryMatch[0], '');
if (progressViewMatch) html = html.replace(progressViewMatch[0], '');
if (timerMatch) html = html.replace(timerMatch[0], '');
if (notifMatch) html = html.replace(notifMatch[0], '');

// Add imports
const importsToInject = `
    import { createProgressViews } from './app-progress.js';
    import { createTimerView } from './app-timer.js';
    import { createNotifView } from './app-notifs.js';
`;

html = html.replace(
  "import { createBooksView } from './app-books.js';",
  "import { createBooksView } from './app-books.js';" + importsToInject
);

// Add to viewDeps
const depsToInject = `      getPlanMode, newDay, Card, ITarget, IPause, IPlay, IReset, V3, HealthHistoryRow,
      TARGETS, DAYS, MUSCLES, canonicalMuscleName, resolveMuscleInfo,
      getRoutineAssignments, dayTotals, isBeforeStart, formatWeekLabel,`;

html = html.replace(
  "getRC",
  depsToInject + "\n      getRC"
);

// Initialize views
const initsToInject = `
    const { WeekSummary, ProgressView } = createProgressViews(viewDeps);
    const FloatingTimer = createTimerView(viewDeps);
    const NotifView = createNotifView(viewDeps);
`;

html = html.replace(
  "const BooksView = createBooksView(viewDeps);",
  "const BooksView = createBooksView(viewDeps);" + initsToInject
);

fs.writeFileSync('index.html', html, 'utf-8');
console.log("Updated index.html");
