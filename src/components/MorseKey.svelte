<script lang="ts">
  import { onMount } from 'svelte';
  import { decode, type PressEvent } from '../lib/morse';
  import { liveTone } from '../lib/audio';
  import { store, keyLabel } from '../lib/state.svelte';

  type Props = {
    onsend: (events: PressEvent[], decoded: string) => Promise<void> | void;
    disabled?: boolean;
  };
  let { onsend, disabled = false }: Props = $props();

  let events = $state<PressEvent[]>([]);
  let pressing = $state(false);
  let sending = $state(false);
  let pressStartedAt: number | null = null;
  let recordingStartedAt: number | null = null;
  let pointerId: number | null = null;
  let keyHeld = false;
  let stopTone: (() => void) | null = null;

  const preview = $derived.by(() => events.length === 0 ? '' : decode(events).pattern);
  const previewText = $derived.by(() => events.length === 0 ? '' : decode(events).text);

  function startPress() {
    if (disabled || sending) return;
    if (pressStartedAt !== null) return; // already held from some source
    pressing = true;
    const now = performance.now();
    if (recordingStartedAt === null) recordingStartedAt = now;
    pressStartedAt = now;
    try { stopTone = liveTone(); } catch { stopTone = null; }
  }

  function endPress() {
    if (pressStartedAt === null || recordingStartedAt === null) {
      pressing = false;
      if (stopTone) { stopTone(); stopTone = null; }
      return;
    }
    pressing = false;
    if (stopTone) { stopTone(); stopTone = null; }
    const now = performance.now();
    const offset = pressStartedAt - recordingStartedAt;
    const duration = Math.max(20, now - pressStartedAt);
    events = [...events, [Math.round(offset), Math.round(duration)]];
    pressStartedAt = null;
  }

  function down(e: PointerEvent) {
    if (pointerId !== null) return; // already tracking another pointer
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerId = e.pointerId;
    startPress();
  }

  function up(e: PointerEvent) {
    if (pointerId !== e.pointerId) return;
    e.preventDefault();
    pointerId = null;
    endPress();
  }

  function cancel(e: PointerEvent) {
    if (pointerId !== e.pointerId) return;
    pointerId = null;
    pressing = false;
    if (stopTone) { stopTone(); stopTone = null; }
    pressStartedAt = null;
  }

  function isTyping(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code !== store.keyBinding) return;
    if (e.repeat) { e.preventDefault(); return; } // swallow OS auto-repeat
    if (isTyping(e.target)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    keyHeld = true;
    startPress();
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code !== store.keyBinding) return;
    if (!keyHeld) return;
    e.preventDefault();
    keyHeld = false;
    endPress();
  }

  function onBlur() {
    // Window lost focus mid-press — drop the key so we don't stick.
    if (keyHeld) {
      keyHeld = false;
      pressing = false;
      if (stopTone) { stopTone(); stopTone = null; }
      pressStartedAt = null;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  });

  function clear() {
    events = [];
    recordingStartedAt = null;
  }

  async function send() {
    if (events.length === 0 || sending) return;
    sending = true;
    const decoded = decode(events).text;
    try {
      await onsend(events, decoded);
      events = [];
      recordingStartedAt = null;
    } finally {
      sending = false;
    }
  }
</script>

<div class="pad no-select">
  <div class="preview" aria-live="polite">
    {#if store.audioOnly}
      {#if events.length > 0}
        <span class="hint muted">{events.length} press{events.length === 1 ? '' : 'es'} recorded</span>
      {:else}
        <span class="hint muted">Hold the key. Short = dot, long = dash.</span>
      {/if}
    {:else if preview}
      <span class="pattern mono">{preview}</span>
      {#if previewText}<span class="decoded muted">{previewText}</span>{/if}
    {:else}
      <span class="hint muted">Hold the key. Short = dot, long = dash.</span>
    {/if}
  </div>

  <button
    type="button"
    class="key"
    class:active={pressing}
    onpointerdown={down}
    onpointerup={up}
    onpointercancel={cancel}
    onpointerleave={cancel}
    onclick={(e) => e.preventDefault()}
    aria-label="Morse key"
    disabled={disabled || sending}
  >
    <span class="key-inner">
      <span class="dot"></span>
    </span>
  </button>

  <div class="key-hint muted">or press <kbd>{keyLabel(store.keyBinding)}</kbd></div>

  <div class="actions">
    <button
      type="button"
      class="btn btn-ghost"
      onclick={clear}
      disabled={events.length === 0 || sending}
    >Clear</button>
    <button
      type="button"
      class="btn btn-primary"
      onclick={send}
      disabled={events.length === 0 || sending}
    >{sending ? 'Sending…' : 'Send'}</button>
  </div>
</div>

<style>
  .pad {
    padding: 0.75rem 1rem 1.25rem;
    background: var(--card);
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
  }

  .preview {
    min-height: 1.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    text-align: center;
  }
  .pattern {
    font-size: 1.25rem;
    letter-spacing: 0.15em;
    color: var(--foreground);
  }
  .decoded {
    font-size: 0.875rem;
    letter-spacing: 0.1em;
  }
  .hint { font-size: 0.875rem; }

  .key {
    width: 100%;
    height: 7rem;
    border-radius: var(--radius-lg);
    background: var(--primary);
    color: var(--primary-foreground);
    border: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    transition: transform 60ms var(--ease-enter), filter 60ms var(--ease-enter), box-shadow 60ms var(--ease-enter);
  }
  .key:disabled { opacity: 0.6; }
  .key.active {
    transform: translateY(2px);
    filter: brightness(1.1);
    box-shadow: var(--shadow-sm);
  }
  .key-inner {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dot {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: var(--radius-full);
    background: var(--primary-foreground);
    opacity: 0.85;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }
  .actions .btn { flex: 1; padding: 0.75rem; }

  .key-hint {
    font-size: 0.75rem;
    text-align: center;
    letter-spacing: 0.04em;
  }
  .key-hint kbd {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: 0.125rem 0.4375rem;
    border: 1px solid var(--border);
    border-bottom-width: 2px;
    border-radius: 0.3125rem;
    background: var(--background);
    color: var(--foreground);
    margin-left: 0.25rem;
  }
  /* Desktop only — touch devices don't have keyboards */
  @media (hover: none) and (pointer: coarse) {
    .key-hint { display: none; }
  }
</style>
