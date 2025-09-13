<script lang="ts">
  import { Modal } from 'bootstrap';
  import { onMount, createEventDispatcher } from 'svelte';
  import FundSourceForm from './FundSourceForm.svelte';
  import { addFundSource } from './indexedDb'; // Assuming addFundSource is available here

  let modalElement: HTMLElement;
  let fundSourceModal: Modal;
  const dispatch = createEventDispatcher();

  onMount(() => {
    fundSourceModal = new Modal(modalElement);
  });

  export function show() {
    fundSourceModal.show();
  }

  export function hide() {
    fundSourceModal.hide();
  }

  async function handleAddFundSource(event: CustomEvent) {
    const { name, balance } = event.detail;
    try {
      await addFundSource({ name, balance });
      dispatch('fundSourceAdded');
      hide();
    } catch (error) {
      console.error('Error adding fund source:', error);
      // Optionally, display an error message in the modal
    }
  }
</script>

<div class="modal fade" bind:this={modalElement} tabindex="-1" aria-labelledby="fundSourceModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="fundSourceModalLabel">Add New Fund Source</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <FundSourceForm on:addFundSource={handleAddFundSource} />
      </div>
    </div>
  </div>
</div>