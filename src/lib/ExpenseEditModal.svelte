<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import type { Expense } from './stores';

  export let expense: Expense;

  let editedAmount: number = expense.amount;
  let editedCategory: string = expense.category;
  let editedDate: string = expense.date;

  const dispatch = createEventDispatcher();

  function save() {
    dispatch('save', {
      id: expense.id,
      amount: editedAmount,
      category: editedCategory,
      date: editedDate,
    });
  }

  function close() {
    dispatch('close');
  }
</script>

<div class="modal" style="display: block; background-color: rgba(0,0,0,0.5);">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Edit Expense</h5>
        <button type="button" class="btn-close" aria-label="Close" on:click={close}></button>
      </div>
      <div class="modal-body">
        <form on:submit|preventDefault={save}>
          <div class="mb-3">
            <label for="editAmount" class="form-label">Amount</label>
            <input
              type="number"
              class="form-control"
              id="editAmount"
              bind:value={editedAmount}
              required
            />
          </div>
          <div class="mb-3">
            <label for="editCategory" class="form-label">Category</label>
            <input
              type="text"
              class="form-control"
              id="editCategory"
              bind:value={editedCategory}
              required
            />
          </div>
          <div class="mb-3">
            <label for="editDate" class="form-label">Date</label>
            <input
              type="date"
              class="form-control"
              id="editDate"
              bind:value={editedDate}
              required
            />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" on:click={close}>Close</button>
            <button type="submit" class="btn btn-primary">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>