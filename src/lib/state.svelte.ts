import type { PressEvent } from './morse';

export type Message = {
  id: number;
  username: string;
  events: PressEvent[];
  decoded: string;
  total_ms: number;
  created_at: number;
};

const STORAGE_USER = 'morse.user';
const STORAGE_SILENT = 'morse.silent';
const STORAGE_THEME = 'morse.theme';
const STORAGE_AUDIO_ONLY = 'morse.audioOnly';
const STORAGE_KEY_BINDING = 'morse.keyBinding';
const DEFAULT_KEY_BINDING = 'Space';

function readUser(): string | null {
  try { return localStorage.getItem(STORAGE_USER); } catch { return null; }
}
function readSilent(): boolean {
  try { return localStorage.getItem(STORAGE_SILENT) === '1'; } catch { return false; }
}
function readAudioOnly(): boolean {
  try { return localStorage.getItem(STORAGE_AUDIO_ONLY) === '1'; } catch { return false; }
}
function readKeyBinding(): string {
  try { return localStorage.getItem(STORAGE_KEY_BINDING) || DEFAULT_KEY_BINDING; } catch { return DEFAULT_KEY_BINDING; }
}
type Theme = 'light' | 'dark' | 'system';
function readTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_THEME);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch { return 'system'; }
}

export const store = $state({
  username: readUser(),
  silent: readSilent(),
  audioOnly: readAudioOnly(),
  keyBinding: readKeyBinding(),
  theme: readTheme() as Theme,
  messages: [] as Message[],
  latestId: 0,
  pollIntervalMs: 1500,
});

export function setUsername(name: string | null) {
  store.username = name;
  try {
    if (name) localStorage.setItem(STORAGE_USER, name);
    else localStorage.removeItem(STORAGE_USER);
  } catch { /* ignore */ }
}

export function setSilent(value: boolean) {
  store.silent = value;
  try { localStorage.setItem(STORAGE_SILENT, value ? '1' : '0'); } catch { /* ignore */ }
}

export function setAudioOnly(value: boolean) {
  store.audioOnly = value;
  try { localStorage.setItem(STORAGE_AUDIO_ONLY, value ? '1' : '0'); } catch { /* ignore */ }
}

export function setKeyBinding(code: string) {
  store.keyBinding = code;
  try { localStorage.setItem(STORAGE_KEY_BINDING, code); } catch { /* ignore */ }
}

/** Human-readable label for a KeyboardEvent.code value. */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  if (code.startsWith('Arrow')) return `${code.slice(5)} arrow`;
  switch (code) {
    case 'Space': return 'Space';
    case 'Enter': return 'Enter';
    case 'Tab': return 'Tab';
    case 'Backquote': return '`';
    case 'Minus': return '-';
    case 'Equal': return '=';
    case 'BracketLeft': return '[';
    case 'BracketRight': return ']';
    case 'Backslash': return '\\';
    case 'Semicolon': return ';';
    case 'Quote': return '\'';
    case 'Comma': return ',';
    case 'Period': return '.';
    case 'Slash': return '/';
    case 'ShiftLeft': return 'Left Shift';
    case 'ShiftRight': return 'Right Shift';
    case 'ControlLeft': return 'Left Ctrl';
    case 'ControlRight': return 'Right Ctrl';
    case 'AltLeft': return 'Left Alt';
    case 'AltRight': return 'Right Alt';
    default: return code;
  }
}

export function setTheme(value: Theme) {
  store.theme = value;
  try { localStorage.setItem(STORAGE_THEME, value); } catch { /* ignore */ }
  applyTheme();
}

export function applyTheme() {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (store.theme === 'light') root.classList.add('light');
  else if (store.theme === 'dark') root.classList.add('dark');
}

export function appendMessages(rows: Message[]) {
  if (rows.length === 0) return;
  store.messages = [...store.messages, ...rows];
  store.latestId = rows[rows.length - 1].id;
}
