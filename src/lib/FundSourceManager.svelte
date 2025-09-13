<script lang="ts">
  import { onMount } from 'svelte';
  import { getFundSources, addFundSource, updateFundSource, deleteFundSource } from './indexedDb';
  import type { FundSource } from './stores';
  import FundSourceForm from './FundSourceForm.svelte';
  import FundSourceList from './FundSourceList.svelte';
  import ConfirmModal from './ConfirmModal.svelte'; // Import ConfirmModal

  let fundSources: FundSource[] = [];
  let editingFundSource: FundSource | null = null;
  let message: string | null = null;
  let messageType: 'success' | 'danger' | null = null;
  let isUpdating: boolean = false; // New loading state for update
  let isDeleting: boolean = false; // New loading state for delete
  let messageTimeout: ReturnType<typeof setTimeout> | null = null; // For auto-hiding messages
  let showConfirmDeleteModal: boolean = false; // New state for confirm modal visibility
  let fundSourceToDeleteId: number | undefined = undefined; // To store the ID of the fund source to be deleted
  let lastDeletedFundSource: FundSource | null = null; // To store the last deleted fund source for undo

  function clearMessage() {
    if (messageTimeout) {
      clearTimeout(messageTimeout);
      messageTimeout = null;
    }
    message = null;
    messageType = null;
  }

  function showNotification(msg: string, type: 'success' | 'danger') {
    clearMessage(); // Clear any existing message
    message = msg;
    messageType = type;
    messageTimeout = setTimeout(() => {
      clearMessage();
      lastDeletedFundSource = null; // Clear undo state if message auto-hides
    }, 5000); // Auto-hide after 5 seconds, giving time for undo
  }

  onMount(async () => {
    await fetchFundSources();
  });

  async function fetchFundSources() {
    try {
      fundSources = await getFundSources();
      message = null;
    } catch (e: any) {
      showNotification('Failed to load fund sources: ' + e.message, 'danger');
      console.error('Error fetching fund sources:', e);
    }
  }

  async function handleAddFundSource(event: CustomEvent) {
    message = null;
    messageType = null;
    const newSource = event.detail;
    try {
      await addFundSource(newSource);
      await fetchFundSources();
      showNotification('Fund source added successfully!', 'success');
    } catch (e: any) {
      showNotification('Failed to add fund source: ' + e.message, 'danger');
      console.error('Error adding fund source:', e);
    }
  }

  function handleEditFundSource(event: CustomEvent) {
    editingFundSource = { ...event.detail }; // Create a copy
  }

  async function handleUpdateFundSource() {
    message = null;
    messageType = null;
    if (editingFundSource) {
      if (editingFundSource.name.trim() === '') {
        message = 'Fund source name cannot be empty.';
        messageType = 'danger';
        return;
      }
      if (editingFundSource.balance < 0) {
        message = 'Balance cannot be negative.';
        messageType = 'danger';
        return;
      }
      isUpdating = true; // Set loading to true
      try {
        await updateFundSource(editingFundSource);
        editingFundSource = null;
        await fetchFundSources();
        showNotification('Fund source updated successfully!', 'success');
      } catch (e: any) {
        showNotification('Failed to update fund source: ' + e.message, 'danger');
        console.error('Error updating fund source:', e);
      } finally {
        isUpdating = false; // Reset loading
      }
    }
  }

  async function handleDeleteFundSource(event: CustomEvent) {
    message = null;
    messageType = null;
    fundSourceToDeleteId = event.detail; // Store the ID
    if (fundSourceToDeleteId === undefined) return;

    showConfirmDeleteModal = true; // Show the custom confirm modal
  }

  async function confirmDelete() {
    showConfirmDeleteModal = false; // Hide the modal
    if (fundSourceToDeleteId === undefined) return;

    isDeleting = true; // Set loading to true
    try {
      // Get the fund source before deleting it
      const allFundSources = await getFundSources();
      lastDeletedFundSource = allFundSources.find(fs => fs.id === fundSourceToDeleteId) || null;

      await deleteFundSource(fundSourceToDeleteId);
      await fetchFundSources();
      showNotification('Fund source deleted successfully! <button class="btn btn-link btn-sm p-0 ms-2" on:click={undoDelete}>Undo</button>', 'success');
    } catch (e: any) {
      showNotification('Failed to delete fund source: ' + e.message, 'danger');
      console.error('Error deleting fund source:', e);
    } finally {
      isDeleting = false; // Reset loading
      fundSourceToDeleteId = undefined; // Clear the stored ID
    }
  }

  function cancelDelete() {
    showConfirmDeleteModal = false; // Hide the modal
    fundSourceToDeleteId = undefined; // Clear the stored ID
  }

  async function undoDelete() {
    if (lastDeletedFundSource) {
      try {
        await addFundSource(lastDeletedFundSource);
        await fetchFundSources();
        showNotification('Deletion undone successfully!', 'success');
        lastDeletedFundSource = null; // Clear the undo state
      } catch (e: any) {
        showNotification('Failed to undo deletion: ' + e.message, 'danger');
        console.error('Error undoing deletion:', e);
      }
    }
  }

  function handleCancelEdit() {
    editingFundSource = null;
  }
</script>

<div class="container mt-4">
  <h3 class="mb-3 text-center">Manage Fund Sources</h3>

  {#if message}
    <div class="alert alert-{messageType}" role="alert">
      {@html message}
    </div>
  {/if}

  <FundSourceForm on:addFundSource={handleAddFundSource} />

  <FundSourceList
    fundSources={fundSources}
    editingFundSource={editingFundSource}
    isUpdating={isUpdating}
    isDeleting={isDeleting}
    on:editFundSource={handleEditFundSource}
    on:deleteFundSource={handleDeleteFundSource}
    on:updateFundSource={handleUpdateFundSource}
    on:cancelEdit={handleCancelEdit}
  />
</div>

{#if showConfirmDeleteModal}
  <ConfirmModal
    message="Are you sure you want to delete this fund source? This action cannot be undone."
    on:confirm={confirmDelete}
    on:cancel={cancelDelete}
  />
{/if}