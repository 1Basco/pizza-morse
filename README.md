# pizza-morse
This project make heavily usage of AI generated code, since is just for a simples research quest.
A morse-code chat. One button, one tone, one rhythm.

## Stack

- Svelte 5 + TypeScript + Vite
- SQL-over-HTTP DB (see `db_usage_example.md`)

## Run

```
pnpm install
pnpm dev
```

Make a copy of `.env.example` as `.env` and fill in the two DB variables.

## How it works

- Hold the morse key to send a dot or dash. The browser records every press as `[offset_ms_from_first_press, duration_ms]`.
- On send, the press sequence is clustered into dots/dashes and gap classes (intra-letter / inter-letter / inter-word), decoded to text, and persisted as JSON alongside the decoded string. No audio file is stored — playback is re-synthesized from the timings.
- Messages are polled with exponential backoff (faster after a send, slower when idle).
- Username + PIN (SHA-256 hashed) on first use; the same username later must match the stored hash.
