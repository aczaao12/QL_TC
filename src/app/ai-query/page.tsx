'use client';

import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllGiaoDich, GiaoDich } from '@/services/db';
import ReactMarkdown from 'react-markdown';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export default function AIQueryPage() {
  const [userQuery, setUserQuery] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    setLoading(true);
    setError(null);
    setAiResponse(null);
    if (!API_KEY) {
      setError("Gemini API Key is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY in your .env.local file.");
      setLoading(false);
      return;
    }
    try {
      const allTransactions: GiaoDich[] = await getAllGiaoDich();
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are an AI assistant for personal money management. Analyze the following financial transaction data and answer the user's query. Provide insights and suggestions based on the data. If the query is about spending habits, suggest ways to save money or optimize spending.

Financial Transaction Data (JSON array):
${JSON.stringify(allTransactions, null, 2)}

User Query: "${userQuery}"

AI Response:`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      setAiResponse(response.text());
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
        <div className="mt-6 p-4 border rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">Phản hồi từ AI:</h2>
          <ReactMarkdown>{aiResponse}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
