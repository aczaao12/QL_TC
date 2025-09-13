<script lang="ts">
  import { onMount } from 'svelte';
  import { getExpenses } from './indexedDb';
  import { expensesUpdated } from './stores';
  import { scaleBand, scaleLinear } from 'd3-scale';
  import { max } from 'd3-array';
  import { select } from 'd3-selection';
  import { transition } from 'd3-transition';

  import { monthlyExpenses, type MonthlyExpense, type Expense } from './stores';

  let loading = true;
  let error: string | null = null;

  let width: number;
  let height: number;

  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  $: innerWidth = width - margin.left - margin.right;
  $: innerHeight = height - margin.top - margin.bottom;

  let showTooltip: boolean = false;
  let tooltipX: number = 0;
  let tooltipY: number = 0;
  let tooltipContent: string = '';

  function handleMouseEnter(event: MouseEvent, d: MonthlyExpense) {
    showTooltip = true;
    tooltipX = event.clientX;
    tooltipY = event.clientY;
    tooltipContent = `${d.month}: ${d.total.toLocaleString('vi-VN')} VND`;
  }

  function handleMouseLeave() {
    showTooltip = false;
  }

  let svgEl: SVGSVGElement;

  function renderBars() {
    if (!svgEl || !monthlyExpenses.length || innerWidth <= 0 || innerHeight <= 0) return;

    const t = transition().duration(750);

    const xScale = scaleBand<string>()
      .range([0, innerWidth])
      .padding(0.1)
      .domain($monthlyExpenses.map((d: MonthlyExpense) => d.month));

    const yScale = scaleLinear<number, number>()
      .range([innerHeight, 0])
      .domain([0, Math.max(max($monthlyExpenses, (d: MonthlyExpense) => d.total) || 0, 100)]);

    const svg = select(svgEl);
    const barsGroup = svg.select('g.bars');

    // Update X-axis labels
    const xAxisLabels = svg.select('g.x-axis')
      .attr("transform", `translate(0, ${innerHeight})`)
      .selectAll<SVGTextElement, MonthlyExpense>('text')
      .data($monthlyExpenses, (d: MonthlyExpense) => d.month);

    xAxisLabels.enter()
      .append('text')
      .attr('x', (d: MonthlyExpense) => xScale(d.month)! + xScale.bandwidth() / 2)
      .attr('y', 9)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('class', 'axis-label')
      .text((d: MonthlyExpense) => d.month);

    xAxisLabels.transition(t)
      .attr('x', (d: MonthlyExpense) => xScale(d.month)! + xScale.bandwidth() / 2)
      .text((d: MonthlyExpense) => d.month);

    xAxisLabels.exit().remove();

    // Update Y-axis ticks and labels
    const yAxisGroup = svg.select('g.y-axis');
    const ticks = yScale.ticks(5);

    const gridLines = yAxisGroup.selectAll<SVGLineElement, number>('line.grid-line')
      .data(ticks);

    gridLines.enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d: number) => yScale(d))
      .attr('y2', (d: number) => yScale(d))
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-dasharray', '2,2');

    gridLines.transition(t)
      .attr('y1', (d: number) => yScale(d))
      .attr('y2', (d: number) => yScale(d))
      .attr('x2', innerWidth);

    gridLines.exit().remove();

    const yAxisLabels = yAxisGroup.selectAll<SVGTextElement, number>('text.axis-label')
      .data(ticks);

    yAxisLabels.enter()
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', -5)
      .attr('y', (d: number) => yScale(d))
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .text((tick: number) => `${tick.toLocaleString('vi-VN')} VND`);

    yAxisLabels.transition(t)
      .attr('y', (d: number) => yScale(d))
      .text((tick: number) => `${tick.toLocaleString('vi-VN')} VND`);

    yAxisLabels.exit().remove();

    // Bar rendering
    const bars = barsGroup.selectAll<SVGRectElement, MonthlyExpense>('rect')
      .data($monthlyExpenses, (d: MonthlyExpense) => d.month);

    // bar enter
    bars.enter()
      .append('rect')
      .attr('x', (d: MonthlyExpense) => xScale(d.month)!)
      .attr('y', innerHeight)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', 'url(#barGradient)')
      .attr('role', 'graphics-document')
      .attr('aria-label', (d: MonthlyExpense) => `${d.month}: ${d.total.toLocaleString('vi-VN')} VND`)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event: MouseEvent, d: MonthlyExpense) { handleMouseEnter(event, d); })
      .on('mouseleave', handleMouseLeave)
      .transition(t)
        .attr('y', (d: MonthlyExpense) => yScale(d.total))
        .attr('height', (d: MonthlyExpense) => innerHeight - yScale(d.total));

    // bar update
    bars.transition(t)
      .attr('x', (d: MonthlyExpense) => xScale(d.month)!)
      .attr('y', (d: MonthlyExpense) => yScale(d.total))
      .attr('height', (d: MonthlyExpense) => innerHeight - yScale(d.total))
      .attr('width', xScale.bandwidth());

    // bar exit
    bars.exit()
      .transition(t)
        .attr('y', innerHeight)
        .attr('height', 0)
        .remove();
  }

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
        const monthYear = `${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}/${expenseDate.getFullYear()}`;
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + expense.amount;
      });

      const newMonthlyExpenses = Object.keys(monthlyData)
        .sort()
        .map(month => ({ month, total: monthlyData[month] }));

      monthlyExpenses.set(newMonthlyExpenses);
      console.log('Processed monthly expenses:', newMonthlyExpenses);
    } catch (e: any) {
      error = 'Failed to load chart data: ' + e.message;
      console.error('Error processing expenses for chart:', e);
    } finally {
      loading = false;
    }
  }

  $: if (!loading && $monthlyExpenses.length && svgEl && innerWidth > 0 && innerHeight > 0) {
    renderBars();
  }

  // Re-render bars if dimensions change
  $: if (svgEl && (width || height)) {
    renderBars();
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
      <svg bind:this={svgEl} width={width} height={height}>
        <defs>
          <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#4facfe" />
            <stop offset="100%" stop-color="#00f2fe" />
          </linearGradient>
        </defs>
        <g transform="translate({margin.left}, {margin.top})">
          <g class="bars"></g>
          <g class="x-axis"></g>
          <g class="y-axis"></g>
        </g>
      </svg>
    </div>

    {#if showTooltip}
      <div
        class="tooltip"
        style="left: {tooltipX + 10}px; top: {tooltipY + 10}px;"
      >
        {tooltipContent}
      </div>
    {/if}
  {/if}
</div>

<style>
  .chart-container {
    width: 100%;
    height: 300px; /* Fixed height for the chart */
    border: 1px solid #ccc;
    box-sizing: border-box;
  }

  .tooltip {
    position: fixed;
    background-color: #2d2d3d; /* Darker background for card effect */
    color: white;
    padding: 8px 12px; /* More padding */
    border-radius: 6px; /* Slightly larger radius */
    font-size: 13px;
    pointer-events: none; /* So it doesn't interfere with mouse events on the chart */
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); /* Shadow for card effect */
    border: 1px solid rgba(255, 255, 255, 0.1); /* Subtle border */
  }
</style>