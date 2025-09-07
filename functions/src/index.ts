import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Access your API key as an environment variable
const API_KEY = functions.config().gemini.api_key;
const genAI = new GoogleGenerativeAI(API_KEY);

export const parseTransaction = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated (optional, but good practice)
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  // }

  const text = (data as unknown as { text: string }).text;

  if (!text) {
    throw new functions.https.HttpsError('invalid-argument', 'The \'text\' parameter is required.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

    Text to parse: "${text}"
    JSON: 
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text().trim();

    // Attempt to parse the JSON. The model might return extra text, so we try to extract the JSON part.
    const jsonMatch = jsonText.match(/\{.*\}/s);
    if (jsonMatch && jsonMatch[0]) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new functions.https.HttpsError('internal', 'Could not parse JSON from AI response.', jsonText);
    }

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    throw new functions.https.HttpsError('internal', 'Failed to parse transaction with AI.', error.message || error.toString());
  }
});

export const queryAI = functions.https.onCall(async (data, context) => {
  const userQuery = (data as unknown as { query: string }).query;
  const transactionData = (data as unknown as { transactions: any[] }).transactions; // Array of GiaoDich objects

  if (!userQuery) {
    throw new functions.https.HttpsError('invalid-argument', 'The \'query\' parameter is required.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let prompt = `You are an AI assistant for personal money management. Analyze the following financial transaction data and answer the user's query. Provide insights and suggestions based on the data. If the query is about spending habits, suggest ways to save money or optimize spending.

Financial Transaction Data (JSON array):
${JSON.stringify(transactionData, null, 2)}

User Query: "${userQuery}"

AI Response:`

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();

  } catch (error: any) {
    console.error("Error calling Gemini API for query:", error);
    throw new functions.https.HttpsError('internal', 'Failed to get AI response for query.', error.message || error.toString());
  }
});
