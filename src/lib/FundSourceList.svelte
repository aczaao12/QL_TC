<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FundSource } from './stores';

  export let fundSources: FundSource[];
  export let editingFundSource: FundSource | null;
  export let isUpdating: boolean; // New prop
  export let isDeleting: boolean; // New prop

  const dispatch = createEventDispatcher();

  function handleEdit(source: FundSource) {
    dispatch('editFundSource', source);
  }

  function handleDelete(id: number | undefined) {
    dispatch('deleteFundSource', id);
  }

  function handleUpdate() {
    dispatch('updateFundSource');
  }

  function handleCancelEdit() {
    dispatch('cancelEdit');
  }
</script>

<div class="card">
  <div class="card-header">Existing Fund Sources</div>
  <div style="max-height: 300px; overflow-y: auto;">
    <ul class="list-group list-group-flush">
      {#each fundSources as source (source.id)}
        <li class="list-group-item d-flex justify-content-between align-items-center">
          {#if editingFundSource && editingFundSource.id === source.id}
            <div class="flex-grow-1 me-2">
              <input type="text" class="form-control mb-1" bind:value={editingFundSource.name} />
              <input type="number" class="form-control" bind:value={editingFundSource.balance} />
            </div>
            <div>
              <button class="btn btn-success btn-sm me-1" on:click={handleUpdate} disabled={isUpdating}>Save</button>
              <button class="btn btn-secondary btn-sm" on:click={handleCancelEdit} disabled={isUpdating}>Cancel</button>
            </div>
          {:else}
            <div>
              <strong>{source.name}</strong>
              <br />
              <small>Balance: {source.balance.toLocaleString()} VND</small>
            </div>
            <div>
              <button class="btn btn-info btn-sm me-1" on:click={() => handleEdit(source)} disabled={isUpdating || isDeleting}>Edit</button>
              <button class="btn btn-danger btn-sm" on:click={() => handleDelete(source.id)} disabled={isUpdating || isDeleting}>
                {#if isDeleting && editingFundSource?.id === source.id}
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Deleting...
                {:else}
                  Delete
                {/if}
              </button>
            </div>
          {/if}
        </li>
      {:else}
        <li class="list-group-item text-center">No fund sources added yet.</li>
      {/each}
    </ul>
  </div>
</div>