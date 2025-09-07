'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { GiaoDich, getAllGiaoDich } from '@/services/db';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<GiaoDich[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // Format: YYYY-MM or 'all'
  const [selectedYear, setSelectedYear] = useState<string>('all'); // Format: YYYY or 'all'

  useEffect(() => {
    async function loadTransactions() {
      const allTransactions = await getAllGiaoDich();
      setTransactions(allTransactions);
    }
    loadTransactions();
  }, []);

  const years = useMemo(() => {
    const uniqueYears = new Set<string>();
    transactions.forEach(tx => uniqueYears.add(tx.ngay.substring(0, 4)));
    return ['all', ...Array.from(uniqueYears).sort((a, b) => parseInt(b) - parseInt(a))];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txMonth = tx.ngay.substring(0, 7); // YYYY-MM
      const txYear = tx.ngay.substring(0, 4); // YYYY

      const monthMatch = selectedMonth === 'all' || txMonth === selectedMonth;
      const yearMatch = selectedYear === 'all' || txYear === selectedYear;

      return monthMatch && yearMatch;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const aggregatedReport = useMemo(() => {
    const report: Record<string, Record<string, number>> = {};

    filteredTransactions.forEach(tx => {
      const mainCategory = tx.loai; // e.g., 'thu', 'chi', 'ăn uống'
      const subCategory = tx.tai_khoan || 'Không xác định'; // Use account or a default
      const projectGoal = tx.du_an_muc_tieu || 'Không xác định'; // Use project/goal or a default

      if (!report[mainCategory]) {
        report[mainCategory] = {};
      }
      if (!report[mainCategory][subCategory]) {
        report[mainCategory][subCategory] = 0;
      }
      report[mainCategory][subCategory] += tx.so_tien;

      // Also aggregate by project/goal if needed, can be a separate report or nested
      if (!report[mainCategory][projectGoal]) {
        report[mainCategory][projectGoal] = 0;
      }
      report[mainCategory][projectGoal] += tx.so_tien;
    });

    return report;
  }, [filteredTransactions]);

  const handleExportCsv = () => {
    if (transactions.length === 0) {
      alert("Không có giao dịch nào để xuất.");
      return;
    }

    const headers = ["ID", "Ngày", "Loại", "Số tiền", "Ghi chú", "Tài khoản", "Dự án/Mục tiêu"];
    const rows = transactions.map(tx => [
      tx.id || '',
      tx.ngay,
      tx.loai,
      tx.so_tien,
      tx.ghichu || '',
      tx.tai_khoan || '',
      tx.du_an_muc_tieu || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')), // Corrected escaping for CSV fields
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'giao_dich.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tất cả Giao dịch</h1>

      <div className="mb-4 flex space-x-4">
        <select
          className="p-2 border rounded-md"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="all">Tất cả tháng</option>
          {Array.from({ length: 12 }, (_, i) => {
            const monthNum = (i + 1).toString().padStart(2, '0');
            const yearPrefix = selectedYear === 'all' ? new Date().getFullYear().toString() : selectedYear;
            return (
              <option key={monthNum} value={`${yearPrefix}-${monthNum}`}>
                Tháng {monthNum}
              </option>
            );
          })}
        </select>

        <select
          className="p-2 border rounded-md"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {years.map(year => (
            <option key={year} value={year}>
              {year === 'all' ? 'Tất cả năm' : `Năm ${year}`}
            </option>
          ))}
        </select>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          onClick={handleExportCsv}
        >
          Xuất CSV
        </button>
      </div>

      <div className="mb-6 p-4 border rounded-md shadow-sm bg-white">
        <h2 className="text-xl font-bold mb-3">Báo cáo tổng hợp</h2>
        {
          Object.keys(aggregatedReport).length === 0 ? (
            <p>Chưa có dữ liệu báo cáo cho bộ lọc hiện tại.</p>
          ) : (
            <div>
              {Object.entries(aggregatedReport).map(([mainCat, subCats]) => (
                <div key={mainCat} className="mb-4">
                  <h3 className="text-lg font-semibold text-blue-700">{mainCat.toUpperCase()}</h3>
                  <ul className="ml-4 space-y-1">
                    {Object.entries(subCats)
                      .sort(([, a], [, b]) => b - a)
                      .map(([subCat, amount]) => (
                        <li key={subCat} className="flex justify-between items-center">
                          <span>{subCat}</span>
                          <span className="font-medium">{amount.toLocaleString('vi-VN')} VNĐ</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        }
      </div>

      <h2 className="text-xl font-bold mb-3">Giao dịch chi tiết</h2>
      {
        filteredTransactions.length === 0 ? (
          <p>Chưa có giao dịch nào phù hợp với bộ lọc.</p>
        ) : (
          <ul className="space-y-2">
            {filteredTransactions.map((tx) => (
              <li key={tx.id} className="p-3 border rounded-md shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-medium">{tx.ngay} - {tx.loai} {tx.tai_khoan && `(${tx.tai_khoan})`} {tx.du_an_muc_tieu && `[${tx.du_an_muc_tieu}]`}</p>
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
