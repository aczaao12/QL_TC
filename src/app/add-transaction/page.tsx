'use client';

import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addGiaoDich, GiaoDich } from '@/services/db';
import { useRouter } from 'next/navigation';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);


// Declare webkitSpeechRecognition for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    grammars: SpeechGrammarList;
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    serviceURI: string;
    onaudiostart: (this: SpeechRecognition, ev: Event) => void;
    onaudioend: (this: SpeechRecognition, ev: Event) => void;
    onend: (this: SpeechRecognition, ev: Event) => void;
    onerror: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void;
    onnomatch: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => void;
    onresult: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => void;
    onsoundstart: (this: SpeechRecognition, ev: Event) => void;
    onsoundend: (this: SpeechRecognition, ev: Event) => void;
    onspeechstart: (this: SpeechRecognition, ev: Event) => void;
    onspeechend: (this: SpeechRecognition, ev: Event) => void;
    onstart: (this: SpeechRecognition, ev: Event) => void;
    abort(): void;
    start(): void;
    stop(): void;
  }
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  var SpeechRecognitionEvent: {
    prototype: SpeechRecognitionEvent;
    new(type: string, eventInitDict: SpeechRecognitionEventInit): SpeechRecognitionEvent;
  };

  interface SpeechRecognitionEventInit extends EventInit {
    resultIndex?: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: SpeechRecognitionErrorCode;
    readonly message: string;
  }
  var SpeechRecognitionErrorEvent: {
    prototype: SpeechRecognitionErrorEvent;
    new(type: string, eventInitDict: SpeechRecognitionErrorEventInit): SpeechRecognitionErrorEvent;
  };

  interface SpeechRecognitionErrorEventInit extends EventInit {
    error: SpeechRecognitionErrorCode;
    message?: string;
  }

  type SpeechRecognitionErrorCode = 
    "no-speech" |
    "aborted" |
    "audio-capture" |
    "network" |
    "not-allowed" |
    "service-not-allowed" |
    "bad-grammar" |
    "language-not-supported";

  interface SpeechGrammar {
    src: string;
    weight: number;
  }

  interface SpeechGrammarList {
    readonly length: number;
    addFromString(string: string, weight?: number): void;
    addFromURI(uri: string, weight?: number): void;
    item(index: number): SpeechGrammar;
  }
  var SpeechGrammarList: {
    prototype: SpeechGrammarList;
    new(): SpeechGrammarList;
  };
}

const getHoChiMinhDateString = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const hoChiMinhDate = new Date(utc + (3600000 * 7));
  return hoChiMinhDate.toISOString().split('T')[0];
};

export default function AddTransactionPage() {
  const [inputText, setInputText] = useState<string>('');
  const [parsedTransaction, setParsedTransaction] = useState<GiaoDich | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const router = useRouter();

  // Manual form state
  const [manualDate, setManualDate] = useState<string>(getHoChiMinhDateString());
  const [manualType, setManualType] = useState<string>('chi');
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualNote, setManualNote] = useState<string>('');
  const [manualAccount, setManualAccount] = useState<string>('Tiền mặt'); // New state for account
  const [manualProjectGoal, setManualProjectGoal] = useState<string>(''); // New state for project/goal

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    setParsedTransaction(null);
    if (!API_KEY) {
      setError("Gemini API Key is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY in your .env.local file.");
      setLoading(false);
      return;
    }
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Parse the following Vietnamese natural language text into a JSON object representing a financial transaction. The JSON object should have the following structure: { "ngay": "YYYY-MM-DD", "loai": "string", "so_tien": number, "ghichu": "string" }.
    - 'ngay' should be in YYYY-MM-DD format. If no date is specified, use today's date (September 7, 2025).
    - 'loai' should be a category like "ăn uống", "đi lại", "lương", "mua sắm", "giải trí", "y tế", "giáo dục", "nhà ở", "tiết kiệm", "khác". If the type is income, use "lương" or "thu nhập".
    - 'so_tien' should be a number.
    - 'ghichu' is optional.

    Examples:
    "Chi 50k ăn sáng hôm nay" -> { "ngay": "2025-09-07", "loai": "ăn uống", "so_tien": 50000, "ghichu": "" }
    "Thu 2tr tiền lương" -> { "ngay": "2025-09-07", "loai": "lương", "so_tien": 2000000, "ghichu": "" }
    "Mua sách 150k ngày 20/8/2025" -> { "ngay": "2025-08-20", "loai": "mua sắm", "so_tien": 150000, "ghichu": "Mua sách" }
    "Đi taxi 75 nghìn" -> { "ngay": "2025-09-07", "loai": "đi lại", "so_tien": 75000, "ghichu": "" }
    "Tiền điện tháng 7 hết 300k" -> { "ngay": "2025-09-07", "loai": "nhà ở", "so_tien": 300000, "ghichu": "Tiền điện tháng 7" }

    Text to parse: "${inputText}"
    JSON:
    `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const jsonText = response.text().trim();

      // Attempt to parse the JSON. The model might return extra text, so we try to extract the JSON part.
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      let data: GiaoDich;
      if (jsonMatch && jsonMatch[0]) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse JSON from AI response: ' + jsonText);
      }

      // Ensure the date is in YYYY-MM-DD format if not provided by AI
      if (!data.ngay) {
        data.ngay = getHoChiMinhDateString();
      }
      setParsedTransaction(data);
    } catch (err: unknown) {
      console.error("Error parsing transaction:", err);
      setError((err as Error).message || "Failed to parse transaction. Please try again.");
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
      tai_khoan: manualAccount,
      du_an_muc_tieu: manualProjectGoal,
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
          <div>
            <label htmlFor="manualAccount" className="block text-sm font-medium text-gray-700">Tài khoản / Ví</label>
            <select
              id="manualAccount"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={manualAccount}
              onChange={(e) => setManualAccount(e.target.value)}
            >
              <option value="Tiền mặt">Tiền mặt</option>
              <option value="Ngân hàng">Ngân hàng</option>
              <option value="Ví điện tử">Ví điện tử</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div>
            <label htmlFor="manualProjectGoal" className="block text-sm font-medium text-gray-700">Dự án / Mục tiêu</label>
            <input
              type="text"
              id="manualProjectGoal"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={manualProjectGoal}
              onChange={(e) => setManualProjectGoal(e.target.value)}
              placeholder="Ví dụ: Dự án A, Tiết kiệm mua nhà"
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
