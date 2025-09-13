<script lang="ts">
  import ExpenseFormModal from './ExpenseFormModal.svelte';
  import { createEventDispatcher } from 'svelte';

  export let onExpenseAdded: () => void; // Prop to call when expense is added

  let expenseFormModal: ExpenseFormModal;
  const dispatch = createEventDispatcher();

  function openExpenseModal() {
    expenseFormModal.show();
  }

  function handleExpenseAdded() {
    onExpenseAdded();
  }
</script>

<div>
  <button type="button" class="btn btn-primary" on:click={openExpenseModal} style="border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; padding: 0;">
    <i class="bi bi-plus-circle-fill"></i>
  </button>

  <ExpenseFormModal bind:this={expenseFormModal} on:expenseAdded={handleExpenseAdded} />
</div>

<style>
  /* Component-specific styles if any */
</style>