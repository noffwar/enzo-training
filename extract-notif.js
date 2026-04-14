const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf-8');

let notifMatch = html.match(/(const NotifView = \(\{session\}\) => \{[\s\S]*?\n    \};)/);
if (notifMatch) {
  const appNotifJs = `export const createNotifView = (deps) => {
  const {
    html, useState, useEffect, supabase, DEVICE_ID, pickNewestPayload,
    safeLocalSet, getDayDate, V3, IActivity, IDumb, ITarget, ISync, 
    Card, HealthHistoryRow, safeDispatch
  } = deps;
  
${notifMatch[1]}

  return NotifView;
};
`;
  fs.writeFileSync('app-notifs.js', appNotifJs, 'utf-8');
  console.log("Created app-notifs.js");
} else {
  console.log("Could not find NotifView.");
}

