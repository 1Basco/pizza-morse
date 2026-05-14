<script lang="ts">
  import { store, setSilent, setAudioOnly, setKeyBinding, setTheme, setUsername, keyLabel } from '../lib/state.svelte';

  type Props = { open: boolean; onclose: () => void };
  let { open, onclose }: Props = $props();

  let capturing = $state(false);

  function toggleSilent() { setSilent(!store.silent); }
  function toggleAudioOnly() { setAudioOnly(!store.audioOnly); }
  function pickTheme(value: 'light' | 'dark' | 'system') { setTheme(value); }
  function logout() { setUsername(null); onclose(); }

  function startCapture() {
    if (capturing) { capturing = false; return; }
    capturing = true;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === 'Escape') {
        capturing = false;
        window.removeEventListener('keydown', handler, true);
        return;
      }
      // Refuse pure modifiers — they'd make the binding unusable.
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' ||
          e.code === 'ControlLeft' || e.code === 'ControlRight' ||
          e.code === 'AltLeft' || e.code === 'AltRight' ||
          e.code === 'MetaLeft' || e.code === 'MetaRight') return;
      setKeyBinding(e.code);
      capturing = false;
      window.removeEventListener('keydown', handler, true);
    };
    window.addEventListener('keydown', handler, true);
  }
</script>

{#if open}
  <div class="backdrop" onclick={onclose} role="presentation"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Settings">
    <header>
      <h2>Settings</h2>
      <button type="button" class="btn btn-ghost close" onclick={onclose} aria-label="Close">×</button>
    </header>

    <section>
      <div class="row">
        <div>
          <div class="title">Playback</div>
          <div class="desc muted">
            {store.silent ? 'Flash only — silent.' : 'Sound only — beeps.'}
          </div>
        </div>
        <button
          type="button"
          class="switch"
          class:on={store.silent}
          onclick={toggleSilent}
          aria-pressed={store.silent}
          aria-label="Silent mode"
        >
          <span class="knob"></span>
        </button>
      </div>

      <div class="row">
        <div>
          <div class="title">Audio only</div>
          <div class="desc muted">
            {store.audioOnly ? 'No dots, dashes, or decoded text — pure listening.' : 'Show dot/dash patterns and decoded text.'}
          </div>
        </div>
        <button
          type="button"
          class="switch"
          class:on={store.audioOnly}
          onclick={toggleAudioOnly}
          aria-pressed={store.audioOnly}
          aria-label="Audio only"
        >
          <span class="knob"></span>
        </button>
      </div>

      <div class="row">
        <div>
          <div class="title">Morse key shortcut</div>
          <div class="desc muted">
            {capturing ? 'Press any key (Esc to cancel)…' : `Hold ${keyLabel(store.keyBinding)} on a keyboard to key.`}
          </div>
        </div>
        <button type="button" class="btn btn-ghost" onclick={startCapture}>
          {capturing ? 'Cancel' : 'Rebind'}
        </button>
      </div>

      <div class="row col">
        <div class="title">Theme</div>
        <div class="seg">
          <button class:active={store.theme === 'system'} onclick={() => pickTheme('system')}>System</button>
          <button class:active={store.theme === 'light'} onclick={() => pickTheme('light')}>Light</button>
          <button class:active={store.theme === 'dark'} onclick={() => pickTheme('dark')}>Dark</button>
        </div>
      </div>

      <div class="row">
        <div>
          <div class="title">Signed in as</div>
          <div class="desc muted">{store.username ?? '—'}</div>
        </div>
        <button type="button" class="btn btn-ghost" onclick={logout}>Log out</button>
      </div>
    </section>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0;
    background: hsl(0 0% 0% / 0.4);
    z-index: 40;
    animation: fade var(--duration-base) var(--ease-enter);
  }
  .sheet {
    position: fixed;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 100%;
    max-width: 720px;
    background: var(--card);
    color: var(--card-foreground);
    border-top: 1px solid var(--border);
    border-top-left-radius: var(--radius-lg);
    border-top-right-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 50;
    padding: 1rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
    animation: slide var(--duration-slow) var(--ease-enter);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  h2 { font-size: 1.125rem; margin: 0; font-weight: 600; }
  .close {
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    font-size: 1.5rem;
    line-height: 1;
  }

  section { display: flex; flex-direction: column; gap: 0.875rem; }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.625rem 0;
    border-bottom: 1px solid var(--border);
  }
  .row:last-child { border-bottom: 0; }
  .row.col { flex-direction: column; align-items: stretch; }
  .title { font-size: 0.9375rem; font-weight: 600; }
  .desc { font-size: 0.8125rem; margin-top: 0.125rem; }

  .switch {
    position: relative;
    width: 2.75rem;
    height: 1.625rem;
    border-radius: var(--radius-full);
    background: var(--muted);
    border: 1px solid var(--border);
    transition: background-color var(--duration-fast) var(--ease-enter);
    flex-shrink: 0;
  }
  .switch.on { background: var(--primary); }
  .knob {
    position: absolute;
    top: 50%;
    left: 0.125rem;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    border-radius: var(--radius-full);
    background: var(--card);
    box-shadow: var(--shadow-sm);
    transition: left var(--duration-fast) var(--ease-enter);
  }
  .switch.on .knob { left: calc(100% - 1.375rem); }

  .seg {
    display: flex;
    gap: 0.25rem;
    background: var(--muted);
    border-radius: var(--radius-button);
    padding: 0.25rem;
  }
  .seg button {
    flex: 1;
    padding: 0.4375rem 0.5rem;
    border-radius: calc(var(--radius-button) - 0.125rem);
    color: var(--muted-foreground);
    font-weight: 500;
  }
  .seg button.active {
    background: var(--card);
    color: var(--foreground);
    box-shadow: var(--shadow-sm);
  }

  @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slide { from { transform: translate(-50%, 100%) } to { transform: translate(-50%, 0) } }
</style>
