<script lang="ts">
  import Auth from './lib/Auth.svelte';
  import ExpenseInput from './lib/ExpenseInput.svelte';
  import ExpenseList from './lib/ExpenseList.svelte';
  import ExpenseChart from './lib/ExpenseChart.svelte'; // Import ExpenseChart
  import Chatbot from './lib/Chatbot.svelte';
  import { auth, database } from './lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { ref, set, get, child } from 'firebase/database';
  import { onMount } from 'svelte';
  import { getExpenses, clearAndAddExpenses } from './lib/indexedDb';
  import { expensesUpdated } from './lib/stores';

  let user: any | null = null;
  let syncMessage: string | null = null;
  let syncMessageType: 'success' | 'danger' | null = null;
  let showChatbot = false;

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

  async function loadExpensesFromFirebaseToIndexedDB(uid: string) {
    try {
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `users/${uid}/expenses`));
      if (snapshot.exists()) {
        const firebaseExpenses = snapshot.val();
        const expensesArray = Object.values(firebaseExpenses);
        await clearAndAddExpenses(expensesArray);
        console.log('Expenses loaded from Firebase to IndexedDB.');
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

  function toggleChatbot() {
    showChatbot = !showChatbot;
  }
</script>

<main>
  {#if user}
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container-fluid">
        <span class="navbar-brand">Expense Tracker</span>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <span class="nav-link">Welcome, {user.email}</span>
            </li>
            <li class="nav-item">
              <button class="btn btn-info me-2" on:click={toggleChatbot}>
                {showChatbot ? 'Hide Chatbot' : 'Show Chatbot'}
              </button>
            </li>
            <li class="nav-item">
              <button class="btn btn-primary me-2" on:click={syncWithFirebase}>Sync</button>
            </li>
            <li class="nav-item">
              <button class="btn btn-outline-danger" on:click={handleLogout}>Logout</button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <div class="container mt-3">
      {#if syncMessage}
        <div class="alert alert-{syncMessageType}" role="alert">
          {syncMessage}
        </div>
      {/if}
    </div>
    <div class="container">
      {#if showChatbot}
        <Chatbot userId={user.uid} />
      {:else}
        <div class="row">
          <div class="col-md-4">
            <ExpenseInput />
          </div>
          <div class="col-md-4">
            <ExpenseList />
          </div>
          <div class="col-md-4">
            <ExpenseChart />
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <Auth />
  {/if}
</main>

<style>
  /* You can add global styles here if needed */
</style>