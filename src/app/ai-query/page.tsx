'use client';

import React, { useState } from 'react';
import { queryAICallable } from '@/services/firebase';
import { getAllGiaoDich, GiaoDich } from '@/services/db';

export default function AIQueryPage() {
  const [userQuery, setUserQuery] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    setLoading(true);
    setError(null);
    setAiResponse(null);
    try {
      const allTransactions: GiaoDich[] = await getAllGiaoDich();
      const result = await queryAICallable({ query: userQuery, transactions: allTransactions });
      setAiResponse(result.data as string);
    } catch (err: unknown) {
      console.error("Error querying AI:", err);
      let errorMessage = "Failed to get AI response. Please try again.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Query & Gợi ý</h1>

      <div className="mb-4">
        <textarea
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Hỏi AI về chi tiêu của bạn (ví dụ: Tháng này tôi chi bao nhiêu tiền cafe?)"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
        ></textarea>
      </div>

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        onClick={handleQuery}
        disabled={loading || !userQuery.trim()}
      >
        {loading ? 'Đang xử lý...' : 'Hỏi AI'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p>Lỗi: {error}</p>
        </div>
      )}

      {aiResponse && (
        <div className="mt-6 p-4 border rounded-md bg-gray-50 whitespace-pre-wrap">
          <h2 className="text-xl font-semibold mb-3">Phản hồi từ AI:</h2>
          <p>{aiResponse}</p>
        </div>
      )}
    </div>
  );
}
