// src/lib/indexedDb.ts

const DB_NAME = 'expenseTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'expenses';

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
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

export async function addExpense(expense: { type: 'expense' | 'income'; name: string; category: string; amount: number; date: string }): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({ ...expense, timestamp: new Date().toISOString() });

    request.onsuccess = () => {
      console.log('Expense added to IndexedDB');
      resolve();
    };

    request.onerror = (event) => {
      console.error('Error adding expense to IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function getExpenses(): Promise<any[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
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

export async function clearAndAddExpenses(expenses: any[]): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

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