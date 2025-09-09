import React, { useEffect, useState } from 'react';
import { getAllGiaoDich, deleteGiaoDich } from '../services/db'; // Adjusted path and type-only import
import { Link } from 'react-router-dom'; // Changed from next/link

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await getAllGiaoDich();
        setTransactions(data);
      } catch (err) {
        console.error("Error loading transactions:", err);
        setError("Không thể tải giao dịch.");
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, []);

  const handleDelete = async (id) => { // Changed type to string
    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?')) {
      try {
        await deleteGiaoDich(id);
        setTransactions(transactions.filter(tx => tx.id !== id));
        alert('Giao dịch đã được xóa thành công!');
      } catch (err) {
        console.error("Error deleting transaction:", err);
        setError("Không thể xóa giao dịch.");
      }
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Đang tải giao dịch...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Lỗi: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tất cả Giao dịch</h1>

      {transactions.length === 0 ? (
        <p>Chưa có giao dịch nào. <Link to="/add-transaction" className="text-blue-500 hover:underline">Thêm ngay!</Link></p>
      ) : (
        <ul className="space-y-3">
          {transactions.map((tx) => (
            <li key={tx.id} className="p-4 border rounded-md shadow-sm bg-white flex justify-between items-center">
              <div>
                <p className="font-medium text-lg">{new Date(tx.ngay).toLocaleString()} - {tx.loai}</p>
                <p className="text-gray-600">{tx.ghichu}</p>
                {tx.tai_khoan && <p className="text-sm text-gray-500">Tài khoản: {tx.tai_khoan}</p>}
                {tx.du_an_muc_tieu && <p className="text-sm text-gray-500">Dự án/Mục tiêu: {tx.du_an_muc_tieu}</p>}
              </div>
              <div className="text-right">
                <p className={`font-bold text-xl ${tx.loai === 'thu' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.so_tien.toLocaleString('vi-VN')} VNĐ
                </p>
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="mt-2 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
