'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { GiaoDich, getAllGiaoDich, getAllBudgets, Budget } from '@/services/db';
import Link from 'next/link';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<GiaoDich[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'day' | 'week' | 'month' | 'year'>('all');
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [overBudgetCategories, setOverBudgetCategories] = useState<string[]>([]);

  const getHoChiMinhDate = (date: Date) => {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 7)); // GMT+7
  };

  useEffect(() => {
    async function loadTransactions() {
      const allTransactions = await getAllGiaoDich();
      setTransactions(allTransactions);
    }
    loadTransactions();

    async function loadBudgets() {
      const allBudgets = await getAllBudgets();
      setBudgets(allBudgets);
    }
    loadBudgets();
  }, []);

  useEffect(() => {
    const now = getHoChiMinhDate(new Date());
    let filteredTransactions = transactions;

    if (selectedPeriod === 'day') {
      const todayStr = now.toISOString().split('T')[0];
      filteredTransactions = transactions.filter(tx => tx.ngay === todayStr);
    } else if (selectedPeriod === 'week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))); // Monday as start of week
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      filteredTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.ngay);
        return txDate >= startOfWeek && txDate <= endOfWeek;
      });
    } else if (selectedPeriod === 'month') {
      const currentMonth = now.toISOString().substring(0, 7);
      filteredTransactions = transactions.filter(tx => tx.ngay.startsWith(currentMonth));
    } else if (selectedPeriod === 'year') {
      const currentYear = now.getFullYear().toString();
      filteredTransactions = transactions.filter(tx => tx.ngay.startsWith(currentYear));
    }

    let income = 0;
    let expense = 0;
    const totals: Record<string, number> = {};

    filteredTransactions.forEach(tx => {
      if (tx.loai === 'thu') {
        income += tx.so_tien;
      } else {
        expense += tx.so_tien;
      }
      totals[tx.loai] = (totals[tx.loai] || 0) + tx.so_tien;
    });

    setTotalIncome(income);
    setTotalExpense(expense);
    setCategoryTotals(totals);

    // Check for budget overruns
    const exceeded: string[] = [];
    budgets.forEach(budget => {
      const spent = totals[budget.category] || 0;
      if (spent > budget.amount) {
        exceeded.push(budget.category);
      }
    });
    setOverBudgetCategories(exceeded);
  }, [transactions, selectedPeriod, budgets]);

  const categoryChartData = useMemo(() => {
    const expenseCategories = Object.entries(categoryTotals).filter(([category]) => category !== 'thu');
    return {
      labels: expenseCategories.map(([category]) => category),
      datasets: [
        {
          label: 'Chi tiêu theo loại',
          data: expenseCategories.map(([, amount]) => amount),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [categoryTotals]);

  const incomeExpenseChartData = useMemo(() => {
    return {
      labels: ['Tổng Thu', 'Tổng Chi'],
      datasets: [
        {
          label: 'Tổng quan',
          data: [totalIncome, totalExpense],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [totalIncome, totalExpense]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {overBudgetCategories.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Cảnh báo ngân sách!</strong>
          <span className="block sm:inline"> Bạn đã vượt ngân sách cho các danh mục: {overBudgetCategories.join(', ')}.</span>
        </div>
      )}

      <div className="mb-4 flex space-x-2">
        <button
          className={`px-4 py-2 rounded-md ${selectedPeriod === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedPeriod('all')}
        >
          Tất cả
        </button>
        <button
          className={`px-4 py-2 rounded-md ${selectedPeriod === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedPeriod('day')}
        >
          Hôm nay
        </button>
        <button
          className={`px-4 py-2 rounded-md ${selectedPeriod === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedPeriod('week')}
        >
          Tuần này
        </button>
        <button
          className={`px-4 py-2 rounded-md ${selectedPeriod === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedPeriod('month')}
        >
          Tháng này
        </button>
        <button
          className={`px-4 py-2 rounded-md ${selectedPeriod === 'year' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedPeriod('year')}
        >
          Năm nay
        </button>
      </div>

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

      <div className="mb-6 p-4 border rounded-md shadow-sm bg-white">
        <h2 className="text-xl font-bold mb-3">Tổng quan Thu/Chi</h2>
        <div style={{ height: '200px' }}>
          <Bar data={incomeExpenseChartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

      <div className="mb-6 p-4 border rounded-md shadow-sm bg-white">
        <h2 className="text-xl font-bold mb-3">Chi tiêu theo loại</h2>
        <div style={{ height: '250px' }}>
          <Doughnut data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
        {
          Object.keys(categoryTotals).length === 0 ? (
            <p>Chưa có dữ liệu phân loại chi tiêu.</p>
          ) : (
            <ul className="space-y-2 mt-4">
              {Object.entries(categoryTotals)
                .sort(([, a], [, b]) => b - a) // Sort by amount, descending
                .map(([category, amount]) => {
                  const budgetForCategory = budgets.find(b => b.category === category);
                  const budgetAmount = budgetForCategory ? budgetForCategory.amount : 0;
                  const remaining = budgetAmount - amount;
                  const isOverBudget = budgetAmount > 0 && remaining < 0;

                  return (
                    <li key={category} className="flex justify-between items-center">
                      <span className="font-medium">{category}</span>
                      <span className="text-gray-700">
                        {amount.toLocaleString('vi-VN')} VNĐ
                        {budgetAmount > 0 && (
                          <span className={`ml-2 text-sm ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
                            (Ngân sách: {budgetAmount.toLocaleString('vi-VN')} VNĐ, Còn: {remaining.toLocaleString('vi-VN')} VNĐ)
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )
        }
      </div>

      <h2 className="text-xl font-bold mb-3">Giao dịch gần đây</h2>
      {
        transactions.length === 0 ? (
          <p>Chưa có giao dịch nào. <Link href="/add-transaction" className="text-blue-500 hover:underline">Thêm ngay!</Link></p>
        ) : (
          <ul className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
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