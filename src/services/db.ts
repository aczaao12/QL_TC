import Dexie, { Table } from 'dexie';

export interface GiaoDich {
  id?: number;
  ngay: string; // YYYY-MM-DD
  loai: string; // e.g., 'ăn uống', 'đi lại', 'lương'
  so_tien: number;
  ghichu?: string;
  tai_khoan?: string; // e.g., 'Tiền mặt', 'Ngân hàng', 'Ví điện tử'
  du_an_muc_tieu?: string; // e.g., 'Dự án A', 'Mục tiêu tiết kiệm'
}

export interface Budget {
  category: string;
  amount: number;
}

export class MySubClassedDexie extends Dexie {
  giao_dich!: Table<GiaoDich>;
  budgets!: Table<Budget>;

  constructor() {
    super('PWAQuanLyTienDB');
    this.version(4).stores({
      giao_dich: '++id, ngay, loai, so_tien, ghichu, tai_khoan, du_an_muc_tieu',
      budgets: 'category', // category is the primary key
    });
  }
}

export const db = new MySubClassedDexie();

// CRUD Operations for GiaoDich

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

// CRUD Operations for Budget

export async function addBudget(budget: Budget) {
  try {
    return db.budgets.add(budget);
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
  return db.budgets.update(category, changes);
}

export async function deleteBudget(category: string) {
  return db.budgets.delete(category);
}