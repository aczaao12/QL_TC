<script lang="ts">
  import { onMount } from 'svelte';
  import { openDatabase, addExpense } from './indexedDb'; // Import IndexedDB functions

  let amount: number | null = null;
  let category: string = '';
  let date: string = new Date().toISOString().split('T')[0]; // Default to today's date
  let message: string | null = null;
  let messageType: 'success' | 'danger' | null = null;

  onMount(async () => {
    try {
      await openDatabase();
      console.log('IndexedDB ready.');
    } catch (error) {
      console.error('Failed to open IndexedDB:', error);
      message = 'Failed to initialize local storage.';
      messageType = 'danger';
    }
  });

  async function handleExpenseSubmit() {
    message = null;
    messageType = null;

    if (amount !== null && category && date) {
      try {
        await addExpense({ amount, category, date });
        message = 'Expense added successfully!';
        messageType = 'success';
        console.log('New Expense added:', { amount, category, date });
        // Reset form
        amount = null;
        category = '';
        date = new Date().toISOString().split('T')[0];
      } catch (error) {
        console.error('Error adding expense:', error);
        message = 'Error adding expense.';
        messageType = 'danger';
      }
    } else {
      message = 'Please fill in all fields.';
      messageType = 'danger';
    }
  }
</script>

<div class="container mt-5">
  <div class="card p-4 shadow-sm mx-auto" style="max-width: 500px;">
    <h2 class="card-title text-center mb-4">Add New Expense</h2>
    <form on:submit|preventDefault={handleExpenseSubmit}>
      {#if message}
        <div class="alert alert-{messageType}" role="alert">
          {message}
        </div>
      {/if}

      <div class="mb-3">
        <label for="amountInput" class="form-label">Amount</label>
        <input
          type="number"
          class="form-control"
          id="amountInput"
          bind:value={amount}
          required
        />
      </div>
      <div class="mb-3">
        <label for="categoryInput" class="form-label">Category</label>
        <input
          type="text"
          class="form-control"
          id="categoryInput"
          bind:value={category}
          required
        />
      </div>
      <div class="mb-3">
        <label for="dateInput" class="form-label">Date</label>
        <input
          type="date"
          class="form-control"
          id="dateInput"
          bind:value={date}
          required
        />
      </div>
      <button type="submit" class="btn btn-primary w-100">Add Expense</button>
    </form>
  </div>
</div>

<style>
  /* Component-specific styles if any */
</style>