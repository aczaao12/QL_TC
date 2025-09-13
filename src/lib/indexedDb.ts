// src/lib/indexedDb.ts
import type { Expense, FundSource } from './stores';
import { setFundSources } from './stores'; // Import setFundSources

const DB_NAME = 'expenseTrackerDB';
const DB_VERSION = 2;
const EXPENSE_STORE_NAME = 'expenses';
const FUND_SOURCE_STORE_NAME = 'fundSources';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase>;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(EXPENSE_STORE_NAME)) {
        db.createObjectStore(EXPENSE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(FUND_SOURCE_STORE_NAME)) {
        db.createObjectStore(FUND_SOURCE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      console.log('IndexedDB opened successfully');
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
  return dbPromise;
}

async function getDb(): Promise<IDBDatabase> {
  if (!dbInstance) {
    await openDatabase();
  }
  return dbInstance!;
}

export async function addExpense(expense: Omit<Expense, 'id' | 'timestamp'>): Promise<void> {
  const db = await getDb();
  return new Promise(async (resolve, reject) => { // Added async here
    const transaction = db.transaction([EXPENSE_STORE_NAME, FUND_SOURCE_STORE_NAME], 'readwrite'); // Added FUND_SOURCE_STORE_NAME
    const expenseStore = transaction.objectStore(EXPENSE_STORE_NAME);
    const fundSourceStore = transaction.objectStore(FUND_SOURCE_STORE_NAME);

    const newExpense = { ...expense, id: Date.now(), timestamp: new Date().toISOString() };
    const request = expenseStore.add(newExpense);

    request.onsuccess = async () => {
      console.log('Expense added to IndexedDB');

      // Update fund source balance
      if (newExpense.sourceOfFunds) {
        const currentFundSources = await getFundSources(); // Fetch all fund sources
        const sourceToUpdate = currentFundSources.find(fs => fs.name === newExpense.sourceOfFunds);

        if (sourceToUpdate) {
          if (newExpense.type === 'expense') {
            sourceToUpdate.balance -= newExpense.amount;
          } else if (newExpense.type === 'income') {
            sourceToUpdate.balance += newExpense.amount;
          }
          const updateRequest = fundSourceStore.put(sourceToUpdate);
          updateRequest.onsuccess = async () => { // Added async here
            console.log(`Fund source ${sourceToUpdate.name} balance updated.`);
            setFundSources(await getFundSources()); // Update the Svelte store
            resolve();
          };
          updateRequest.onerror = (event) => {
            console.error('Error updating fund source balance:', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
          };
        } else {
          console.warn(`Fund source ${newExpense.sourceOfFunds} not found.`);
          resolve(); // Resolve even if fund source not found, expense is still added
        }
      } else {
        resolve();
      }
    };

    request.onerror = (event) => {
      console.error('Error adding expense to IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function updateExpense(updatedExpense: Expense): Promise<void> {
  const db = await getDb();
  return new Promise(async (resolve, reject) => { // Added async here
    const transaction = db.transaction([EXPENSE_STORE_NAME, FUND_SOURCE_STORE_NAME], 'readwrite'); // Added FUND_SOURCE_STORE_NAME
    const expenseStore = transaction.objectStore(EXPENSE_STORE_NAME);
    const fundSourceStore = transaction.objectStore(FUND_SOURCE_STORE_NAME);

    // Get the old expense to revert its impact on fund source
    const getOldExpenseRequest = expenseStore.get(updatedExpense.id!);
    getOldExpenseRequest.onsuccess = async (event) => {
      const oldExpense: Expense = (event.target as IDBRequest).result;

      if (oldExpense) {
        // Revert old expense's impact
        if (oldExpense.sourceOfFunds) {
          const fundSources = await getFundSources();
          const oldSource = fundSources.find(fs => fs.name === oldExpense.sourceOfFunds);
          if (oldSource) {
            if (oldExpense.type === 'expense') {
              oldSource.balance += oldExpense.amount; // Add back the old expense amount
            } else if (oldExpense.type === 'income') {
              oldSource.balance -= oldExpense.amount; // Subtract back the old income amount
            }
            await updateFundSource(oldSource); // Update the fund source
          }
        }
      }

      // Apply new expense's impact and update the expense itself
      const putRequest = expenseStore.put({ ...updatedExpense, timestamp: new Date().toISOString() });
      putRequest.onsuccess = async () => {
        console.log('Expense updated in IndexedDB');

        if (updatedExpense.sourceOfFunds) {
          const currentFundSources = await getFundSources();
          const newSource = currentFundSources.find(fs => fs.name === updatedExpense.sourceOfFunds);
          if (newSource) {
            if (updatedExpense.type === 'expense') {
              newSource.balance -= updatedExpense.amount;
            } else if (updatedExpense.type === 'income') {
              newSource.balance += updatedExpense.amount;
            }
            await updateFundSource(newSource); // Update the fund source in IndexedDB
            setFundSources(await getFundSources()); // Update the Svelte store
          }
        }
        resolve();
      };

      putRequest.onerror = (event) => {
        console.error('Error updating expense in IndexedDB:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    };

    getOldExpenseRequest.onerror = (event) => {
      console.error('Error getting old expense for update:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();
  return new Promise(async (resolve, reject) => { // Added async here
    const transaction = db.transaction([EXPENSE_STORE_NAME, FUND_SOURCE_STORE_NAME], 'readwrite'); // Added FUND_SOURCE_STORE_NAME
    const expenseStore = transaction.objectStore(EXPENSE_STORE_NAME);
    const fundSourceStore = transaction.objectStore(FUND_SOURCE_STORE_NAME);

    // Get the expense to be deleted to revert its impact on fund source
    const getRequest = expenseStore.get(id);
    getRequest.onsuccess = async (event) => {
      const expenseToDelete: Expense = (event.target as IDBRequest).result;

      const deleteRequest = expenseStore.delete(id);
      deleteRequest.onsuccess = async () => {
        console.log('Expense deleted from IndexedDB');

        if (expenseToDelete && expenseToDelete.sourceOfFunds) {
          const fundSources = await getFundSources();
          const sourceToUpdate = fundSources.find(fs => fs.name === expenseToDelete.sourceOfFunds);

          if (sourceToUpdate) {
            if (expenseToDelete.type === 'expense') {
              sourceToUpdate.balance += expenseToDelete.amount; // Add back the expense amount
            } else if (expenseToDelete.type === 'income') {
              sourceToUpdate.balance -= expenseToDelete.amount; // Subtract back the income amount
            }
            const updateRequest = fundSourceStore.put(sourceToUpdate);
            updateRequest.onsuccess = async () => { // Added async here
              console.log(`Fund source ${sourceToUpdate.name} balance reverted.`);
              setFundSources(await getFundSources()); // Update the Svelte store
              resolve();
            };
            updateRequest.onerror = (event) => {
              console.error('Error reverting fund source balance:', (event.target as IDBRequest).error);
              reject((event.target as IDBRequest).error);
            };
          } else {
            console.warn(`Fund source ${expenseToDelete.sourceOfFunds} not found during delete.`);
            resolve(); // Resolve even if fund source not found
          }
        } else {
          resolve();
        }
      };

      deleteRequest.onerror = (event) => {
        console.error('Error deleting expense from IndexedDB:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    };

    getRequest.onerror = (event) => {
      console.error('Error getting expense for deletion:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function getExpenses(): Promise<Expense[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EXPENSE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(EXPENSE_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      console.log('Expenses retrieved from IndexedDB');
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('Error retrieving expenses from IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function clearAndAddExpenses(expenses: Expense[]): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EXPENSE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(EXPENSE_STORE_NAME);

    // Clear existing data
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      // Add new data
      let addCount = 0;
      if (expenses.length === 0) {
        resolve();
        return;
      }
      expenses.forEach((expense) => {
        const addRequest = store.add(expense);
        addRequest.onsuccess = () => {
          addCount++;
          if (addCount === expenses.length) {
            console.log('IndexedDB cleared and new expenses added.');
            resolve();
          }
        };
        addRequest.onerror = (event) => {
          console.error('Error adding expense during clear and add:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };
      });
    };
    clearRequest.onerror = (event) => {
      console.error('Error clearing IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function addFundSource(fundSource: Omit<FundSource, 'id'>): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FUND_SOURCE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(FUND_SOURCE_STORE_NAME);
    const request = store.add({ ...fundSource, id: Date.now() });

    request.onsuccess = async () => {
      console.log('Fund source added to IndexedDB');
      setFundSources(await getFundSources()); // Update the Svelte store
      resolve();
    };

    request.onerror = (event) => {
      console.error('Error adding fund source to IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function getFundSources(): Promise<FundSource[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FUND_SOURCE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(FUND_SOURCE_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      console.log('Fund sources retrieved from IndexedDB');
      setFundSources(request.result); // Set the Svelte store
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('Error retrieving fund sources from IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function updateFundSource(fundSource: FundSource): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FUND_SOURCE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(FUND_SOURCE_STORE_NAME);
    const request = store.put(fundSource);

    request.onsuccess = async () => {
      console.log('Fund source updated in IndexedDB');
      setFundSources(await getFundSources()); // Update the Svelte store
      resolve();
    };

    request.onerror = (event) => {
      console.error('Error updating fund source in IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function deleteFundSource(id: number): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FUND_SOURCE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(FUND_SOURCE_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = async () => {
      console.log('Fund source deleted from IndexedDB');
      setFundSources(await getFundSources()); // Update the Svelte store
      resolve();
    };

    request.onerror = (event) => {
      console.error('Error deleting fund source from IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}