<script lang="ts">
  import { onMount } from 'svelte';
  import LoginCard from './components/LoginCard.svelte';
  import Chat from './components/Chat.svelte';
  import { store, applyTheme } from './lib/state.svelte';

  onMount(() => {
    applyTheme();
  });
</script>

<main class="app-shell">
  {#if store.username}
    <Chat />
  {:else}
    <LoginCard />
  {/if}
</main>
