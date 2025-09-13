<script lang="ts">
  import Auth from './lib/Auth.svelte';
  import ExpenseInput from './lib/ExpenseInput.svelte';
  import ExpenseList from './lib/ExpenseList.svelte';
  import ExpenseChart from './lib/ExpenseChart.svelte'; // Import ExpenseChart
  import AdvancedChatbot from './lib/AdvancedChatbot.svelte'; // Import AdvancedChatbot
  import { auth, database } from './lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { ref, set, get, child } from 'firebase/database';
  import { onMount } from 'svelte';
  import { getExpenses, clearAndAddExpenses } from './lib/indexedDb';
  import { expensesUpdated, fundSources } from './lib/stores'; // Import expensesUpdated and fundSources store
  import FundSourceManager from './lib/FundSourceManager.svelte'; // Import FundSourceManager
  

  let user: any | null = null;
  let syncMessage: string | null = null;
  let syncMessageType: 'success' | 'danger' | null = null;
  let activeChatbot: 'old' | 'advanced' | null = null; // New state for active chatbot
  let showExpenseModal: boolean = false; // State to control modal visibility
  let showFundSourceManager: boolean = false; // New state for FundSourceManager visibility
  let totalExpenses: number = 0; // To store total expenses
  let remainingBalance: number = 0; // To store remaining balance

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      user = currentUser;
      if (currentUser) {
        console.log('User is logged in:', currentUser.email);
        await loadExpensesFromFirebaseToIndexedDB(currentUser.uid);
      } else {
        console.log('User is logged out.');
      }
    });
    return () => unsubscribe();
  });

  expensesUpdated.subscribe(async (updated) => {
    if (updated) {
      await calculateRemainingBalance();
      expensesUpdated.set(false);
    }
  });

  async function calculateRemainingBalance() {
    const allExpenses = await getExpenses();
    totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const currentTotalBalance = $fundSources.reduce((sum, source) => sum + source.balance, 0);
    remainingBalance = currentTotalBalance - totalExpenses;
  }

  async function loadExpensesFromFirebaseToIndexedDB(uid: string) {
    try {
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `users/${uid}/expenses`));
      if (snapshot.exists()) {
        const firebaseExpenses = snapshot.val();
        const expensesArray = Object.values(firebaseExpenses);
        await clearAndAddExpenses(expensesArray);
        console.log('Expenses loaded from Firebase to Firebase.');
        expensesUpdated.set(true);
      } else {
        console.log('No expenses found in Firebase for this user.');
      }
    } catch (error: any) {
      console.error('Error loading expenses from Firebase:', error);
      syncMessage = 'Error loading expenses from cloud: ' + error.message;
      syncMessageType = 'danger';
    }
  }

  function handleLogout() {
    auth.signOut();
  }

  async function syncWithFirebase() {
    syncMessage = null;
    syncMessageType = null;

    if (!user) {
      syncMessage = 'You must be logged in to sync.';
      syncMessageType = 'danger';
      return;
    }

    try {
      const localExpenses = await getExpenses();
      const userExpensesRef = ref(database, `users/${user.uid}/expenses`);
      await set(userExpensesRef, localExpenses);
      syncMessage = 'Expenses synced successfully!';
      syncMessageType = 'success';
      console.log('Expenses synced to Firebase:', localExpenses);
      expensesUpdated.set(true);
    } catch (error: any) {
      syncMessage = 'Error syncing expenses: ' + error.message;
      syncMessageType = 'danger';
      console.error('Error syncing expenses to Firebase:', error);
    }
  }

  function toggleChatbot(type: 'old' | 'advanced' | null) {
    if (activeChatbot === type) {
      activeChatbot = null; // Hide if already active
    } else {
      activeChatbot = type;
    }
  }
</script>

<nav class="navbar navbar-expand-lg navbar-light bg-light">
  <div class="container-fluid">
    <a class="navbar-brand" href="/">Chi Tiêu Cá Nhân</a>
    <div class="d-flex">
      {#if user}
        <span class="navbar-text me-3">
          Logged in as: {user.email}
        </span>
        <button class="btn btn-outline-primary me-2" on:click={syncWithFirebase}>
          Sync with Cloud
        </button>
        <button class="btn btn-outline-secondary" on:click={handleLogout}>
          Logout
        </button>
      {:else}
        <Auth />
      {/if}
    </div>
  </div>
</nav>

<main class="container mt-4">
  {#if user}
    {#if syncMessage}
      <div class="alert alert-{syncMessageType} alert-dismissible fade show" role="alert">
        {syncMessage}
        <button type="button" class="btn-close" on:click={() => syncMessage = null} aria-label="Close"></button>
      </div>
    {/if}

    <div class="row">
      <div class="col-md-6">
        <ExpenseInput />
        <hr>
        <ExpenseList />
      </div>
      <div class="col-md-6">
        <div class="d-flex justify-content-around mb-3">
          <button class="btn btn-info" on:click={() => toggleChatbot('advanced')}>
            Advanced Chatbot
          </button>
        </div>

        {#if activeChatbot === 'advanced'}
          <AdvancedChatbot />
        {/if}

        <hr>
        <ExpenseChart />
      </div>
    </div>
  {/if}
</main>

<style>
  /* Add any global styles here if necessary */
</style>