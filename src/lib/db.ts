const BASE_URL = import.meta.env.VITE_DB_BASE_URL as string | undefined;
const API_KEY = import.meta.env.VITE_DB_API_KEY as string | undefined;

if (!BASE_URL || !API_KEY) {
  console.error('Missing VITE_DB_BASE_URL or VITE_DB_API_KEY in .env');
}

export type Row = Record<string, unknown>;

export async function query<T extends Row = Row>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DB error ${res.status}: ${text || res.statusText}`);
  }
  const data = await res.json();
  if (data && typeof data === 'object' && !Array.isArray(data) && 'error' in data) {
    throw new Error(`DB error: ${(data as { error: unknown }).error}`);
  }
  // Columnar response: { columns: [{name,type},...], rows: [[v,...],...] }
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { columns?: unknown }).columns) &&
    Array.isArray((data as { rows?: unknown }).rows)
  ) {
    const cols = (data as { columns: Array<{ name: string }> }).columns.map((c) => c.name);
    const rows = (data as { rows: unknown[][] }).rows;
    return rows.map((r) => {
      const obj: Row = {};
      for (let i = 0; i < cols.length; i++) obj[cols[i]] = r[i];
      return obj;
    }) as T[];
  }
  // Array-of-objects response (the shape db_usage_example.md describes).
  if (Array.isArray(data)) return data as T[];
  return [];
}
