<script lang="ts">
  import { onMount } from 'svelte';
  import { getExpenses } from './indexedDb';
  import { expensesUpdated } from './stores'; // Import the store

  interface Expense {
    id?: number; // IndexedDB auto-incremented key
    amount: number;
    category: string;
    date: string;
    timestamp: string; // ISO string from IndexedDB
  }

  let expenses: Expense[] = [];
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    await fetchExpenses();
  });

  // Subscribe to the expensesUpdated store
  expensesUpdated.subscribe(async (updated) => {
    if (updated) {
      await fetchExpenses();
      expensesUpdated.set(false); // Reset the store after updating
    }
  });

  async function fetchExpenses() {
    loading = true;
    error = null;
    try {
      expenses = await getExpenses();
      console.log('Fetched expenses:', expenses);
    } catch (e: any) {
      error = 'Failed to load expenses: ' + e.message;
      console.error('Error fetching expenses:', e);
    } finally {
      loading = false;
    }
  }
</script>

<div class="container mt-4">
  <h3 class="mb-3 text-center">Your Expenses</h3>

  {#if loading}
    <p class="text-center">Loading expenses...</p>
  {:else if error}
    <div class="alert alert-danger text-center" role="alert">
      {error}
    </div>
  {:else if expenses.length === 0}
    <div class="alert alert-info text-center" role="alert">
      No expenses recorded yet.
    </div>
  {:else}
    <ul class="list-group">
      {#each expenses as expense (expense.id)}
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>{expense.category}</strong> - {new Date(expense.date).toLocaleDateString()}
          </div>
          <span class="badge bg-primary rounded-pill">{expense.amount.toLocaleString()} VND</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* Component-specific styles if any */
</style>