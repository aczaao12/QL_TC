<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { openDatabase, addExpense, getFundSources } from './indexedDb'; // Import IndexedDB functions
  import type { FundSource } from './stores';

  export let onExpenseAdded: () => void; // Prop to call when expense is added

  let amount: number | null = null;
  let category: string = '';
  let date: string = new Date().toISOString().split('T')[0]; // Default to today's date
  let message: string | null = null;
  let messageType: 'success' | 'danger' | null = null;
  let fundSources: FundSource[] = [];
  let selectedFundSource: string = ''; // To store the name of the selected fund source

  onMount(async () => {
    try {
      await openDatabase();
      fundSources = await getFundSources();
      if (fundSources.length > 0) {
        selectedFundSource = fundSources[0].name; // Select the first fund source by default
      }
      console.log('IndexedDB ready. Fund Sources:', fundSources);
    } catch (error) {
      console.error('Failed to open IndexedDB:', error);
      message = 'Failed to initialize local storage.';
      messageType = 'danger';
    }
  });

  async function handleExpenseSubmit() {
    message = null;
    messageType = null;

    if (amount !== null && category && date && selectedFundSource) { // Added selectedFundSource check
      try {
        await addExpense({
          type: 'expense',
          name: category, // Using category as name for now, can be changed later
          amount,
          category,
          date,
          sourceOfFunds: selectedFundSource // Add sourceOfFunds
        });
        message = 'Expense added successfully!';
        messageType = 'success';
        console.log('New Expense added:', { amount, category, date, sourceOfFunds: selectedFundSource });
        // Reset form
        amount = null;
        category = '';
        date = new Date().toISOString().split('T')[0];
        // selectedFundSource remains as default or last selected
        onExpenseAdded(); // Call the prop function to close the modal
      } catch (error) {
        console.error('Error adding expense:', error);
        message = 'Error adding expense.';
        messageType = 'danger';
      }
    } else {
      message = 'Please fill in all fields and select a fund source.'; // Updated message
      messageType = 'danger';
    }
  }
</script>

<div>
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
    <div class="mb-3">
      <label for="fundSourceSelect" class="form-label">Source of Funds</label>
      <select class="form-select" id="fundSourceSelect" bind:value={selectedFundSource} required>
        {#each fundSources as source (source.id)}
          <option value={source.name}>{source.name} ({source.balance.toLocaleString()} VND)</option>
        {/each}
        {#if fundSources.length === 0}
          <option value="" disabled>No fund sources available. Please add one.</option>
        {/if}
      </select>
    </div>
    <button type="submit" class="btn btn-primary w-100">Add Expense</button>
  </form>
</div>

<style>
  /* Component-specific styles if any */
</style>