<script lang="ts">
  import { fundSources } from './stores';
  import type { FundSource } from './stores';

  $: totalBalance = $fundSources.reduce((sum, source) => sum + source.balance, 0);
</script>

<li class="list-group-item d-flex justify-content-between align-items-center list-group-item-info fw-bold fs-5 s-W5567j2H82Zs">
  <strong class="s-W5567j2H82Zs">Tiền còn lại</strong> <span class="s-W5567j2H82Zs">1.290.000 VND</span>
</li>