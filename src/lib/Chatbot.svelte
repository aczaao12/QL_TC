<script lang="ts">
  import { onMount } from 'svelte';
  import { callGeminiAPI } from './aiService'; // Import the AI service
  import { addExpense } from './indexedDb'; // Import addExpense
  import { database } from './firebase'; // Import database
  import { ref, push } from 'firebase/database'; // Import ref and push
  import { expensesUpdated } from './stores'; // Import the store

  export let userId: string; // Prop to receive the current user's ID

  let messages: { text: string; sender: 'user' | 'bot' }[] = [];
  let newMessage = '';
  let isSending = false;

  const suggestedPrompts = [
    'Hôm nay tôi chi 10k bánh, 2k tiền gửi xe, 5k bị rơi mất. 20k tiền nước',
    'Tháng này tôi đã chi bao nhiêu?',
    'Tôi đã chi 200k cho ăn uống vào hôm qua',
    'Liệt kê các khoản chi của tôi',
    'Chào bot',
    'Tôi nhận được 1000k tiền lương hôm nay',
  ];

  function selectSuggestedPrompt(prompt: string) {
    newMessage = prompt;
    sendMessage();
  }

  async function sendMessage() {
    if (newMessage.trim() === '' || isSending) return;

    const userMessage = newMessage.trim();
    messages = [...messages, { text: userMessage, sender: 'user' }];
    newMessage = '';
    isSending = true;

    try {
      const { responseText, expenseData } = await callGeminiAPI(userMessage, userId);
      messages = [...messages, { text: responseText, sender: 'bot' }];

      if (expenseData && expenseData.length > 0) {
        for (const transaction of expenseData) {
          // Save to IndexedDB
          await addExpense(transaction);
          console.log('Transaction saved to IndexedDB from chatbot:', transaction);

          // Save to Firebase Realtime Database
          const userTransactionsRef = ref(database, `users/${userId}/transactions`);
          await push(userTransactionsRef, { ...transaction, timestamp: new Date().toISOString() });
          console.log('Transaction saved to Firebase from chatbot:', transaction);
        }
        expensesUpdated.set(true); // Notify ExpenseList to update
      }
    } catch (error) {
      console.error('Error calling Gemini API or saving transaction:', error);
      messages = [...messages, { text: 'Sorry, I am having trouble processing your request.', sender: 'bot' }];
    } finally {
      isSending = false;
    }
  }

  onMount(() => {
    // Initial bot message
    messages = [...messages, { text: 'Hello! How can I help you with your expenses and income?', sender: 'bot' }];
  });

  // Reactive statement to scroll to bottom when messages change
  $: messages, (() => {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  })();
</script>

<div class="container mt-5">
  <div class="card p-4 shadow-sm mx-auto" style="max-width: 600px; height: 70vh; display: flex; flex-direction: column;">
    <h3 class="card-title text-center mb-4">AI Chatbot</h3>

    <div class="d-flex flex-wrap justify-content-center mb-3">
      {#each suggestedPrompts as prompt}
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm m-1"
          on:click={() => selectSuggestedPrompt(prompt)}
          disabled={isSending}
        >
          {prompt}
        </button>
      {/each}
    </div>

    <div id="chat-window" class="flex-grow-1 overflow-auto mb-3 p-3 border rounded">
      {#each messages as message}
        <div class="d-flex mb-2" class:justify-content-end={message.sender === 'user'}>
          <div class="p-2 rounded" class:bg-primary={message.sender === 'user'} class:text-white={message.sender === 'user'} class:bg-light={message.sender === 'bot'} class:border={message.sender === 'bot'}>
            {message.text}
          </div>
        </div>
      {/each}
    </div>

    <form on:submit|preventDefault={sendMessage} class="d-flex">
      <input
        type="text"
        class="form-control me-2"
        placeholder="Type your message..."
        bind:value={newMessage}
        disabled={isSending}
      />
      <button type="submit" class="btn btn-primary" disabled={isSending}>
        {#if isSending}
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span class="visually-hidden">Loading...</span>
        {:else}
          Send
        {/if}
      </button>
    </form>
  </div>
</div>

<style>
  /* Component-specific styles if any */
</style>