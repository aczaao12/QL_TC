<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  let newFundSourceName: string = '';
  let newFundSourceBalance: number = 0;
  let errorMessage: string | null = null;
  let loading: boolean = false; // New loading state

  const dispatch = createEventDispatcher();

  function handleSubmit() {
    errorMessage = null; // Clear previous errors
    loading = true; // Set loading to true

    if (newFundSourceName.trim() === '') {
      errorMessage = 'Fund source name cannot be empty.';
      loading = false; // Reset loading
      return;
    }
    if (newFundSourceBalance < 0) {
      errorMessage = 'Initial balance cannot be negative.';
      loading = false; // Reset loading
      return;
    }

    dispatch('addFundSource', { name: newFundSourceName, balance: newFundSourceBalance });
    newFundSourceName = '';
    newFundSourceBalance = 0;
    loading = false; // Reset loading after dispatch (assuming parent handles actual async operation)
  }
</script>

<div class="card mb-4">
  <div class="card-header">Add New Fund Source</div>
  <div class="card-body">
    <form on:submit|preventDefault={handleSubmit}>
      {#if errorMessage}
        <div class="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      {/if}
      <div class="mb-3">
        <label for="newFundSourceName" class="form-label">Name</label>
        <input
          type="text"
          class="form-control"
          id="newFundSourceName"
          bind:value={newFundSourceName}
          required
        />
      </div>
      <div class="mb-3">
        <label for="newFundSourceBalance" class="form-label">Initial Balance</label>
        <input
          type="number"
          class="form-control"
          id="newFundSourceBalance"
          bind:value={newFundSourceBalance}
          required
        />
      </div>
      <button type="submit" class="btn btn-primary" disabled={loading}>
        {#if loading}
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          Adding...
        {:else}
          Add Fund Source
        {/if}
      </button>
    </form>
  </div>
</div>