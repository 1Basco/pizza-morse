import { query } from './db';
import { store, appendMessages, type Message } from './state.svelte';
import type { PressEvent } from './morse';

const MIN_INTERVAL = 1500;
const MAX_INTERVAL = 8000;

type Row = {
  id: number;
  username: string;
  events: string;
  decoded: string;
  total_ms: number;
  created_at: number;
};

function parseRow(r: Row): Message {
  let events: PressEvent[] = [];
  if (typeof r.events === 'string' && r.events.length > 0) {
    try {
      const parsed = JSON.parse(r.events);
      if (Array.isArray(parsed)) events = parsed as PressEvent[];
    } catch (e) {
      console.warn('[morse] failed to parse events for row', r.id, e);
    }
  }
  return { ...r, events };
}

let timer: number | null = null;
let running = false;

async function tick() {
  if (!running) return;
  try {
    const rows = await query<Row>(
      'SELECT id, username, events, decoded, total_ms, created_at FROM messages WHERE id > ? ORDER BY id ASC LIMIT 200',
      [store.latestId]
    );
    if (rows.length > 0) {
      appendMessages(rows.map(parseRow));
      store.pollIntervalMs = MIN_INTERVAL;
    } else {
      store.pollIntervalMs = Math.min(store.pollIntervalMs * 2, MAX_INTERVAL);
    }
  } catch (e) {
    console.error('[morse] poll tick failed:', e);
    store.pollIntervalMs = Math.min(store.pollIntervalMs * 2, MAX_INTERVAL);
  }
  if (running) timer = window.setTimeout(tick, store.pollIntervalMs);
}

export function startPolling() {
  if (running) return;
  running = true;
  store.pollIntervalMs = MIN_INTERVAL;
  void tick();
}

export function stopPolling() {
  running = false;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Call after a successful send so we re-check the DB quickly for the round-trip. */
export function bumpPolling() {
  if (!running) return;
  store.pollIntervalMs = MIN_INTERVAL;
  if (timer !== null) clearTimeout(timer);
  timer = window.setTimeout(tick, 250);
}
