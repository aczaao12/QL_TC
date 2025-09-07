import Dexie, { Table } from 'dexie';

export interface GiaoDich {
  id?: number;
  ngay: string; // YYYY-MM-DD
  loai: string; // e.g., 'ăn uống', 'đi lại', 'lương'
  so_tien: number;
  ghichu?: string;
}

export class MySubClassedDexie extends Dexie {
  giao_dich!: Table<GiaoDich>;

  constructor() {
    super('PWAQuanLyTienDB');
    this.version(1).stores({
      giao_dich: '++id, ngay, loai, so_tien, ghichu',
    });
  }
}

export const db = new MySubClassedDexie();

// CRUD Operations

export async function addGiaoDich(transaction: Omit<GiaoDich, 'id'>) {
  try {
    return db.giao_dich.add(transaction);
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
  return db.giao_dich.update(id, changes);
}

export async function deleteGiaoDich(id: number) {
  return db.giao_dich.delete(id);
}

export async function getGiaoDichByDateRange(startDate: string, endDate: string) {
  return db.giao_dich.where('ngay').between(startDate, endDate, true, true).toArray();
}

export async function getGiaoDichByType(loai: string) {
  return db.giao_dich.where('loai').equals(loai).toArray();
}