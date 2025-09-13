// src/lib/stores.ts
import { writable } from 'svelte/store';

export const expensesUpdated = writable(false);

export interface Expense {
  id?: number; // IndexedDB auto-incremented key
  type: 'expense' | 'income'; // Added type for expense or income
  name: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD format
  timestamp: string; // ISO string from IndexedDB
  sourceOfFunds?: string; // New field for source of funds
}

export interface FundSource {
  id?: number;
  name: string;
  balance: number;
}

export interface MonthlyExpense {
  month: string;
  total: number;
}

export const monthlyExpenses = writable<MonthlyExpense[]>([]);
export const fundSources = writable<FundSource[]>([]); // New fundSources store

export function addMonthlyExpense(newExpense: MonthlyExpense) {
  monthlyExpenses.update(currentExpenses => {
    const existingIndex = currentExpenses.findIndex(e => e.month === newExpense.month);
    if (existingIndex !== -1) {
      // Update existing month
      currentExpenses[existingIndex] = newExpense;
    } else {
      // Add new month and sort
      currentExpenses.push(newExpense);
      currentExpenses.sort((a, b) => a.month.localeCompare(b.month));
    }
    return [...currentExpenses];
  });
}

export function updateMonthlyExpense(updatedExpense: MonthlyExpense) {
  monthlyExpenses.update(currentExpenses => {
    const index = currentExpenses.findIndex(e => e.month === updatedExpense.month);
    if (index !== -1) {
      currentExpenses[index] = updatedExpense;
    }
    return [...currentExpenses];
  });
}

export function deleteMonthlyExpense(month: string) {
  monthlyExpenses.update(currentExpenses => {
    return currentExpenses.filter(e => e.month !== month);
  });
}

// Helper functions for fundSources store
export function setFundSources(newFundSources: FundSource[]) {
  fundSources.set(newFundSources);
}

export function updateFundSourceBalance(name: string, amountChange: number) {
  fundSources.update(currentSources => {
    const sourceIndex = currentSources.findIndex(s => s.name === name);
    if (sourceIndex !== -1) {
      currentSources[sourceIndex].balance += amountChange;
    }
    return [...currentSources];
  });
}