<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let message: string = 'Are you sure?';
  export let confirmText: string = 'Confirm';
  export let cancelText: string = 'Cancel';

  const dispatch = createEventDispatcher();

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="modal" style="display: block; background-color: rgba(0,0,0,0.5);">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Confirmation</h5>
        <button type="button" class="btn-close" aria-label="Close" on:click={handleCancel}></button>
      </div>
      <div class="modal-body">
        <p>{message}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" on:click={handleCancel}>{cancelText}</button>
        <button type="button" class="btn btn-danger" on:click={handleConfirm}>{confirmText}</button>
      </div>
    </div>
  </div>
</div>