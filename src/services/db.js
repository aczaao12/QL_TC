import Dexie from 'dexie';
import { ref, get, child, update } from 'firebase/database';
import { database } from './firebase';
import { v4 as uuidv4 } from 'uuid';

export class MySubClassedDexie extends Dexie {
  

  constructor() {
    super('PWAQuanLyTienDB');
    this.version(4).stores({
      giao_dich: '++id, ngay, loai, so_tien, ghichu, tai_khoan, du_an_muc_tieu',
      budgets: 'category',
    });
    this.version(7).stores({ // Existing migration for ID change
      giao_dich: 'id, ngay, loai, so_tien, ghichu, tai_khoan, du_an_muc_tieu, deleted',
      budgets: 'category',
    }).upgrade(async trans => {
      const oldGiaoDich = await trans.table('giao_dich').toArray();
      const newGiaoDich = oldGiaoDich.map((gd) => ({
        ...gd,
        id: uuidv4(),
        lastModified: Date.now(), // Add lastModified during migration
      }));
      await trans.table('giao_dich').clear();
      await trans.table('giao_dich').bulkAdd(newGiaoDich);
    });
    this.version(8).stores({ // New version for lastModified field
      giao_dich: 'id, ngay, loai, so_tien, ghichu, tai_khoan, du_an_muc_tieu, deleted, lastModified',
      budgets: 'category, lastModified',
      ai_config: 'id, lastModified', // New store
    }).upgrade(async trans => {
      // Add lastModified to existing giao_dich
      const existingGiaoDich = await trans.table('giao_dich').toArray();
      for (const gd of existingGiaoDich) {
        if (!gd.lastModified) {
          await trans.table('giao_dich').update(gd.id, { lastModified: Date.now() });
        }
      }
      // Add lastModified to existing budgets
      const existingBudgets = await trans.table('budgets').toArray();
      for (const b of existingBudgets) {
        if (!b.lastModified) {
          await trans.table('budgets').update(b.category, { lastModified: Date.now() });
        }
      }
      // Initialize default AI config if not present
      const existingAiConfig = await trans.table('ai_config').get('default');
      if (!existingAiConfig) {
        await trans.table('ai_config').add({
          id: 'default',
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
          lastModified: Date.now(),
        });
      }
    });
  }
}

export const db = new MySubClassedDexie();

