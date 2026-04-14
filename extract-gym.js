const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf-8');

const gymMatch = html.match(/(const GymPanel = \(\{session, tracker:t, onSetComplete.*?\}\) => \{[\s\S]*?\n    \};)/);
const loginMatch = html.match(/(const LoginView = \(\) => \{[\s\S]*?\n    \};)/);

if (gymMatch) {
  const appGymJs = `export const createGymPanel = (deps) => {
  const {
    html, useState, useEffect, useRef, supabase, DEVICE_ID, pickNewestPayload,
    safeLocalSet, getDayDate, V3, IActivity, IDumb, ITarget, ISync, ICheck, 
    Card, SegmentedPillGroup, fn, pn, ft, resolveMuscleInfo,
    canonicalMuscleName, getPlanMode, TARGETS, MUSCLES
  } = deps;
  
${gymMatch[1]}

  return GymPanel;
};
`;
  fs.writeFileSync('app-gym.js', appGymJs, 'utf-8');
  console.log("Created app-gym.js");
  html = html.replace(gymMatch[0], '');
}

if (loginMatch) {
  const appLoginJs = `export const createLoginView = (deps) => {
  const { html, useState, supabase, Card } = deps;
  
${loginMatch[1]}

  return LoginView;
};
`;
  fs.writeFileSync('app-login.js', appLoginJs, 'utf-8');
  console.log("Created app-login.js");
  html = html.replace(loginMatch[0], '');
}

if (gymMatch || loginMatch) {
  const importsToInject = `
    import { createGymPanel } from './app-gym.js';
    import { createLoginView } from './app-login.js';
`;
  html = html.replace(
    "import { createNotifView } from './app-notifs.js';",
    "import { createNotifView } from './app-notifs.js';" + importsToInject
  );

  const initsToInject = `
    const GymPanel = createGymPanel(viewDeps);
    const LoginView = createLoginView(viewDeps);
`;
  html = html.replace(
    "const NotifView = createNotifView(viewDeps);",
    "const NotifView = createNotifView(viewDeps);" + initsToInject
  );

  fs.writeFileSync('index.html', html, 'utf-8');
  console.log("Updated index.html");
} else {
  console.log("Could not find GymPanel or LoginView.");
}
