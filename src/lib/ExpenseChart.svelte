<script lang="ts">
  import { onMount } from 'svelte';
  import { getExpenses } from './indexedDb';
  import { expensesUpdated } from './stores';
  import { scaleBand, scaleLinear } from 'd3-scale';
  import { max } from 'd3-array';

  interface Expense {
    id?: number;
    amount: number;
    category: string;
    date: string;
    timestamp: string;
  }

  interface MonthlyExpense {
    month: string;
    total: number;
  }

  let monthlyExpenses: MonthlyExpense[] = [];
  let loading = true;
  let error: string | null = null;

  let width: number;
  let height: number;

  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  $: innerWidth = width - margin.left - margin.right;
  $: innerHeight = height - margin.top - margin.bottom;

  $: xScale = scaleBand()
    .range([0, innerWidth])
    .padding(0.1)
    .domain(monthlyExpenses.map(d => d.month));

  $: yScale = scaleLinear()
    .range([innerHeight, 0])
    .domain([0, max(monthlyExpenses, d => d.total) || 0]);

  onMount(async () => {
    await processAndFetchExpenses();
  });

  expensesUpdated.subscribe(async (updated) => {
    if (updated) {
      await processAndFetchExpenses();
      expensesUpdated.set(false);
    }
  });

  async function processAndFetchExpenses() {
    loading = true;
    error = null;
    try {
      const allExpenses: Expense[] = await getExpenses();
      const monthlyData: { [key: string]: number } = {};

      allExpenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const monthYear = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + expense.amount;
      });

      monthlyExpenses = Object.keys(monthlyData)
        .sort()
        .map(month => ({ month, total: monthlyData[month] }));

      console.log('Processed monthly expenses:', monthlyExpenses);
    } catch (e: any) {
      error = 'Failed to load chart data: ' + e.message;
      console.error('Error processing expenses for chart:', e);
    } finally {
      loading = false;
    }
  }
</script>

<div class="container mt-4">
  <h3 class="mb-3 text-center">Monthly Spending</h3>

  {#if loading}
    <p class="text-center">Loading chart...</p>
  {:else if error}
    <div class="alert alert-danger text-center" role="alert">
      {error}
    </div>
  {:else if monthlyExpenses.length === 0}
    <div class="alert alert-info text-center" role="alert">
      No spending data to display.
    </div>
  {:else}
    <div class="chart-container" bind:clientWidth={width} bind:clientHeight={height}>
      <svg width={width} height={height}>
        <g transform="translate({margin.left}, {margin.top})">
          {#each monthlyExpenses as d}
            <rect
              x={xScale(d.month)}
              y={yScale(d.total)}
              width={xScale.bandwidth()}
              height={innerHeight - yScale(d.total)}
              fill="steelblue"
            />
          {/each}
          <!-- X-axis -->
          <g transform="translate(0, {innerHeight})">
            {#each monthlyExpenses as d}
              <text x={xScale(d.month)! + xScale.bandwidth() / 2} y="9" text-anchor="middle" font-size="10px">
                {d.month}
              </text>
            {/each}
          </g>
          <!-- Y-axis -->
          <g>
            {#each yScale.ticks(5) as tick}
              <line x1="0" x2={innerWidth} y1={yScale(tick)} y2={yScale(tick)} stroke="#ccc" stroke-dasharray="2,2" />
              <text x="-5" y={yScale(tick)} dy="0.32em" text-anchor="end" font-size="10px">
                {tick}
              </text>
            {/each}
          </g>
        </g>
      </svg>
    </div>
  {/if}
</div>

<style>
  .chart-container {
    width: 100%;
    height: 300px; /* Fixed height for the chart */
    border: 1px solid #ccc;
    box-sizing: border-box;
  }
</style>