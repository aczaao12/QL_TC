import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllGiaoDich } from '../services/db'; // Adjusted path and type-only import
import ReactMarkdown from 'react-markdown';
import { buildFinancePrompt } from '../utils/prompts'; // Import buildFinancePrompt

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''; // Changed environment variable access
const genAI = new GoogleGenerativeAI(API_KEY);

const MAX_RETRIES = 3; // Define max retries
const RETRY_DELAY_MS = 1000; // 1 second delay

export default function AIQueryPage() {
  const [userQuery, setUserQuery] = useState('');
  const [aiResponse, setAiResponse] = useState(null); // This will now only hold the latest response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cachedTransactions, setCachedTransactions] = useState(null);
  const [chatHistory, setChatHistory] = useState([]); // New state for chat history
  const [aiAnalyzedTransaction, setAiAnalyzedTransaction] = useState(null); // New state for second AI output

  const handleQuery = async () => {
    setLoading(true);
    setError(null);
    // setAiResponse(null); // No longer needed as we're using chatHistory

    const currentQuery = userQuery; // Capture current query before clearing input

    if (!API_KEY) {
      setError("Gemini API Key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.");
      setLoading(false);
      return;
    }

    try {
      let allTransactions;
      if (cachedTransactions) {
        allTransactions = cachedTransactions;
      } else {
        allTransactions = await getAllGiaoDich();
        setCachedTransactions(allTransactions);
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Function to get current date in 'YYYY-MM-DD' format for UTC+7 (Ho Chi Minh)
      const getHoChiMinhDateString = (date) => {
        const hoChiMinhOffset = 7 * 60; // UTC+7 in minutes
        const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
        const hoChiMinhDate = new Date(utc + (hoChiMinhOffset * 60 * 1000));
        return hoChiMinhDate.toISOString().slice(0, 10);
      };

      const currentDateObj = new Date();
      const hoChiMinhCurrentDateString = getHoChiMinhDateString(currentDateObj);

      const threeMonthsAgo = new Date(currentDateObj);
      threeMonthsAgo.setMonth(currentDateObj.getMonth() - 3);
      const hoChiMinhThreeMonthsAgoDateString = getHoChiMinhDateString(threeMonthsAgo);

      const recentTransactions = allTransactions.filter(transaction => {
        return transaction.date >= hoChiMinhThreeMonthsAgoDateString;
      });

      const prompt = buildFinancePrompt(recentTransactions, currentQuery, hoChiMinhCurrentDateString);

      const apiCallFn = async () => {
        const result = await model.generateContent(prompt);
        return result.response.text();
      };

      const responseText = await withRetry(apiCallFn, MAX_RETRIES, RETRY_DELAY_MS, setError);

      // Add to chat history
      setChatHistory(prevHistory => [...prevHistory, { query: currentQuery, response: responseText }]);

      // Call the second AI to analyze the transaction
      const secondAiPrompt = `Dựa trên cuộc trò chuyện sau đây, hãy phân tích và tóm tắt các giao dịch tài chính được đề cập. Chỉ trả về các giao dịch được đề cập rõ ràng hoặc ngụ ý trong phản hồi của AI, không thêm thông tin mới. Nếu không có giao dịch cụ thể nào được đề cập, hãy trả về "Không có giao dịch cụ thể nào được đề cập trong phản hồi của AI."

Cuộc trò chuyện:
Người dùng: ${currentQuery}
AI phản hồi: ${responseText}

Giao dịch được AI phân tích:`;

      const secondApiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const secondApiCallFn = async () => {
        const result = await secondApiModel.generateContent(secondAiPrompt);
        return result.response.text();
      };
      const secondAiResponseText = await withRetry(secondApiCallFn, MAX_RETRIES, RETRY_DELAY_MS, setError);
      setAiAnalyzedTransaction(secondAiResponseText);

      setUserQuery(''); // Clear input after successful query

    } catch (err) {
      let errorMessage = "Đã xảy ra lỗi không xác định. Vui lòng thử lại."; // Default generic error

      if (err && typeof err === 'object') {
        if (err.message) {
          // Check for specific system error messages
          if (err.message.includes('API key not valid') || err.message.includes('API_KEY')) {
            errorMessage = "Lỗi cấu hình API: Khóa API Gemini không hợp lệ hoặc bị thiếu. Vui lòng kiểm tra lại.";
          } else if (err.message.includes('network') || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
            errorMessage = "Lỗi kết nối mạng: Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra kết nối internet của bạn.";
          } else if (err.message.includes('500') || err.message.includes('502') || err.message.includes('503') || err.message.includes('504')) {
            errorMessage = "Lỗi máy chủ AI: Máy chủ đang gặp sự cố hoặc quá tải. Vui lòng thử lại sau ít phút.";
          } else if (err.message.includes('Max retries reached')) {
            errorMessage = "Máy chủ AI quá tải: Đã thử lại nhiều lần nhưng không thành công. Vui lòng thử lại sau.";
          } else {
            errorMessage = `Lỗi hệ thống: ${err.message}. Vui lòng thử lại.`;
          }
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Query & Gợi ý</h1>

      {/* Chat History Display */}
      <div className="mb-4 border rounded-md p-4 bg-gray-100 h-64 overflow-y-auto">
        {chatHistory.length === 0 ? (
          <p className="text-gray-500">Chưa có lịch sử trò chuyện nào.</p>
        ) : (
          chatHistory.map((entry, index) => (
            <div key={index} className="mb-4">
              <p className="font-semibold text-blue-700">Bạn: {entry.query}</p>
              <div className="bg-white p-2 rounded-md mt-1">
                <ReactMarkdown>{entry.response}</ReactMarkdown>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mb-4">
        <textarea
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Hỏi AI về chi tiêu của bạn (ví dụ: Tháng này tôi chi bao nhiêu tiền cafe?)"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleQuery();
            }
          }}
        ></textarea>
      </div>

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        onClick={handleQuery}
        disabled={loading || !userQuery.trim()}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="spinner mr-2"></div>
            <span>Đang xử lý...</span>
          </div>
        ) : (
          'Hỏi AI'
        )}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p>Lỗi: {error}</p>
        </div>
      )}

      {/* aiResponse is no longer directly displayed, but part of chatHistory */}
      {/* {aiResponse && (
        <div className="mt-6 p-4 border rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">Phản hồi từ AI:</h2>
          <ReactMarkdown>
            {aiResponse}
          </ReactMarkdown>
        </div>
      )} */}

      {aiAnalyzedTransaction && (
        <div className="mt-6 p-4 border rounded-md bg-blue-50">
          <h2 className="text-xl font-semibold mb-3">Giao dịch được AI phân tích:</h2>
          <ReactMarkdown>
            {aiAnalyzedTransaction}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}


