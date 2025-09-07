'use client';

import React, { useState } from 'react';
import { parseTransactionCallable } from '@/services/firebase';
import { addGiaoDich, GiaoDich } from '@/services/db';
import { useRouter } from 'next/navigation';

// Declare webkitSpeechRecognition for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function AddTransactionPage() {
  const [inputText, setInputText] = useState<string>('');
  const [parsedTransaction, setParsedTransaction] = useState<GiaoDich | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const router = useRouter();

  // Manual form state
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualType, setManualType] = useState<string>('chi');
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualNote, setManualNote] = useState<string>('');

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    setParsedTransaction(null);
    try {
      const result = await parseTransactionCallable({ text: inputText });
      const data = result.data as GiaoDich;
      // Ensure the date is in YYYY-MM-DD format if not provided by AI
      if (!data.ngay) {
        data.ngay = new Date().toISOString().split('T')[0];
      }
      setParsedTransaction(data);
    } catch (err: unknown) {
      console.error("Error parsing transaction:", err);
      setError(err.message || "Failed to parse transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (transactionToSave: GiaoDich) => {
    try {
      await addGiaoDich(transactionToSave);
      alert('Giao dịch đã được lưu thành công!');
      router.push('/transactions'); // Redirect to transactions list
    } catch (err: unknown) {
      console.error("Error saving transaction:", err);
      let errorMessage = "Failed to save transaction.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  const handleManualSave = async () => {
    if (manualAmount <= 0) {
      setError("Số tiền phải lớn hơn 0.");
      return;
    }
    const newTransaction: GiaoDich = {
      ngay: manualDate,
      loai: manualType,
      so_tien: manualAmount,
      ghichu: manualNote,
    };
    await handleSave(newTransaction);
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Trình duyệt của bạn không hỗ trợ Web Speech API. Vui lòng sử dụng Chrome.");
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'vi-VN'; // Set language to Vietnamese

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice recognition started.');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
      console.log('Voice recognition result:', transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Voice recognition error:', event.error);
      setError(`Lỗi nhận dạng giọng nói: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended.');
    };

    recognition.start();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Thêm Giao dịch mới</h1>

      {/* AI Input Section */}
      <div className="mb-8 p-4 border rounded-md shadow-sm bg-blue-50">
        <h2 className="text-xl font-semibold mb-3 text-blue-800">Nhập liệu bằng AI</h2>
        <div className="mb-4">
          <textarea
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Nhập giao dịch của bạn (ví dụ: Chi 50k ăn sáng hôm nay)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>
        </div>

        <div className="flex space-x-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            onClick={handleParse}
            disabled={loading || !inputText.trim()}
          >
            {loading ? 'Đang phân tích...' : 'Phân tích với AI'}
          </button>
          <button
            className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            onClick={handleVoiceInput}
            disabled={isListening || loading}
          >
            {isListening ? 'Đang nghe...' : 'Nhập bằng giọng nói'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            <p>Lỗi: {error}</p>
          </div>
        )}

        {parsedTransaction && (
          <div className="mt-6 p-4 border rounded-md bg-gray-50">
            <h2 className="text-xl font-semibold mb-3">Giao dịch được AI phân tích:</h2>
            <p><strong>Ngày:</strong> {parsedTransaction.ngay}</p>
            <p><strong>Loại:</strong> {parsedTransaction.loai}</p>
            <p><strong>Số tiền:</strong> {parsedTransaction.so_tien.toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Ghi chú:</strong> {parsedTransaction.ghichu || 'Không có'}</p>
            <button
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              onClick={() => handleSave(parsedTransaction)}
            >
              Lưu Giao dịch (AI)
            </button>
          </div>
        )}
      </div>

      {/* Manual Input Section */}
      <div className="mt-8 p-4 border rounded-md shadow-sm bg-gray-50">
        <h2 className="text-xl font-semibold mb-3">Nhập liệu thủ công</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="manualDate" className="block text-sm font-medium text-gray-700">Ngày</label>
            <input
              type="date"
              id="manualDate"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="manualType" className="block text-sm font-medium text-gray-700">Loại</label>
            <select
              id="manualType"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={manualType}
              onChange={(e) => setManualType(e.target.value)}
            >
              <option value="chi">Chi</option>
              <option value="thu">Thu</option>
              <option value="ăn uống">Ăn uống</option>
              <option value="đi lại">Đi lại</option>
              <option value="lương">Lương</option>
              <option value="mua sắm">Mua sắm</option>
              <option value="giải trí">Giải trí</option>
              <option value="y tế">Y tế</option>
              <option value="giáo dục">Giáo dục</option>
              <option value="nhà ở">Nhà ở</option>
              <option value="tiết kiệm">Tiết kiệm</option>
              <option value="khác">Khác</option>
            </select>
          </div>
          <div>
            <label htmlFor="manualAmount" className="block text-sm font-medium text-gray-700">Số tiền</label>
            <input
              type="number"
              id="manualAmount"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={manualAmount}
              onChange={(e) => setManualAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label htmlFor="manualNote" className="block text-sm font-medium text-gray-700">Ghi chú</label>
            <input
              type="text"
              id="manualNote"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
            />
          </div>
        </div>
        <button
          className="mt-6 bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          onClick={handleManualSave}
          disabled={manualAmount <= 0}
        >
          Lưu Giao dịch thủ công
        </button>
      </div>
    </div>
  );
}
