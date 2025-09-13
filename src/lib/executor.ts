// src/lib/executor.ts
import { database } from './firebase';
import { ref, push, set, get, remove, child } from 'firebase/database';
import { addExpense, updateExpense, deleteExpense, getExpenses } from './indexedDb';

interface Filter {
  field: string;
  operator: "==" | ">" | "<" | "between";
  value: any;
}

interface AIAction {
  action: "create" | "read" | "update" | "delete" | "analyze" | "aggregate" | "error";
  collection: string;
  filter?: Filter;
  data?: any | any[]; // data can be a single object or an array of objects
  id?: number; // For update/delete, now using IndexedDB's numeric ID
  message?: string; // For error actions
  uid?: string; // User ID for RTDB
  aggregate?: {
    operation: "sum" | "avg" | "max" | "min" | "count";
    field: string;
  };
}

export async function executeAIAction(action: AIAction): Promise<any> {
  if (action.action === "error") {
    return { success: false, message: action.message };
  }

  if (!action.uid) {
    return { success: false, message: "User not authenticated for this action." };
  }

  const userExpensesRef = ref(database, `users/${action.uid}/expenses`);

  switch (action.action) {
    case "create":
      if (action.data) {
        const items = Array.isArray(action.data) ? action.data : [action.data];
        let createdCount = 0;
        for (const item of items) {
          const newExpense = { ...item, id: Date.now() + createdCount }; // Ensure unique ID for each item
          await addExpense(newExpense);

          const newPostRef = push(userExpensesRef);
          await set(newPostRef, newExpense);
          createdCount++;
        }
        return { success: true, message: `Đã thêm ${createdCount} giao dịch.`, count: createdCount };
      }
      return { success: false, message: "No data provided for creation." };

    case "read":
      // Read from IndexedDB
      const localExpenses = await getExpenses();
      let filteredExpenses = localExpenses;

      if (action.filter) {
        // Basic filtering for now
        filteredExpenses = localExpenses.filter(expense => {
          if (action.filter && expense[action.filter.field] !== undefined) {
            switch (action.filter.operator) {
              case "==": return expense[action.filter.field] == action.filter.value;
              case ">": return expense[action.filter.field] > action.filter.value;
              case "<": return expense[action.filter.field] < action.filter.value;
              // "between" would require more complex logic
              default: return false;
            }
          }
          return false;
        });
      }
      return { success: true, message: "Data retrieved successfully from IndexedDB", data: filteredExpenses };

    case "update":
      if (action.id && action.data) {
        // Update in IndexedDB first
        await updateExpense({ ...action.data, id: action.id });

        // Then update in Realtime Database
        const snapshot = await get(userExpensesRef);
        if (snapshot.exists()) {
          const expenses = snapshot.val();
          let rtdbKeyToUpdate: string | null = null;
          for (const key in expenses) {
            if (expenses[key].id === action.id) {
              rtdbKeyToUpdate = key;
              break;
            }
          }
          if (rtdbKeyToUpdate) {
            const expenseToUpdateRef = child(userExpensesRef, rtdbKeyToUpdate);
            await set(expenseToUpdateRef, { ...action.data, id: action.id });
            return { success: true, message: "Expense updated successfully (IndexedDB & RTDB)", id: action.id };
          }
        }
        return { success: false, message: "Expense not found in RTDB for update." };
      }
      return { success: false, message: "ID and data required for update." };

    case "delete":
      if (action.id) {
        // Delete from IndexedDB first
        await deleteExpense(action.id);

        // Then delete from Realtime Database
        const snapshot = await get(userExpensesRef);
        if (snapshot.exists()) {
          const expenses = snapshot.val();
          let rtdbKeyToDelete: string | null = null;
          for (const key in expenses) {
            if (expenses[key].id === action.id) {
              rtdbKeyToDelete = key;
              break;
            }
          }
          if (rtdbKeyToDelete) {
            const expenseToDeleteRef = child(userExpensesRef, rtdbKeyToDelete);
            await remove(expenseToDeleteRef);
            return { success: true, message: "Expense deleted successfully (IndexedDB & RTDB)", id: action.id };
          }
        }
        return { success: false, message: "Expense not found in RTDB for deletion." };
      }
      return { success: false, message: "ID required for deletion." };

    case "analyze":
      // For analyze, we'll read data from IndexedDB
      const allLocalDataForAnalyze = await getExpenses();
      return { success: true, message: "Data fetched for analysis from IndexedDB", data: allLocalDataForAnalyze };

    case "aggregate":
      if (!action.aggregate) {
        return { success: false, message: "Aggregation operation not specified." };
      }

      let expensesToAggregate = await getExpenses();

      if (action.filter) {
        expensesToAggregate = expensesToAggregate.filter(expense => {
          if (action.filter && expense[action.filter.field] !== undefined) {
            switch (action.filter.operator) {
              case "==": return expense[action.filter.field] == action.filter.value;
              case ">": return expense[action.filter.field] > action.filter.value;
              case "<": return expense[action.filter.field] < action.filter.value;
              default: return false;
            }
          }
          return false;
        });
      }

      let result: any;
      const field = action.aggregate.field;

      switch (action.aggregate.operation) {
        case "sum":
          result = expensesToAggregate.reduce((acc, expense) => acc + (expense[field] || 0), 0);
          break;
        case "avg":
          const sum = expensesToAggregate.reduce((acc, expense) => acc + (expense[field] || 0), 0);
          result = expensesToAggregate.length > 0 ? sum / expensesToAggregate.length : 0;
          break;
        case "max":
          result = Math.max(...expensesToAggregate.map(expense => expense[field] || 0));
          break;
        case "min":
          result = Math.min(...expensesToAggregate.map(expense => expense[field] || 0));
          break;
        case "count":
          result = expensesToAggregate.length;
          break;
        default:
          return { success: false, message: "Unknown aggregation operation." };
      }
      return { success: true, message: `Aggregation successful: ${action.aggregate.operation} of ${field}`, result: result };

    default:
      return { success: false, message: "Unknown action." };
  }
}