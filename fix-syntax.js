const fs = require('fs');
let text = fs.readFileSync('index.html', 'utf-8');

const badLines = `    const       getPlanMode, newDay, Card, ITarget, IPause, IPlay, IReset, V3, HealthHistoryRow,
      TARGETS, DAYS, MUSCLES, canonicalMuscleName, resolveMuscleInfo,
      getRoutineAssignments, dayTotals, isBeforeStart, formatWeekLabel,
      getRC = () => window._RC || window.Recharts || {};`;

const goodLines = `    const getRC = () => window._RC || window.Recharts || {};`;

text = text.replace(badLines, goodLines);
text = text.replace(
  "ISync, ICheck, IChevD, ITarget, IPlay, IPause, IReset, ICal, IActivity, IDumb, IBell, IEdit, IList",
  "ISync, ICheck, IChevD, ITarget, IPlay, IPause, IReset, ICal, IActivity, IDumb, IBell, IEdit, IList,\n      getPlanMode, newDay, V3, TARGETS, DAYS, MUSCLES, canonicalMuscleName, resolveMuscleInfo, getRoutineAssignments, dayTotals, isBeforeStart, formatWeekLabel"
);

fs.writeFileSync('index.html', text, 'utf-8');
console.log('Fixed syntax error.');
