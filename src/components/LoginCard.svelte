<script lang="ts">
  import { login } from '../lib/auth';
  import { setUsername } from '../lib/state.svelte';

  let username = $state('');
  let pin = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function submit(e: Event) {
    e.preventDefault();
    error = null;
    loading = true;
    const result = await login(username, pin);
    loading = false;
    if (result.ok) {
      setUsername(result.username);
    } else {
      error = result.message;
    }
  }
</script>

<div class="wrap">
  <form class="card" onsubmit={submit}>
    <header>
      <div class="dits" aria-hidden="true">·−·−</div>
      <h1>morse</h1>
      <p class="muted">A chat with one button. First time you use a name, the PIN sticks to it.</p>
    </header>

    <label class="label" for="username">Username</label>
    <input
      id="username"
      class="input"
      type="text"
      autocomplete="username"
      autocapitalize="none"
      autocorrect="off"
      spellcheck="false"
      placeholder="alice"
      bind:value={username}
      maxlength="20"
      required
    />

    <label class="label" for="pin" style="margin-top: 0.875rem">PIN</label>
    <input
      id="pin"
      class="input"
      type="password"
      inputmode="numeric"
      autocomplete="current-password"
      placeholder="••••"
      bind:value={pin}
      minlength="4"
      maxlength="32"
      required
    />

    {#if error}
      <p class="field-error">{error}</p>
    {/if}

    <button type="submit" class="btn btn-primary submit" disabled={loading}>
      {loading ? 'Connecting…' : 'Enter'}
    </button>
  </form>
</div>

<style>
  .wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
  }
  .card {
    width: 100%;
    max-width: 380px;
    padding: 1.5rem;
  }
  header {
    text-align: center;
    margin-bottom: 1.25rem;
  }
  .dits {
    font-family: var(--font-mono);
    font-size: 1.125rem;
    letter-spacing: 0.25em;
    color: var(--primary);
  }
  h1 {
    font-size: 1.5rem;
    margin: 0.25rem 0 0.5rem;
    font-weight: 600;
  }
  .muted {
    font-size: 0.9375rem;
    margin: 0;
  }
  .submit {
    width: 100%;
    margin-top: 1.25rem;
    padding: 0.75rem;
  }
</style>
