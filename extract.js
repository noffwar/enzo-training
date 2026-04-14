const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf-8');

// The lines were (roughly) 3784 for WeekSummary and 4026 for ProgressView
// Let's use Regex to extract them so it's robust.

let weekSummaryMatch = html.match(/(const WeekSummary = \(\{weekData, weekKey\}\) => \{[\s\S]*?\n    \};)/);
let progressViewMatch = html.match(/(const ProgressView = \(\{allWeeks, onMount\}\) => \{[\s\S]*?\n    \};)/);

if (!weekSummaryMatch || !progressViewMatch) {
  console.log("Could not find components.");
  process.exit(1);
}

const appProgressJs = `export const createProgressViews = (deps) => {
  const {
    html, useState, useEffect, useMemo, getRC,
    pn, fn, TARGETS, DAYS, MUSCLES, canonicalMuscleName, resolveMuscleInfo,
    getRoutineAssignments, dayTotals, isBeforeStart, formatWeekLabel,
    getPlanMode, newDay, Card, ITarget
  } = deps;

${weekSummaryMatch[1]}

${progressViewMatch[1]}

  return { WeekSummary, ProgressView };
};
`;

fs.writeFileSync('app-progress.js', appProgressJs, 'utf-8');
console.log("Created app-progress.js");

// Now extract FloatingTimer
let timerMatch = html.match(/(const FloatingTimer = \(\{left, active, onToggle, onReset\}\) => \{[\s\S]*?\n    \};)/);
if (timerMatch) {
  const appTimerJs = `export const createTimerView = (deps) => {
  const { html, ft, IPause, IPlay, IReset } = deps;
  
${timerMatch[1]}

  return FloatingTimer;
};
`;
  fs.writeFileSync('app-timer.js', appTimerJs, 'utf-8');
  console.log("Created app-timer.js");
}
