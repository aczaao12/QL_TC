// src/lib/aiParser.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// Access your API key as an environment variable (see "Set up your API key" above)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});

// Define the JSON schema for AI actions
const AI_SCHEMA = {
  "action": "create | read | update | delete | analyze | aggregate",
  "collection": "transactions",
  "filter": {
    "field": "date | name | category | amount",
    "operator": "== | > | < | between",
    "value": "..."
  },
  "data": [
    {
      "id": "docId if update/delete needed",
      "name": "...",
      "amount": 100000,
      "category": "...",
      "date": "YYYY-MM-DD"
    }
  ],
  "aggregate": {
    "operation": "sum | avg | max | min | count",
    "field": "amount | category | date"
  }
};

export async function parsePromptWithAI(prompt: string, userData: any = {}): Promise<any> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const systemInstruction = `
  Bạn là bộ chuyển đổi ngôn ngữ sang JSON. 
  Luôn trả về JSON hợp lệ theo schema sau: ${JSON.stringify(AI_SCHEMA)}. 
  Trường "data" luôn là mảng (array). 
  Nếu người dùng nhập nhiều đối tượng, hãy thêm nhiều object trong mảng. 
  Khi user hỏi "tính toán / tổng / trung bình / cao nhất", hãy sinh JSON chứa loại phép tính (sum | avg | max | min | count) trong trường "aggregate". 
  Không giải thích thêm.

  Ngữ cảnh:
  - Ngày hiện tại: ${today}
  - Nếu user nói "hôm nay", thay bằng ${today}.
  - Nếu user nói "hôm qua", thay bằng ngày trước đó.
  - Nếu user nói "tuần này", thay bằng khoảng từ Thứ Hai đến hôm nay.
  - Nếu user nói "tháng này", thay bằng khoảng từ ngày 1 đến ${today}.
  - Nếu user nói "tháng trước", thay bằng khoảng từ ngày 1 đến cuối tháng trước.

  Dữ liệu người dùng hiện tại: ${JSON.stringify(userData)}
  `;

  const result = await model.generateContent(systemInstruction + "\n" + prompt);
  const response = await result.response;
  const text = response.text();

  // Extract JSON string from markdown code block
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const jsonResponse = JSON.parse(jsonMatch[1]);
      return jsonResponse;
    } catch (error) {
      console.error("Error parsing extracted JSON:", error);
      return { action: "error", message: "Could not parse AI response after extraction." };
    }
  } else {
    console.error("No JSON markdown block found in AI response:", text);
    return { action: "error", message: "No JSON block" };
  }
}

export async function followUpWithAI(prompt: string, lastResult: any[]): Promise<string> {
  const systemInstruction = `
  Bạn là trợ lý giải thích dữ liệu đã có.
  Dữ liệu giao dịch: ${JSON.stringify(lastResult)}.
  Người dùng hỏi: "${prompt}".
  Hãy trả lời ngắn gọn, tiếng Việt tự nhiên.
  `;
  const result = await model.generateContent(systemInstruction);
  return result.response.text();
}
