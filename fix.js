const fs = require('fs');
let b = fs.readFileSync('app-health.js', 'utf8');
b = b.replace(/<\$\{HealthHistoryRow,\s*ISync,\s*ICheck,\s*IChevD\}/g, '<${HealthHistoryRow}');
fs.writeFileSync('app-health.js', b);
console.log("REPLACED app-health.js");
