<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { openDatabase, addExpense, getFundSources } from './indexedDb';
  import type { FundSource } from './stores';
  import { Modal } from 'bootstrap';
  import FundSourceModal from './FundSourceModal.svelte'; // Import FundSourceModal

  let modalElement: HTMLElement;
  let expenseModal: Modal;
  let fundSourceModal: FundSourceModal; // Declare FundSourceModal instance

  let amount: number | null = null;
  let category: string = '';
  let date: string = new Date().toISOString().split('T')[0];
  let message: string | null = null;
  let messageType: 'success' | 'danger' | null = null;
  let fundSources: FundSource[] = [];
  let selectedFundSource: string = '';

  const dispatch = createEventDispatcher();

  onMount(async () => {
    expenseModal = new Modal(modalElement);
    await loadFundSources(); // Load fund sources on mount
  });

  async function loadFundSources() {
    try {
      await openDatabase();
      fundSources = await getFundSources();
      if (fundSources.length > 0 && !selectedFundSource) {
        selectedFundSource = fundSources[0].name; // Select the first fund source by default if none selected
      } else if (fundSources.length === 0) {
        selectedFundSource = ''; // Clear selection if no fund sources
      }
      console.log('IndexedDB ready. Fund Sources:', fundSources);
    } catch (error) {
      console.error('Failed to open IndexedDB:', error);
      message = 'Failed to initialize local storage.';
      messageType = 'danger';
    }
  }

  export function show() {
    expenseModal.show();
  }

  export function hide() {
    expenseModal.hide();
  }

  function openFundSourceModal() {
    fundSourceModal.show();
  }

  async function handleFundSourceAdded() {
    await loadFundSources(); // Refresh fund sources after a new one is added
  }

  async function handleExpenseSubmit() {
    message = null;
    messageType = null;

    if (amount !== null && category && date && selectedFundSource) {
      try {
        await addExpense({
          type: 'expense',
          name: category,
          amount,
          category,
          date,
          sourceOfFunds: selectedFundSource
        });
        message = 'Expense added successfully!';
        messageType = 'success';
        console.log('New Expense added:', { amount, category, date, sourceOfFunds: selectedFundSource });
        // Reset form
        amount = null;
        category = '';
        date = new Date().toISOString().split('T')[0];
        dispatch('expenseAdded'); // Dispatch event instead of prop
        hide(); // Close the modal after successful submission
      } catch (error) {
        console.error('Error adding expense:', error);
        message = 'Error adding expense.';
        messageType = 'danger';
      }
    } else {
      message = 'Please fill in all fields and select a fund source.';
      messageType = 'danger';
    }
  }
</script>

<div class="modal fade" bind:this={modalElement} tabindex="-1" aria-labelledby="expenseModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="expenseModalLabel">Add New Expense</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
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
            <div class="input-group">
              <select class="form-select" id="fundSourceSelect" bind:value={selectedFundSource} required>
                {#each fundSources as source (source.id)}
                  <option value={source.name}>{source.name} ({source.balance.toLocaleString()} VND)</option>
                {/each}
                {#if fundSources.length === 0}
                  <option value="" disabled>No fund sources available. Please add one.</option>
                {/if}
              </select>
              <button type="button" class="btn btn-outline-secondary" on:click={openFundSourceModal}>
                <i class="bi bi-plus-lg"></i>
              </button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary w-100">Add Expense</button>
        </form>
        <FundSourceModal bind:this={fundSourceModal} on:fundSourceAdded={handleFundSourceAdded} />
      </div>
    </div>
  </div>
</div>

<style>
  /* Component-specific styles if any */
</style>