'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
  const [budget, setBudget] = useState<number>(0);
  const [syncEnabled, setSyncEnabled] = useState<boolean>(false);

  const handleSaveBudget = () => {
    alert(`Ngân sách ${budget.toLocaleString('vi-VN')} VNĐ đã được lưu.`);
    // In a real app, you would save this to IndexedDB or a backend
  };

  const handleToggleSync = () => {
    setSyncEnabled(!syncEnabled);
    alert(`Đồng bộ hóa đã ${syncEnabled ? 'tắt' : 'bật'}.`);
    // In a real app, you would update sync settings
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Cài đặt</h1>

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
    </div>
  );
}
