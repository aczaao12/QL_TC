<script lang="ts">
  import { onMount } from 'svelte';
  import { getExpenses, deleteExpense, updateExpense } from './indexedDb';
  import { expensesUpdated, type Expense, fundSources } from './stores'; // Import the store and Expense interface
  import { slide } from 'svelte/transition'; // Import slide for animations
  import ExpenseEditModal from './ExpenseEditModal.svelte';

  let expenses: Expense[] = [];
  let loading = true;
  let error: string | null = null;
  let expandedDays: Record<string, boolean> = {}; // State to manage collapse for each day
  let editingExpense: Expense | null = null;
  let showEditModal: boolean = false;

  function handleEdit(expense: Expense) {
    editingExpense = { ...expense }; // Create a copy to avoid direct mutation
    showEditModal = true;
  }

  function handleEditClose() {
    showEditModal = false;
    editingExpense = null;
  }

  async function handleEditSave(event: CustomEvent) {
    const updatedExpense = event.detail;
    if (updatedExpense.id === undefined) return;

    try {
      await updateExpense(updatedExpense); // Pass the entire updatedExpense object
      expensesUpdated.set(true); // Trigger update
      await fetchExpenses(); // Refresh the list
      handleEditClose();
    } catch (e: any) {
      error = 'Failed to update expense: ' + e.message;
      console.error('Error updating expense:', e);
    }
  }

  onMount(async () => {
    await fetchExpenses();
  });

  // Subscribe to the expensesUpdated store
  expensesUpdated.subscribe(async (updated) => {
    if (updated) {
      await fetchExpenses();
      expensesUpdated.set(false); // Reset the store after updating
    }
  });

  async function fetchExpenses() {
    loading = true;
    error = null;
    try {
      expenses = await getExpenses();
      // Sort expenses by date in descending order, then by timestamp
      expenses.sort((a, b) => {
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison === 0) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return dateComparison;
      });
      // Initialize all days as expanded
      expenses.forEach(expense => {
        if (expandedDays[expense.date] === undefined) {
          expandedDays[expense.date] = true;
        }
      });
      // Trigger reactivity for expandedDays
      expandedDays = { ...expandedDays };
      console.log('Fetched expenses:', expenses);
    } catch (e: any) {
      error = 'Failed to load expenses: ' + e.message;
      console.error('Error fetching expenses:', e);
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: number | undefined) {
    if (id === undefined) return;
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(id);
        expensesUpdated.set(true); // Trigger update in other components
        await fetchExpenses(); // Refresh the list
      } catch (e: any) {
        error = 'Failed to delete expense: ' + e.message;
        console.error('Error deleting expense:', e);
      }
    }
  }

  function toggleDay(date: string) {
    expandedDays = { ...expandedDays, [date]: !expandedDays[date] };
  }

  function groupByDate(items: Expense[]) {
    return items.reduce((acc, item) => {
      const date = item.date; // Assuming item.date is already in 'YYYY-MM-DD' format
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {} as Record<string, Expense[]>);
  }

  function getCategoryClass(category: string, amount?: number) {
    if (amount && amount > 1000000) return 'bg-danger';
    switch (category) {
      case 'Ăn uống': return 'bg-success';
      case 'Đi lại': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }

  // Helper functions for date calculations
  function getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const startOfWeek = new Date(d.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0); // Set to start of day
    return startOfWeek;
  }

  function getEndOfWeek(date: Date) {
    const d = new Date(getStartOfWeek(date));
    const endOfWeek = new Date(d.setDate(d.getDate() + 6));
    endOfWeek.setHours(23, 59, 59, 999); // Set to end of day
    return endOfWeek;
  }

  function getStartOfMonth(date: Date) {
    const d = new Date(date);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0); // Set to start of day
    return startOfMonth;
  }

  function getEndOfMonth(date: Date) {
    const d = new Date(date);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999); // Set to end of day
    return endOfMonth;
  }

  function formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function filterExpensesByDateRange(startDate: Date, endDate: Date) {
    const start = formatDateToYYYYMMDD(startDate);
    const end = formatDateToYYYYMMDD(endDate);
    return expenses.filter(e => e.date >= start && e.date <= end);
  }

  $: todayDateString = formatDateToYYYYMMDD(new Date());
  $: todayExpenses = expenses.filter(e => e.date === todayDateString);

  $: startOfWeek = getStartOfWeek(new Date());
  $: endOfWeek = getEndOfWeek(new Date());
  $: thisWeekExpenses = filterExpensesByDateRange(startOfWeek, endOfWeek);

  $: startOfMonth = getStartOfMonth(new Date());
  $: endOfMonth = getEndOfMonth(new Date());
  $: thisMonthExpenses = filterExpensesByDateRange(startOfMonth, endOfMonth);

  $: groupedExpensesByDate = groupByDate(expenses);

  function groupByCategory(dailyExpenses: Expense[]) {
    return dailyExpenses.reduce((acc, e) => {
      if (!acc[e.category]) acc[e.category] = { amount: 0, expenses: [] };
      acc[e.category].amount += e.amount;
      acc[e.category].expenses.push(e);
      return acc;
    }, {} as Record<string, { amount: number; expenses: Expense[] }>);
  }

  $: totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  $: totalBalance = $fundSources.reduce((sum, source) => sum + source.balance, 0);
  $: remainingBalance = totalBalance - totalExpenses;
