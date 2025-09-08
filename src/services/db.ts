import Dexie, { Table } from 'dexie';
import { ref, get, child, update } from 'firebase/database';
import { database } from './firebase';
import { v4 as uuidv4 } from 'uuid';

export interface GiaoDich {
  id?: string;
  ngay: string; // YYYY-MM-DD
  loai: string; // e.g., 'ăn uống', 'đi lại', 'lương'
  so_tien: number;
  ghichu?: string;
  tai_khoan?: string;
  du_an_muc_tieu?: string;
  deleted?: boolean;
  lastModified?: number; // Added for robust sync
}

export interface Budget {
  category: string;
  amount: number;
  lastModified?: number; // Added for robust sync
}

export class MySubClassedDexie extends Dexie {
  giao_dich!: Table<GiaoDich>;
  budgets!: Table<Budget>;

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
      const newGiaoDich: GiaoDich[] = oldGiaoDich.map((gd: GiaoDich) => ({
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
    });
  }
}

export const db = new MySubClassedDexie();

// CRUD Operations for GiaoDich
export async function addGiaoDich(transaction: Omit<GiaoDich, 'id' | 'lastModified'>) {
  try {
    const newTransaction: GiaoDich = { ...transaction, id: uuidv4(), deleted: false, lastModified: Date.now() };
    return db.giao_dich.add(newTransaction);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
}

export async function getGiaoDichById(id: string) {
  return db.giao_dich.get(id);
}

export async function getAllGiaoDich() {
  return db.giao_dich.toArray();
}

export async function updateGiaoDich(id: string, changes: Partial<GiaoDich>) {
  try {
    const updatedChanges = { ...changes, lastModified: Date.now() }; // Update lastModified on change
    return db.giao_dich.update(id, updatedChanges);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
}

export async function deleteGiaoDich(id: string) {
  try {
    return db.giao_dich.update(id, { deleted: true, lastModified: Date.now() }); // Soft delete and update lastModified
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
}

export async function getGiaoDichByDateRange(startDate: string, endDate: string) {
  return db.giao_dich.where('ngay').between(startDate, endDate, true, true).toArray();
}

export async function getGiaoDichByType(loai: string) {
  return db.giao_dich.where('loai').equals(loai).toArray();
}

// CRUD Operations for Budget
export async function addBudget(budget: Omit<Budget, 'lastModified'>) {
  try {
    const newBudget: Budget = { ...budget, lastModified: Date.now() }; // Add lastModified
    return db.budgets.add(newBudget);
  } catch (e) {
    console.error("Error adding budget: ", e);
    throw e;
  }
}

export async function getBudgetByCategory(category: string) {
  return db.budgets.get(category);
}

export async function getAllBudgets() {
  return db.budgets.toArray();
}

export async function updateBudget(category: string, changes: Partial<Budget>) {
  try {
    const updatedChanges = { ...changes, lastModified: Date.now() }; // Update lastModified on change
    return db.budgets.update(category, updatedChanges);
  } catch (e) {
    console.error("Error updating budget: ", e);
    throw e;
  }
}

export async function deleteBudget(category: string) {
  return db.budgets.delete(category); // No soft delete for budgets for now
}

// --- Realtime Database Synchronization Functions ---

/**
 * Performs a robust bidirectional sync between local IndexedDB and Firebase Realtime Database.
 * Handles additions, modifications, and deletions based on lastModified timestamps.
 * @param userId The Firebase User ID.
 */
export async function syncData(userId: string) {
  try {
    const localGiaoDichMap = new Map<string, GiaoDich>();
    const localBudgetsMap = new Map<string, Budget>();

    // Populate local maps
    (await db.giao_dich.toArray()).forEach(gd => { if (gd.id) localGiaoDichMap.set(gd.id, gd); });
    (await db.budgets.toArray()).forEach(b => localBudgetsMap.set(b.category, b));

    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `users/${userId}`));
    const cloudData = snapshot.exists() ? snapshot.val() : {};

    const cloudGiaoDichMap = new Map<string, GiaoDich>();
    const cloudBudgetsMap = new Map<string, Budget>();

    // Populate cloud maps
    if (cloudData.giao_dich) {
      (Object.values(cloudData.giao_dich) as GiaoDich[]).forEach((gd) => {
        if (gd.id) cloudGiaoDichMap.set(gd.id, gd);
      });
    }
    if (cloudData.budgets) {
      (Object.values(cloudData.budgets) as Budget[]).forEach((b) => {
        cloudBudgetsMap.set(b.category, b);
      });
    }

    const updatesToCloud: { [key: string]: GiaoDich | Budget | null } = {}; // Use null for deletions
    const updatesToLocalGiaoDich: GiaoDich[] = [];
    const updatesToLocalBudgets: Budget[] = [];
    const deletesFromLocalGiaoDich: string[] = [];
    const deletesFromLocalBudgets: string[] = [];

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