// CRUD Operations for GiaoDich
export async function addGiaoDich(transaction) {
  try {
    const newTransaction = { ...transaction, id: uuidv4(), deleted: false, lastModified: Date.now() };
    return db.giao_dich.add(newTransaction);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
}

export async function getGiaoDichById(id) {
  return db.giao_dich.get(id);
}

export async function getAllGiaoDich() {
  return db.giao_dich.toArray();
}

export async function updateGiaoDich(id, changes) {
  try {
    const updatedChanges = { ...changes, lastModified: Date.now() }; // Update lastModified on change
    return db.giao_dich.update(id, updatedChanges);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
}

export async function deleteGiaoDich(id) {
  try {
    return db.giao_dich.update(id, { deleted: true, lastModified: Date.now() }); // Soft delete and update lastModified
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
}

export async function getGiaoDichByDateRange(startDate, endDate) {
  return db.giao_dich.where('ngay').between(startDate, endDate, true, true).toArray();
}

export async function getGiaoDichByType(loai) {
  return db.giao_dich.where('loai').equals(loai).toArray();
}

// CRUD Operations for Budget
export async function addBudget(budget) {
  try {
    const newBudget = { ...budget, lastModified: Date.now() }; // Add lastModified
    return db.budgets.add(newBudget);
  } catch (e) {
    console.error("Error adding budget: ", e);
    throw e;
  }
}

export async function getBudgetByCategory(category) {
  return db.budgets.get(category);
}

export async function getAllBudgets() {
  return db.budgets.toArray();
}

export async function updateBudget(category, changes) {
  try {
    const updatedChanges = { ...changes, lastModified: Date.now() }; // Update lastModified on change
    return db.budgets.update(category, updatedChanges);
  } catch (e) {
    console.error("Error updating budget: ", e);
    throw e;
  }
}

export async function deleteBudget(category) {
  return db.budgets.delete(category); // No soft delete for budgets for now
}

// CRUD Operations for AiConfig
export async function getAiConfig() {
  return db.ai_config.get('default');
}

export async function saveAiConfig(config) {
  try {
    const updatedConfig = { ...config, lastModified: Date.now() };
    return db.ai_config.put(updatedConfig); // Use put to add or update
  } catch (e) {
    console.error("Error saving AI config: ", e);
    throw e;
  }
}

// --- Realtime Database Synchronization Functions ---

/**
 * Performs a robust bidirectional sync between local IndexedDB and Firebase Realtime Database.
 * Handles additions, modifications, and deletions based on lastModified timestamps.
 * @param userId The Firebase User ID.
 */
export async function syncData(userId) {
  try {
    const localGiaoDichMap = new Map();
    const localBudgetsMap = new Map();

    // Populate local maps
    (await db.giao_dich.toArray()).forEach(gd => { if (gd.id) localGiaoDichMap.set(gd.id, gd); });
    (await db.budgets.toArray()).forEach(b => localBudgetsMap.set(b.category, b));

    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `users/${userId}`));
    const cloudData = snapshot.exists() ? snapshot.val() : {};

    const cloudGiaoDichMap = new Map();
    const cloudBudgetsMap = new Map();

    // Populate cloud maps
    if (cloudData.giao_dich) {
      Object.values(cloudData.giao_dich).forEach((gd) => {
        if (gd.id) cloudGiaoDichMap.set(gd.id, gd);
      });
    }
    if (cloudData.budgets) {
      Object.values(cloudData.budgets).forEach((b) => {
        cloudBudgetsMap.set(b.category, b);
      });
    }

    const updatesToCloud = {}; // Use null for deletions
    const updatesToLocalGiaoDich = [];
    const updatesToLocalBudgets = []; // Declared at higher scope
    const deletesFromLocalGiaoDich = [];
    const deletesFromLocalBudgets = [];

    // --- Sync GiaoDich ---
    // Process local changes to push to cloud
    for (const [id, localGd] of localGiaoDichMap.entries()) {
      const cloudGd = cloudGiaoDichMap.get(id);

      if (localGd.deleted) {
        // Local deleted, propagate to cloud
        updatesToCloud[`users/${userId}/giao_dich/${id}`] = null; // Set to null to delete in RTDB
      } else if (!cloudGd) {
        // Local new, add to cloud
        updatesToCloud[`users/${userId}/giao_dich/${id}`] = localGd;
      } else if (localGd.lastModified && cloudGd.lastModified && localGd.lastModified > cloudGd.lastModified) {
        // Local modified and newer, update cloud
        updatesToCloud[`users/${userId}/giao_dich/${id}`] = localGd;
      }
    }

    // Process cloud changes to pull to local
    for (const [id, cloudGd] of cloudGiaoDichMap.entries()) {
      const localGd = localGiaoDichMap.get(id);

      if (cloudGd.deleted) {
        // Cloud deleted, propagate to local
        deletesFromLocalGiaoDich.push(id);
        updatesToCloud[`users/${userId}/giao_dich/${id}`] = null; // Ensure it's deleted in cloud if not already
      } else if (!localGd) {
        // Cloud new, add to local
        updatesToLocalGiaoDich.push(cloudGd);
      } else if (localGd.lastModified && cloudGd.lastModified && cloudGd.lastModified > localGd.lastModified) {
        // Cloud modified and newer, update local
        updatesToLocalGiaoDich.push(cloudGd);
      }
    }

    // --- Sync Budgets ---
    // Process local changes to push to cloud
    for (const [category, localB] of localBudgetsMap.entries()) {
      const cloudB = cloudBudgetsMap.get(category);

      if (!cloudB || (localB.lastModified && cloudB.lastModified && localB.lastModified > cloudB.lastModified)) {
        // Local new or modified and newer, update cloud
        updatesToCloud[`users/${userId}/budgets/${category}`] = localB;
      }
    }

    // Process cloud changes to pull to local
    for (const [category, cloudB] of cloudBudgetsMap.entries()) {
      const localB = localBudgetsMap.get(category);

      if (!localB || (localB.lastModified && cloudB.lastModified && cloudB.lastModified > localB.lastModified)) {
        // Cloud new or modified and newer, add/update local
        updatesToLocalBudgets.push(cloudB);
      }
    }

    // --- Apply changes ---
    // Apply updates/deletions to cloud
    if (Object.keys(updatesToCloud).length > 0) {
      await update(ref(database), updatesToCloud);
    }

    // Apply deletions to local
    for (const id of deletesFromLocalGiaoDich) {
      await db.giao_dich.delete(id);
    }
    for (const category of deletesFromLocalBudgets) {
      // Assuming no soft delete for budgets, so direct delete
      await db.budgets.delete(category);
    }

    // Apply additions/updates to local
    if (updatesToLocalGiaoDich.length > 0) {
      await db.giao_dich.bulkPut(updatesToLocalGiaoDich); // bulkPut will add or update
    }
    if (updatesToLocalBudgets.length > 0) {
      await db.budgets.bulkPut(updatesToLocalBudgets); // bulkPut will add or update
    }

    console.log('Robust bidirectional sync completed successfully!');
  } catch (error) {
    console.error('Error during robust bidirectional sync:', error);
    throw error;
  }
}
