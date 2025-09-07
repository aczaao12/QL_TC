'use client';

import React, { useEffect, useState } from 'react';
import { GiaoDich, getAllGiaoDich } from '@/services/db';
import Link from 'next/link';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<GiaoDich[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);

  useEffect(() => {
    async function loadTransactions() {
      const allTransactions = await getAllGiaoDich();
      setTransactions(allTransactions);

      let income = 0;
      let expense = 0;
      allTransactions.forEach(tx => {
        if (tx.loai === 'thu') {
          income += tx.so_tien;
        } else {
          expense += tx.so_tien;
        }
      });
      setTotalIncome(income);
      setTotalExpense(expense);
    }
    loadTransactions();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded-md shadow-sm">
          <h2 className="text-lg font-semibold text-green-800">Tổng Thu</h2>
          <p className="text-2xl font-bold text-green-600">{totalIncome.toLocaleString('vi-VN')} VNĐ</p>
        </div>
        <div className="bg-red-100 p-4 rounded-md shadow-sm">
          <h2 className="text-lg font-semibold text-red-800">Tổng Chi</h2>
          <p className="text-2xl font-bold text-red-600">{totalExpense.toLocaleString('vi-VN')} VNĐ</p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">Giao dịch gần đây</h2>
      {
        transactions.length === 0 ? (
          <p>Chưa có giao dịch nào. <Link href="/add-transaction" className="text-blue-500 hover:underline">Thêm ngay!</Link></p>
        ) : (
          <ul className="space-y-2">
            {transactions.slice(0, 5).map((tx) => ( // Display only the 5 most recent transactions
              <li key={tx.id} className="p-3 border rounded-md shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-medium">{tx.ngay} - {tx.loai}</p>
                  <p className="text-gray-600">{tx.ghichu}</p>
                </div>
                <p className={`font-bold ${tx.loai === 'thu' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.so_tien.toLocaleString('vi-VN')} VNĐ
                </p>
              </li>
            ))}
          </ul>
        )
      }
      {transactions.length > 5 && (
        <div className="text-right mt-4">
          <Link href="/transactions" className="text-blue-500 hover:underline">
            Xem tất cả giao dịch
          </Link>
        </div>
      )}
    </div>
  );
}