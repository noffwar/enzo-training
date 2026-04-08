import { safeLocalSet, readStoredJson } from './app-core.js?v=20260408-3';

const TASK_ALERTS_KEY = 'enzo_task_alerts_v1';
const AI_THREADS_KEY = 'enzo_ai_thought_threads_v1';
const AI_DRAFTS_KEY = 'enzo_ai_thought_drafts_v1';

export const loadTaskAlerts = () => readStoredJson(TASK_ALERTS_KEY, {});
export const saveTaskAlerts = (value) => safeLocalSet(TASK_ALERTS_KEY, value || {});

export const loadThoughtThreads = () => readStoredJson(AI_THREADS_KEY, {});
export const saveThoughtThreads = (threads) => safeLocalSet(AI_THREADS_KEY, threads || {});

export const loadThoughtDrafts = () => readStoredJson(AI_DRAFTS_KEY, {});
export const saveThoughtDrafts = (drafts) => safeLocalSet(AI_DRAFTS_KEY, drafts || {});
