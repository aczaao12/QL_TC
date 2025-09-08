'use client';

import React, { useState, useEffect } from 'react';
import { Budget, addBudget, getAllBudgets, updateBudget, deleteBudget, getBudgetByCategory, syncData } from '@/services/db';
import { useAuth } from '@/components/AuthContext'; // Import useAuth
import Link from 'next/link';

const LAST_SYNC_KEY = 'lastSyncTimestamp';

export default function SettingsPage() {
  const { user, loading } = useAuth(); // Get user and loading state from AuthContext
  const [budget, setBudget] = useState<number>(0);
  const [syncEnabled, setSyncEnabled] = useState<boolean>(false); // This state is for the toggle, not the actual sync status
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [newBudgetCategory, setNewBudgetCategory] = useState<string>('');
  const [newBudgetAmount, setNewBudgetAmount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);

  useEffect(() => {
    // Load last sync timestamp from local storage
    const storedLastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (storedLastSync) {
      setLastSyncTimestamp(parseInt(storedLastSync, 10));
    }

    const getStorageEstimate = async () => {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          setStorageUsage({ usage: estimate.usage || 0, quota: estimate.quota || 0 });
        } catch (error) {
          console.error("Error getting storage estimate:", error);
          setStorageError("Không thể lấy thông tin dung lượng lưu trữ.");
        }
      } else {
        setStorageError("Trình duyệt của bạn không hỗ trợ ước tính dung lượng lưu trữ.");
      }
    };
    getStorageEstimate();

    const loadBudgets = async () => {
      const allBudgets = await getAllBudgets();
      setBudgets(allBudgets);
    };
    loadBudgets();
  }, []);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleSaveBudget = () => {
    alert(`Ngân sách ${budget.toLocaleString('vi-VN')} VNĐ đã được lưu.`);
    // In a real app, you would save this to IndexedDB or a backend
  };

  const handleToggleSync = () => {
    setSyncEnabled(!syncEnabled);
    alert(`Đồng bộ hóa đã ${syncEnabled ? 'tắt' : 'bật'}.`);
    // In a real app, you would update sync settings
  };

  const handleAddOrUpdateBudget = async () => {
    if (!newBudgetCategory || newBudgetAmount <= 0) {
      alert("Vui lòng nhập đầy đủ danh mục và số tiền ngân sách hợp lệ.");
      return;
    }
    try {
      const existingBudget = await getBudgetByCategory(newBudgetCategory);
      if (existingBudget) {
        await updateBudget(newBudgetCategory, { amount: newBudgetAmount });
        alert(`Ngân sách cho '${newBudgetCategory}' đã được cập nhật.`);
      } else {
        await addBudget({ category: newBudgetCategory, amount: newBudgetAmount });
        alert(`Ngân sách cho '${newBudgetCategory}' đã được thêm.`);
      }
      setNewBudgetCategory('');
      setNewBudgetAmount(0);
      const updatedBudgets = await getAllBudgets();
      setBudgets(updatedBudgets);
    } catch (error) {
      console.error("Error saving budget:", error);
      alert("Lỗi khi lưu ngân sách.");
    }
  };

  const handleDeleteBudget = async (category: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ngân sách cho '${category}'?`)) {
      try {
        await deleteBudget(category);
        alert(`Ngân sách cho '${category}' đã được xóa.`);
        const updatedBudgets = await getAllBudgets();
        setBudgets(updatedBudgets);
      } catch (error) {
        console.error("Error deleting budget:", error);
        alert("Lỗi khi xóa ngân sách.");
      }
    }
  };

  const handleSyncNow = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để đồng bộ hóa dữ liệu.');
      return;
    }

    setSyncStatus('syncing');
    try {
      await syncData(user.uid); // Call the new syncData function

      const now = Date.now();
      setLastSyncTimestamp(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toString());
      setSyncStatus('success');
      alert('Đồng bộ hóa dữ liệu thành công!');
    } catch (error) {
      console.error('Error during sync:', error);
      setSyncStatus('error');
      alert('Đồng bộ hóa dữ liệu thất bại. Vui lòng thử lại.');
    }
  };

  const shouldPromptSync = user && lastSyncTimestamp && (Date.now() - lastSyncTimestamp > 24 * 60 * 60 * 1000); // Prompt if not synced in 24 hours

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Cài đặt</h1>

      {/* User Status and Sync Prompt */}
      <div className="mb-8 p-4 border rounded-md shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-3">Trạng thái tài khoản & Đồng bộ hóa</h2>
        {loading ? (
          <p>Đang tải trạng thái người dùng...</p>
        ) : user ? (
          <div>
            <p className="mb-2">Đã đăng nhập với: <span className="font-medium">{user.email}</span></p>
            {lastSyncTimestamp && (
              <p className="mb-2">Đồng bộ lần cuối: {new Date(lastSyncTimestamp).toLocaleString()}</p>
            )}
            {shouldPromptSync && (
              <p className="text-orange-600 font-semibold mb-2">
                Bạn đã không đồng bộ dữ liệu trong một thời gian. Hãy đồng bộ ngay!
              </p>
            )}
            <button
              onClick={handleSyncNow}
              className={`px-4 py-2 rounded-md text-white ${
                syncStatus === 'syncing' ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
              disabled={syncStatus === 'syncing'}
            >
              {syncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </button>
            {syncStatus === 'success' && <p className="text-green-600 mt-2">Đồng bộ thành công!</p>}
            {syncStatus === 'error' && <p className="text-red-600 mt-2">Đồng bộ thất bại!</p>}
          </div>
        ) : (
          <p>Bạn chưa đăng nhập. <Link href="/login" className="text-blue-500 hover:underline">Đăng nhập ngay</Link> để đồng bộ hóa dữ liệu.</p>
        )}
      </div>

      <div className="mb-8 p-4 border rounded-md shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-3">Ngân sách mục tiêu</h2>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập ngân sách hàng tháng"
            value={budget}
            onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={handleSaveBudget}
          >
            Lưu Ngân sách
          </button>
        </div>
      </div>

      <div className="mb-8 p-4 border rounded-md shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-3">Ngân sách theo danh mục</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="budgetCategory" className="block text-sm font-medium text-gray-700">Danh mục</label>
            <input
              type="text"
              id="budgetCategory"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={newBudgetCategory}
              onChange={(e) => setNewBudgetCategory(e.target.value)}
              placeholder="Ví dụ: Ăn uống, Đi lại"
            />
          </div>
          <div>
            <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700">Số tiền ngân sách</label>
            <input
              type="number"
              id="budgetAmount"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={newBudgetAmount}
              onChange={(e) => setNewBudgetAmount(parseFloat(e.target.value) || 0)}
              placeholder="Nhập số tiền"
            />
          </div>
        </div>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          onClick={handleAddOrUpdateBudget}
        >
          Thêm / Cập nhật Ngân sách
        </button>

        <h3 className="text-lg font-semibold mt-6 mb-2">Ngân sách hiện có:</h3>
        {
          budgets.length === 0 ? (
            <p>Chưa có ngân sách nào được thiết lập.</p>
          ) : (
            <ul className="space-y-2">
              {budgets.map((b) => (
                <li key={b.category} className="p-3 border rounded-md shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-medium">{b.category}</p>
                    <p className="text-gray-600">{b.amount.toLocaleString('vi-VN')} VNĐ</p>
                  </div>
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onClick={() => handleDeleteBudget(b.category)}
                  >
                    Xóa
                  </button>
                </li>
              ))}
            </ul>
          )
        }
      </div>

      <div className="p-4 border rounded-md shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-3">Tùy chọn đồng bộ Cloud</h2>
        <div className="flex items-center space-x-4">
          <label htmlFor="syncToggle" className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                id="syncToggle"
                className="sr-only"
                checked={syncEnabled}
                onChange={handleToggleSync}
              />
              <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${syncEnabled ? 'translate-x-full bg-green-500' : ''}`}></div>
            </div>
            <div className="ml-3 text-gray-700 font-medium">
              {syncEnabled ? 'Đồng bộ hóa đang BẬT' : 'Đồng bộ hóa đang TẮT'}
            </div>
          </label>
        </div>
      </div>

      <div className="mt-8 p-4 border rounded-md shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-3">Dung lượng lưu trữ trình duyệt</h2>
        {storageError && (
          <p className="text-red-500">Lỗi: {storageError}</p>
        )}
        {storageUsage ? (
          <div>
            <p>Đã sử dụng: {formatBytes(storageUsage.usage)}</p>
            <p>Tổng dung lượng: {formatBytes(storageUsage.quota)}</p>
            <p>Còn trống: {formatBytes(storageUsage.quota - storageUsage.usage)}</p>
          </div>
        ) : (
          !storageError && <p>Đang tải thông tin dung lượng lưu trữ...</p>
        )}
      </div>
    </div>
  );
}