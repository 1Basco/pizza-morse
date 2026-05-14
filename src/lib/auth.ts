import { query } from './db';

export async function hashPin(username: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${username}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type LoginResult =
  | { ok: true; username: string }
  | { ok: false; reason: 'pin_mismatch' | 'invalid' | 'db_error'; message: string };

const USERNAME_RE = /^[a-z0-9_]{2,20}$/i;

export async function login(rawUsername: string, pin: string): Promise<LoginResult> {
  const username = rawUsername.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return { ok: false, reason: 'invalid', message: 'Username must be 2–20 chars: letters, digits, underscore.' };
  }
  if (pin.length < 4) {
    return { ok: false, reason: 'invalid', message: 'PIN must be at least 4 characters.' };
  }

  const hash = await hashPin(username, pin);
  try {
    const rows = await query<{ pin_hash: string }>(
      'SELECT pin_hash FROM users WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      await query(
        'INSERT INTO users (username, pin_hash, created_at) VALUES (?, ?, ?)',
        [username, hash, Date.now()]
      );
      return { ok: true, username };
    }
    if (rows[0].pin_hash !== hash) {
      return { ok: false, reason: 'pin_mismatch', message: 'Wrong PIN for that username.' };
    }
    return { ok: true, username };
  } catch (e) {
    return { ok: false, reason: 'db_error', message: (e as Error).message };
  }
}
