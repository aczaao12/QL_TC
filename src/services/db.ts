import Dexie, { Table } from 'dexie';
import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export interface GiaoDich {
  id?: number;
  ngay: string; // YYYY-MM-DD
  loai: string; // e.g., 'ăn uống', 'đi lại', 'lương'
  so_tien: number;
  ghichu?: string;
  firestoreId?: string; // To store Firestore document ID
}

export class MySubClassedDexie extends Dexie {
  giao_dich!: Table<GiaoDich>;

  constructor() {
    super('PWAQuanLyTienDB');
    this.version(1).stores({
      giao_dich: '++id, ngay, loai, so_tien, ghichu, firestoreId',
    });
  }
}

export const db = new MySubClassedDexie();

// CRUD Operations

export async function addGiaoDich(transaction: Omit<GiaoDich, 'id' | 'firestoreId'>) {
  try {
    // Add to Firestore first
    const docRef = await addDoc(collection(dbFirestore, "giao_dich"), transaction);
    console.log("Document written with ID: ", docRef.id);

    // Add to IndexedDB with Firestore ID
    return db.giao_dich.add({ ...transaction, firestoreId: docRef.id });
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
}

export async function getGiaoDichById(id: number) {
  return db.giao_dich.get(id);
}

export async function getAllGiaoDich() {
  return db.giao_dich.toArray();
}

export async function updateGiaoDich(id: number, changes: Partial<GiaoDich>) {
  // TODO: Implement update to Firestore as well
  return db.giao_dich.update(id, changes);
}

export async function deleteGiaoDich(id: number) {
  // TODO: Implement delete from Firestore as well
  return db.giao_dich.delete(id);
}

export async function getGiaoDichByDateRange(startDate: string, endDate: string) {
  return db.giao_dich.where('ngay').between(startDate, endDate, true, true).toArray();
}

export async function getGiaoDichByType(loai: string) {
  return db.giao_dich.where('loai').equals(loai).toArray();
}

export async function syncFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(dbFirestore, "giao_dich"));
    const firestoreTransactions: GiaoDich[] = [];
    querySnapshot.forEach((doc) => {
      firestoreTransactions.push({ ...doc.data() as GiaoDich, firestoreId: doc.id });
    });

    const localTransactions = await db.giao_dich.toArray();
    const localFirestoreIds = new Set(localTransactions.map(tx => tx.firestoreId).filter(Boolean));

    for (const ft of firestoreTransactions) {
      if (ft.firestoreId && !localFirestoreIds.has(ft.firestoreId)) {
        // Add to local IndexedDB if not already present
        await db.giao_dich.add(ft);
      }
    }
    console.log("Firestore sync complete.");
  } catch (e) {
    console.error("Error syncing from Firestore: ", e);
  }
}
