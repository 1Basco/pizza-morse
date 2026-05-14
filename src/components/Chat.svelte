<script lang="ts">
  import { onMount, tick } from "svelte";
  import MorseKey from "./MorseKey.svelte";
  import MessageBubble from "./MessageBubble.svelte";
  import SettingsSheet from "./SettingsSheet.svelte";
  import { store } from "../lib/state.svelte";
  import { query } from "../lib/db";
  import { startPolling, stopPolling, bumpPolling } from "../lib/poll";
  import type { PressEvent } from "../lib/morse";

  let scroller: HTMLDivElement | null = $state(null);
  let settingsOpen = $state(false);
  let bootError: string | null = $state(null);
  let sendError: string | null = $state(null);

  onMount(() => {
    (async () => {
      try {
        startPolling();
      } catch (e) {
        bootError = (e as Error).message;
      }
    })();
    return () => stopPolling();
  });

  let lastSeenCount = 0;
  $effect(() => {
    const count = store.messages.length;
    if (count > lastSeenCount) {
      lastSeenCount = count;
      tick().then(() => {
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      });
    }
  });

  async function send(events: PressEvent[], decoded: string) {
    if (!store.username) return;
    sendError = null;
    const total =
      events.length === 0
        ? 0
        : events[events.length - 1][0] + events[events.length - 1][1];
    try {
      await query(
        "INSERT INTO messages (username, events, decoded, total_ms, created_at) VALUES (?, ?, ?, ?, ?)",
        [store.username, JSON.stringify(events), decoded, total, Date.now()],
      );
      bumpPolling();
    } catch (e) {
      sendError = (e as Error).message;
      console.error('[morse] send failed:', e);
      throw e;
    }
  }
</script>

<header class="topbar">
  <div class="brand">
    <span class="dits mono" aria-hidden="true">·−·−</span>
    <span class="title">morse</span>
  </div>
  <button
    type="button"
    class="btn btn-ghost icon"
    onclick={() => (settingsOpen = true)}
    aria-label="Settings"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      />
    </svg>
  </button>
</header>

<div class="scroll" bind:this={scroller}>
  {#if bootError}
    <div class="empty">
      <strong>Couldn't reach the database.</strong>
      <p class="muted">{bootError}</p>
    </div>
  {:else if store.messages.length === 0}
    <div class="empty">
      <div class="dits-big mono" aria-hidden="true">· − · · ·</div>
      <p class="muted">
        No messages yet. Send the first one — hold the key below.
      </p>
    </div>
  {:else}
    <div class="list">
      {#each store.messages as msg (msg.id)}
        <MessageBubble
          username={msg.username}
          events={msg.events}
          decoded={msg.decoded}
          createdAt={msg.created_at}
          mine={msg.username === store.username}
        />
      {/each}
      <div class="tail-spacer"></div>
    </div>
  {/if}
</div>

{#if sendError}
  <div class="send-error">Send failed: {sendError}</div>
{/if}

<MorseKey onsend={send} />

<SettingsSheet open={settingsOpen} onclose={() => (settingsOpen = false)} />

<style>
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--card);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
  .dits {
    color: var(--primary);
    letter-spacing: 0.25em;
    font-size: 0.875rem;
  }
  .title {
    font-weight: 600;
    font-size: 1rem;
  }
  .icon {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
  }

  .scroll {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.875rem 0;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .tail-spacer {
    height: 0.5rem;
  }
  .empty {
    padding: 3rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    align-items: center;
  }
  .dits-big {
    font-size: 1.5rem;
    letter-spacing: 0.25em;
    color: var(--primary);
    opacity: 0.6;
  }
  .send-error {
    padding: 0.625rem 1rem;
    background: var(--destructive);
    color: var(--destructive-foreground);
    font-size: 0.875rem;
    text-align: center;
  }
</style>
