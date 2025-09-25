import localforage from 'localforage';

// Configure localforage
localforage.config({
  driver: localforage.INDEXEDDB, // Force IndexedDB; other drivers are WebSQL and localStorage
  name: 'personalFinanceApp',
  version: 1.0,
  storeName: 'keyvaluepairs', // Should be alphanumeric, not contain '_'
  description: 'Stores financial data offline'
});

export const setItem = async (key, value) => {
  try {
    await localforage.setItem(key, value);
    console.log(`Data for ${key} saved to IndexedDB.`);
  } catch (err) {
    console.error(`Error saving data for ${key} to IndexedDB:`, err);
  }
};

export const getItem = async (key) => {
  try {
    const value = await localforage.getItem(key);
    console.log(`Data for ${key} retrieved from IndexedDB.`);
    return value;
  } catch (err) {
    console.error(`Error retrieving data for ${key} from IndexedDB:`, err);
    return null;
  }
};

export const removeItem = async (key) => {
  try {
    await localforage.removeItem(key);
    console.log(`Data for ${key} removed from IndexedDB.`);
  } catch (err) {
    console.error(`Error removing data for ${key} from IndexedDB:`, err);
  }
};

export default localforage;
