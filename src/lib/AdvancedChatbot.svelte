<!-- src/lib/AdvancedChatbot.svelte -->

<script lang="ts">
  import { parsePromptWithAI, followUpWithAI } from './aiParser';
  import { executeAIAction } from './executor';
  import { auth } from './firebase';
  import { onMount } from 'svelte';
  import { formatTransactionsTable, formatAggregateResult } from './utils';

  let messageInput: string = '';
  let chatMessages: { text: string; sender: 'user' | 'ai' }[] = [];
  let isLoading: boolean = false;
  let currentUser: any = null;
  let lastResult: any = null;

  onMount(() => {
    auth.onAuthStateChanged((user) => {
      currentUser = user;
    });
  });

  async function sendMessage() {
    if (!messageInput.trim()) return;

    const userMessage = messageInput;
    chatMessages = [...chatMessages, { text: userMessage, sender: 'user' }];
    messageInput = '';
    isLoading = true;

    try {
      if (!currentUser) {
        chatMessages = [...chatMessages, { text: "Please log in to use the chatbot.", sender: 'ai' }];
        isLoading = false;
        return;
      }

      const userData = { uid: currentUser.uid, email: currentUser.email };

      const followUpKeywords = ["gồm những gì", "chi tiết", "những gì", "liệt kê"];
      const isFollowUp = followUpKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));

      let aiResponseText: string;

      if (isFollowUp && lastResult) {
        aiResponseText = await followUpWithAI(userMessage, lastResult);
      } else {
        const aiAction = await parsePromptWithAI(userMessage, userData);
        console.log("AI Action:", aiAction);

        const result = await executeAIAction({ ...aiAction, uid: currentUser.uid });
        console.log("Execution Result:", result);

        if (result.success) {
          if (aiAction.action === "read") {
          lastResult = result.data;
          aiResponseText = formatTransactionsTable(result.data); // 👈 bảng
        } else if (aiAction.action === "aggregate" && aiAction.aggregate) {
            lastResult = result.result;
            aiResponseText = formatAggregateResult(aiAction.aggregate.operation, aiAction.aggregate.field, result.result);
          } else if (aiAction.action === "analyze") {
            lastResult = result.data;
            aiResponseText = `Action "${aiAction.action}" successful. Data: ${JSON.stringify(result.data)}`;
          } else {
            lastResult = null;
            aiResponseText = `Action "${aiAction.action}" successful. Message: ${result.message}`;
          }
        } else {
          lastResult = null;
          aiResponseText = `Action "${aiAction.action}" failed. Error: ${result.message}`;
        }
      }

      chatMessages = [...chatMessages, { text: aiResponseText, sender: 'ai' }];
    } catch (error) {
      console.error("Error in chatbot:", error);
      chatMessages = [...chatMessages, { text: "An error occurred while processing your request.", sender: 'ai' }];
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="advanced-chatbot-container card">
  <div class="card-header">
    Advanced AI Chatbot
  </div>
  <div class="card-body chat-window">
    {#each chatMessages as message}
      <div class="message {message.sender}">
        {message.text}
      </div>
    {/each}
    {#if isLoading}
      <div class="message ai">
        Typing...
      </div>
    {/if}
  </div>
  <div class="card-footer chat-input-area">
    <input
      type="text"
      class="form-control"
      placeholder="Type your message..."
      bind:value={messageInput}
      on:keypress={(e) => { if (e.key === 'Enter') sendMessage(); }}
      disabled={isLoading}
    />
    <button class="btn btn-primary" on:click={sendMessage} disabled={isLoading}>
      Send
    </button>
  </div>
</div>

<style>
  .advanced-chatbot-container {
    max-width: 600px;
    margin: 20px auto;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    height: 70vh; /* Adjust as needed */
  }

  .card-header {
    background-color: #007bff;
    color: white;
    font-weight: bold;
    padding: 15px;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }

  .chat-window {
    flex-grow: 1;
    padding: 15px;
    overflow-y: auto;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }

  .message {
    margin-bottom: 10px;
    padding: 8px 12px;
    border-radius: 15px;
    max-width: 80%;
    word-wrap: break-word;
  }

  .message.user {
    background-color: #dcf8c6;
    align-self: flex-end;
    margin-left: auto;
  }

  .message.ai {
    background-color: #e2e3e5;
    align-self: flex-start;
    margin-right: auto;
  }

  .chat-input-area {
    display: flex;
    padding: 15px;
    background-color: #f1f1f1;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  .chat-input-area .form-control {
    flex-grow: 1;
    margin-right: 10px;
    border-radius: 20px;
    padding: 10px 15px;
  }

  .chat-input-area .btn {
    border-radius: 20px;
    padding: 10px 20px;
  }
</style>