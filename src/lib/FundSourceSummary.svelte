<script lang="ts">
  import { fundSources } from './stores';
  import type { FundSource } from './stores';

  $: totalBalance = $fundSources.reduce((sum, source) => sum + source.balance, 0);
</script>

<div class="card mt-4">
  <div class="card-header">
    <h5>Total Balance: {totalBalance.toLocaleString('vi-VN')} VND</h5>
  </div>
  <ul class="list-group list-group-flush">
    {#each $fundSources as source (source.id)}
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span>{source.name}</span>
        <strong>{source.balance.toLocaleString('vi-VN')} VND</strong>
      </li>
    {:else}
      <li class="list-group-item text-center text-muted">No fund sources added.</li>
    {/each}
  </ul>
</div>