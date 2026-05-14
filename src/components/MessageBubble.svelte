<script lang="ts">
  import { decode, type PressEvent } from '../lib/morse';
  import { playTones, setActivePlayback } from '../lib/audio';
  import { store } from '../lib/state.svelte';

  type Props = {
    username: string;
    events: PressEvent[];
    decoded: string;
    createdAt: number;
    mine: boolean;
  };
  let { username, events, decoded, createdAt, mine }: Props = $props();

  let revealed = $state(false);
  let flashing = $state(false);
  let flashTimers: number[] = [];

  const pattern = $derived.by(() => decode(events).pattern || '…');

  function play() {
    revealed = true;
    clearFlashTimers();
    if (store.silent) {
      // Register our flash cancellation so the next bubble's tap stops us.
      setActivePlayback(clearFlashTimers);
      runFlash();
    } else {
      // playTones itself registers its stop function as the active playback.
      try { playTones(events); } catch { /* ignore */ }
    }
  }

  function runFlash() {
    flashing = false;
    for (const [offset, duration] of events) {
      const onAt = window.setTimeout(() => { flashing = true; }, offset);
      const offAt = window.setTimeout(() => { flashing = false; }, offset + duration);
      flashTimers.push(onAt, offAt);
    }
  }

  function clearFlashTimers() {
    flashTimers.forEach((t) => clearTimeout(t));
    flashTimers = [];
    flashing = false;
  }

  function timeLabel(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="row" class:mine>
  <button
    type="button"
    class="bubble"
    class:mine
    class:flashing
    onclick={play}
    aria-label="Play message from {username}"
  >
    {#if !mine}
      <div class="who">{username}</div>
    {/if}
    {#if store.audioOnly}
      <div class="play-row">
        <svg class="play-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <span class="play-label mono">tap to play</span>
      </div>
    {:else}
      <div class="pattern mono">{pattern}</div>
      {#if revealed}
        <div class="decoded">{decoded || '—'}</div>
      {/if}
    {/if}
    <div class="meta">{timeLabel(createdAt)}</div>
  </button>
</div>

<style>
  .row {
    display: flex;
    justify-content: flex-start;
    padding: 0 1rem;
  }
  .row.mine { justify-content: flex-end; }

  .bubble {
    text-align: left;
    background: var(--card);
    color: var(--card-foreground);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.625rem 0.875rem;
    max-width: 78%;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease-enter),
                border-color var(--duration-fast) var(--ease-enter);
  }
  .bubble:hover { border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); }
  .bubble.mine {
    background: color-mix(in srgb, var(--primary) 18%, var(--card));
    border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  }
  .bubble.flashing {
    background: var(--primary);
    color: var(--primary-foreground);
    border-color: var(--primary);
  }

  .who {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--primary);
    letter-spacing: 0.04em;
  }
  .pattern {
    font-size: 1.0625rem;
    letter-spacing: 0.18em;
    word-break: break-all;
  }
  .play-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.125rem 0;
  }
  .play-icon { color: var(--primary); flex-shrink: 0; }
  .bubble.flashing .play-icon { color: var(--primary-foreground); }
  .play-label {
    font-size: 0.8125rem;
    letter-spacing: 0.08em;
    color: var(--muted-foreground);
    text-transform: lowercase;
  }
  .bubble.flashing .play-label { color: var(--primary-foreground); opacity: 0.85; }
  .decoded {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    letter-spacing: 0.06em;
  }
  .bubble.flashing .decoded,
  .bubble.flashing .meta,
  .bubble.flashing .who { color: var(--primary-foreground); opacity: 0.85; }
  .meta {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
    text-align: right;
  }
</style>
