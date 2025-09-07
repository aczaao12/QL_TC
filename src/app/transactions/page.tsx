'use client';

import React, { useEffect, useState } from 'react';
import { GiaoDich, getAllGiaoDich } from '@/services/db';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<GiaoDich[]>([]);

  useEffect(() => {
    async function loadTransactions() {
      const allTransactions = await getAllGiaoDich();
      setTransactions(allTransactions);
    }
    loadTransactions();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tất cả Giao dịch</h1>
      {
        transactions.length === 0 ? (
          <p>Chưa có giao dịch nào.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((tx) => (
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
    </div>
  );
}