</script>

<div class="container mt-4">
  <h3 class="mb-3 text-center">Your Expenses</h3>

  <div class="row text-center mb-3">
    <div class="col">
      <div class="card p-2">
        <strong>Hôm nay</strong>
        <div>{todayExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} VND</div>
      </div>
    </div>
    <div class="col">
      <div class="card p-2">
        <strong>Tuần này</strong>
        <div>{thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} VND</div>
      </div>
    </div>
    <div class="col">
      <div class="card p-2">
        <strong>Tháng này</strong>
        <div>{thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} VND</div>
      </div>
    </div>
  </div>

  {#if loading}
    <p class="text-center">Loading expenses...</p>
  {:else if error}
    <div class="alert alert-danger text-center" role="alert">
      {error}
    </div>
  {:else if expenses.length === 0}
    <div class="alert alert-info text-center" role="alert">
      No expenses recorded yet.
    </div>
  {:else}
    <div style="overflow-y: auto; max-height: 60vh;">
      {#each Object.entries(groupedExpensesByDate) as [date, dailyExpenses] (date)}
        <button type="button" class="btn btn-link text-start w-100 mt-3 daily-toggle-button" on:click={() => toggleDay(date)}>
          <h5 class="mb-0">
            {new Date(date).toLocaleDateString()}
            <small class="text-muted ms-2">
              Tổng: {dailyExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} VND
            </small>
          </h5>
        </button>
        {#if expandedDays[date]}
          <ul class="list-group mb-2 list-group-item-light" transition:slide>
          {#each Object.entries(groupByCategory(dailyExpenses)) as [category, data] (category)}
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{category}</strong>
                {#each data.expenses as expense (expense.id)}
                  <div class="d-flex align-items-center mt-1">
                    <span class="badge {getCategoryClass(expense.category, expense.amount)} rounded-pill me-2">
                      {expense.amount.toLocaleString()} VND
                    </span>
                    <button class="btn btn-sm btn-outline-primary me-1" on:click={() => handleEdit(expense)}>Edit</button>
                    <button class="btn btn-sm btn-outline-danger" on:click={() => handleDelete(expense.id)}>Delete</button>
                  </div>
                {/each}
              </div>
              <span class="badge {getCategoryClass(category, data.amount)} rounded-pill fw-bold fs-6">
                {data.amount.toLocaleString()} VND
              </span>
            </li>
          {/each}
        </ul>
        {/if}
      {/each}
    </div>

    <ul class="list-group mt-3">
      <li class="list-group-item d-flex justify-content-between align-items-center list-group-item-primary fw-bold fs-5">
        <strong>Tổng cộng</strong>
        <span>{totalExpenses.toLocaleString()} VND</span>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center list-group-item-info fw-bold fs-5">
        <strong>Tiền còn lại</strong>
        <span>{remainingBalance.toLocaleString()} VND</span>
      </li>
    </ul>
  {/if}
</div>

{#if showEditModal && editingExpense}
  <ExpenseEditModal
    expense={editingExpense}
    on:save={handleEditSave}
    on:close={handleEditClose}
  />
{/if}

<style>
  .badge {
    padding: 0.6em 1em;
    font-size: 0.9em;
    min-width: 80px;
    text-align: center;
  }

  .list-group.mb-2 {
    background-color: #f9fafb; /* nhẹ, không lấn át */
    border-radius: 8px;
    padding: 4px;
  }

  .card.p-2 {
    border-radius: 10px;
    background: #f8f9fa;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  }
  .card.p-2 strong {
    display: block;
    color: #007bff;
  }

  .daily-toggle-button {
    text-decoration: none;
    color: inherit;
    /* Add hover/focus styles if needed */
  }
  .daily-toggle-button:hover,
  .daily-toggle-button:focus {
    text-decoration: none;
    color: inherit;
    box-shadow: none;
  }
</style>