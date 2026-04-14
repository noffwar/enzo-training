
import { h } from 'https://esm.sh/preact';
import htm from 'https://esm.sh/htm';
const html = htm.bind(h);

import * as comp from './app-components.js';
import * as utils from './app-utils.js';
import * as cons from './app-constants.js';
import { createTodayDashboard } from './app-dashboard.js';
import { createApp } from './app-main.js';

const viewDeps = {
  h, html,
  ...utils, ...cons, ...comp,
  createTodayDashboard
};

try {
  console.log('Testing createAppComponents...');
  const dynamic = comp.createAppComponents(viewDeps);
  Object.assign(viewDeps, dynamic);
  console.log('Dynamic components created:', Object.keys(dynamic));

  console.log('Testing createTodayDashboard...');
  const TodayDashboard = createTodayDashboard(viewDeps);
  console.log('TodayDashboard factory type:', typeof TodayDashboard);

  console.log('Testing createApp...');
  const App = createApp(viewDeps);
  console.log('App factory type:', typeof App);

  console.log('SUCCESS: All factories initialized without ReferenceError.');
} catch (e) {
  console.error('FAILURE:', e.message);
  console.error(e.stack);
}
