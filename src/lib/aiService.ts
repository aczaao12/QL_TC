// src/lib/aiService.ts
import { database } from './firebase';
import { ref, get, child, set, push } from 'firebase/database';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addExpense as addExpenseToIndexedDB } from './indexedDb';
import { processLocalPrompt } from './localNlpService';

// Access your API key (replace with your actual API key or environment variable)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('VITE_GEMINI_API_KEY is not set in the environment variables.');
  // Optionally, throw an error or handle this case gracefully
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Helper function to validate YYYY-MM-DD format
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regex)) return false;
  const date = new Date(dateString);
  const timestamp = date.getTime();
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) return false;
  return date.toISOString().startsWith(dateString);
}

interface TransactionData {
  type: 'expense' | 'income';
  name: string;
  category: string;
  amount: number;
  date: string;
}

// Function to fetch and process transactions
const fetchAndProcessTransactions = async (userId: string): Promise<TransactionData[] | null> => {
  try {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `users/${userId}/transactions`));
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as TransactionData[];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error querying Firebase for transactions:', error);
    return null;
  }
};

// Helper to get start/end dates for filtering
const getPeriodDates = (period: string, prompt: string) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  
  const fromDayToDayMatch = prompt.match(/từ ngày (\d{1,2})(?: tháng (\d{1,2}))?(?: năm (\d{4}))? đến ngày (\d{1,2})(?: tháng (\d{1,2}))?(?: năm (\d{4}))?/i);
  const fromDayToNowMatch = prompt.match(/từ ngày (\d{1,2})(?: tháng (\d{1,2}))?(?: năm (\d{4}))? đến nay/i);
  const fromMonthToNowMatch = prompt.match(/từ tháng (\d{1,2})(?: năm (\d{4}))? đến nay/i);
  const fromMonthToMonthMatch = prompt.match(/từ tháng (\d{1,2})(?: năm (\d{4}))? đến tháng (\d{1,2})(?: năm (\d{4}))?/i);
  const fromYearToNowMatch = prompt.match(/từ năm (\d{4}) đến nay/i);
  const fromYearToYearMatch = prompt.match(/từ năm (\d{4}) đến năm (\d{4})/i);

  if (fromDayToDayMatch) {
    const startDay = parseInt(fromDayToDayMatch[1], 10);
    const startMonth = fromDayToDayMatch[2] ? parseInt(fromDayToDayMatch[2], 10) - 1 : now.getMonth();
    const startYear = fromDayToDayMatch[3] ? parseInt(fromDayToDayMatch[3], 10) : now.getFullYear();

    const endDay = parseInt(fromDayToDayMatch[4], 10);
    const endMonth = fromDayToDayMatch[5] ? parseInt(fromDayToDayMatch[5], 10) - 1 : now.getMonth();
    const endYear = fromDayToDayMatch[6] ? parseInt(fromDayToDayMatch[6], 10) : now.getFullYear();

    startDate = new Date(startYear, startMonth, startDay);
    endDate = new Date(endYear, endMonth, endDay);
  } else if (fromDayToNowMatch) {
    const startDay = parseInt(fromDayToNowMatch[1], 10);
    const startMonth = fromDayToNowMatch[2] ? parseInt(fromDayToNowMatch[2], 10) - 1 : now.getMonth();
    const startYear = fromDayToNowMatch[3] ? parseInt(fromDayToNowMatch[3], 10) : now.getFullYear();

    startDate = new Date(startYear, startMonth, startDay);
    endDate = new Date(); // End date is today
  } else if (fromMonthToNowMatch) {
    const startMonth = parseInt(fromMonthToNowMatch[1], 10) - 1;
    const startYear = fromMonthToNowMatch[2] ? parseInt(fromMonthToNowMatch[2], 10) : now.getFullYear();

    startDate = new Date(startYear, startMonth, 1);
    endDate = new Date(); // End date is today
  } else if (fromMonthToMonthMatch) {
    const startMonth = parseInt(fromMonthToMonthMatch[1], 10) - 1;
    const startYear = fromMonthToMonthMatch[2] ? parseInt(fromMonthToMonthMatch[2], 10) : now.getFullYear();

    const endMonth = parseInt(fromMonthToMonthMatch[3], 10) - 1;
    const endYear = fromMonthToMonthMatch[4] ? parseInt(fromMonthToMonthMatch[4], 10) : now.getFullYear();

    startDate = new Date(startYear, startMonth, 1);
    endDate = new Date(endYear, endMonth + 1, 0); // Last day of the end month
  } else if (fromYearToNowMatch) {
    const startYear = parseInt(fromYearToNowMatch[1], 10);

    startDate = new Date(startYear, 0, 1);
    endDate = new Date(); // End date is today
  } else if (fromYearToYearMatch) {
    const startYear = parseInt(fromYearToYearMatch[1], 10);
    const endYear = parseInt(fromYearToYearMatch[2], 10);

    startDate = new Date(startYear, 0, 1);
    endDate = new Date(endYear, 11, 31); // Last day of the end year
  } else if (period.includes('hôm nay') || period.includes('today')) {
    // startDate and endDate are already today's date
  } else if (period.includes('tuần này') || period.includes('this week')) {
    const day = now.getDay();
    startDate = new Date(now.setDate(now.getDate() - day));
    endDate = new Date(now.setDate(now.getDate() - day + 6));
  } else if (period.includes('tháng này') || period.includes('this month')) {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period.includes('năm nay') || period.includes('this year')) {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31);
  }
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
};

// Helper function to save a transaction to Firebase and IndexedDB
async function saveTransactionToDatabase(transaction: TransactionData, userId: string) {
  // Save to Firebase
  const newPostKey = push(child(ref(database), `users/${userId}/transactions`)).key;
  if (newPostKey) {
    await set(ref(database, `users/${userId}/transactions/${newPostKey}`), transaction);
  }

  // Save to IndexedDB
  await addExpenseToIndexedDB(transaction);
}

// Placeholder for local transaction adding
async function addTransactionLocally(transaction: TransactionData, userId: string): Promise<{ responseText: string; expenseData: TransactionData[] | null }> {
  await saveTransactionToDatabase(transaction, userId); // Call the new centralized saving function
  
  // Use Gemini to create a friendly, natural language response
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});
  const confirmationPrompt = `Generate a friendly and concise confirmation message in Vietnamese for a recorded transaction.
  The transaction details are:
  - Type: ${transaction.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
  - Name: ${transaction.name}
  - Amount: ${transaction.amount.toLocaleString()} VND
  - Date: ${new Date(transaction.date).toLocaleDateString()}
  The message should sound like a helpful assistant and should not include any technical details.`;

  try {
    const result = await model.generateContent(confirmationPrompt);
    const responseText = result.response.text();
    return { responseText: responseText, expenseData: [transaction] };
  } catch (error) {
    console.error('Error generating confirmation message with Gemini:', error);
    // Fallback to a simple local message
    return { responseText: `Đã ghi nhận giao dịch cục bộ: ${transaction.name} ${transaction.amount.toLocaleString()} VND.`, expenseData: [transaction] };
  }
}

// Function to handle local transaction querying by calling the main transaction query handler
async function queryTransactionsLocally(data: any, userId: string): Promise<{ responseText: string; expenseData: TransactionData[] | null }> {
  let queryPrompt = '';
  if (data && data.period) {
    queryPrompt = `liệt kê giao dịch ${data.period}`;
  } else if (data && data.startDate && data.endDate) {
    // Assuming startDate and endDate are in YYYY-MM-DD format
    queryPrompt = `liệt kê giao dịch từ ngày ${data.startDate} đến ngày ${data.endDate}`;
  } else {
    queryPrompt = 'liệt kê tất cả giao dịch'; // Default if no specific period is provided
  }
  return await handleTransactionQuery(queryPrompt, userId);
}

// Function to handle transaction queries
const handleTransactionQuery = async (prompt: string, userId: string) => {
  const lowerCasePrompt = prompt.toLowerCase();
  const transactions = await fetchAndProcessTransactions(userId);
  if (transactions === null) {
    return { responseText: 'Sorry, I had trouble retrieving your transactions from the cloud.', expenseData: null };
  } else if (transactions.length === 0) {
    return { responseText: 'You have no recorded transactions in Firebase.', expenseData: null };
  } else {
    let filteredTransactions = transactions;
    let period = 'all';
    let periodText = '';
    let customStartDate: Date | undefined;
    let customEndDate: Date | undefined;

    const fromDayToDayMatch = lowerCasePrompt.match(/từ ngày (\d{1,2})(?: tháng (\d{1,2}))?(?: năm (\d{4}))? đến ngày (\d{1,2})(?: tháng (\d{1,2}))?(?: năm (\d{4}))?/i);
    const fromDayToNowMatch = lowerCasePrompt.match(/từ ngày (\d{1,2})(?: tháng (\d{1,2}))?(?: năm (\d{4}))? đến nay/i);
    const fromMonthToNowMatch = lowerCasePrompt.match(/từ tháng (\d{1,2})(?: năm (\d{4}))? đến nay/i);
    const fromMonthToMonthMatch = lowerCasePrompt.match(/từ tháng (\d{1,2})(?: năm (\d{4}))? đến tháng (\d{1,2})(?: năm (\d{4}))?/i);
    const fromYearToNowMatch = lowerCasePrompt.match(/từ năm (\d{4}) đến nay/i);
    const fromYearToYearMatch = lowerCasePrompt.match(/từ năm (\d{4}) đến năm (\d{4})/i);

    if (fromDayToDayMatch) {
      period = 'custom_range';
      const now = new Date();
      const startDay = parseInt(fromDayToDayMatch[1], 10);
      const startMonth = fromDayToDayMatch[2] ? parseInt(fromDayToDayMatch[2], 10) - 1 : now.getMonth();
      const startYear = fromDayToDayMatch[3] ? parseInt(fromDayToDayMatch[3], 10) : now.getFullYear();

      const endDay = parseInt(fromDayToDayMatch[4], 10);
      const endMonth = fromDayToDayMatch[5] ? parseInt(fromDayToDayMatch[5], 10) - 1 : now.getMonth();
      const endYear = fromDayToDayMatch[6] ? parseInt(fromDayToDayMatch[6], 10) : now.getFullYear();

      customStartDate = new Date(startYear, startMonth, startDay);
      customEndDate = new Date(endYear, endMonth, endDay);
    } else if (fromDayToNowMatch) {
      period = 'custom_range';
      const now = new Date();
      const startDay = parseInt(fromDayToNowMatch[1], 10);
      const startMonth = fromDayToNowMatch[2] ? parseInt(fromDayToNowMatch[2], 10) - 1 : now.getMonth();
      const startYear = fromDayToNowMatch[3] ? parseInt(fromDayToNowMatch[3], 10) : now.getFullYear();

      customStartDate = new Date(startYear, startMonth, startDay);
      customEndDate = new Date(); // End date is today
    } else if (fromMonthToNowMatch) {
      period = 'custom_range';
      const now = new Date();
      const startMonth = parseInt(fromMonthToNowMatch[1], 10) - 1;
      const startYear = fromMonthToNowMatch[2] ? parseInt(fromMonthToNowMatch[2], 10) : now.getFullYear();

      customStartDate = new Date(startYear, startMonth, 1);
      customEndDate = new Date(); // End date is today
    } else if (fromMonthToMonthMatch) {
      period = 'custom_range';
      const now = new Date();
      const startMonth = parseInt(fromMonthToMonthMatch[1], 10) - 1;
      const startYear = fromMonthToMonthMatch[2] ? parseInt(fromMonthToMonthMatch[2], 10) : now.getFullYear();

      const endMonth = parseInt(fromMonthToMonthMatch[3], 10) - 1;
      const endYear = fromMonthToMonthMatch[4] ? parseInt(fromMonthToMonthMatch[4], 10) : now.getFullYear();

      customStartDate = new Date(startYear, startMonth, 1);
      customEndDate = new Date(endYear, endMonth + 1, 0); // Last day of the end month
    } else if (fromYearToNowMatch) {
      period = 'custom_range';
      const startYear = parseInt(fromYearToNowMatch[1], 10);

      customStartDate = new Date(startYear, 0, 1);
      customEndDate = new Date(); // End date is today
    } else if (fromYearToYearMatch) {
      period = 'custom_range';
      const startYear = parseInt(fromYearToYearMatch[1], 10);
      const endYear = parseInt(fromYearToYearMatch[2], 10);

      customStartDate = new Date(startYear, 0, 1);
      customEndDate = new Date(endYear, 11, 31); // Last day of the end year
    } else if (lowerCasePrompt.includes('hôm nay') || lowerCasePrompt.includes('today')) {
      period = 'hôm nay';
    } else if (lowerCasePrompt.includes('tuần này') || lowerCasePrompt.includes('this week')) {
      period = 'tuần này';
    } else if (lowerCasePrompt.includes('tháng này') || lowerCasePrompt.includes('this month')) {
      period = 'tháng này';
    } else if (lowerCasePrompt.includes('năm nay') || lowerCasePrompt.includes('this year')) {
      period = 'năm nay';
    }

    if (period !== 'all') {
      const { startDate, endDate } = getPeriodDates(period, lowerCasePrompt);
      filteredTransactions = transactions.filter(trans => {
        const transDate = new Date(trans.date);
        return transDate >= startDate && transDate <= endDate;
      });
    }

    if (filteredTransactions.length === 0) {
      let noTransactionMessage = 'Không có giao dịch nào được ghi nhận';
      if (period === 'custom_range' && customStartDate && customEndDate) {
        let startText = `ngày ${customStartDate.getDate()} tháng ${customStartDate.getMonth() + 1} năm ${customStartDate.getFullYear()}`;
        let endText = `ngày ${customEndDate.getDate()} tháng ${customEndDate.getMonth() + 1} năm ${customEndDate.getFullYear()}`;
        if (fromMonthToNowMatch || fromMonthToMonthMatch) {
          startText = `tháng ${customStartDate.getMonth() + 1} năm ${customStartDate.getFullYear()}`;
          if (fromMonthToMonthMatch) {
            endText = `tháng ${customEndDate.getMonth() + 1} năm ${customEndDate.getFullYear()}`;
          } else {
            endText = `nay`;
          }
        } else if (fromYearToNowMatch || fromYearToYearMatch) {
          startText = `năm ${customStartDate.getFullYear()}`;
          if (fromYearToYearMatch) {
            endText = `năm ${customEndDate.getFullYear()}`;
          } else {
            endText = `nay`;
          }
        }
        noTransactionMessage += ` từ ${startText} đến ${endText}.`;
      } else if (period !== 'all') {
        noTransactionMessage += ` cho ${period}.`;
      } else {
        noTransactionMessage += '.';
      }
      return { responseText: noTransactionMessage, expenseData: null };
    } else {
      let totalSpent = 0;
      let totalIncome = 0;
      const expenseList: string[] = [];
      const incomeList: string[] = [];

      filteredTransactions.forEach((trans: TransactionData) => {
        if (trans.type === 'expense') {
          totalSpent += trans.amount;
          expenseList.push(`${trans.name} (${trans.category}): ${trans.amount.toLocaleString()} VND`);
        } else if (trans.type === 'income') {
          totalIncome += trans.amount;
          incomeList.push(`${trans.name} (${trans.category}): ${trans.amount.toLocaleString()} VND`);
        }
      });

      let periodText = '';
      if (period === 'custom_range' && customStartDate && customEndDate) {
        let startText = `ngày ${customStartDate.getDate()} tháng ${customStartDate.getMonth() + 1} năm ${customStartDate.getFullYear()}`;
        let endText = `ngày ${customEndDate.getDate()} tháng ${customEndDate.getMonth() + 1} năm ${customEndDate.getFullYear()}`;
        if (fromMonthToNowMatch || fromMonthToMonthMatch) {
          startText = `tháng ${customStartDate.getMonth() + 1} năm ${customStartDate.getFullYear()}`;
          if (fromMonthToMonthMatch) {
            endText = `tháng ${customEndDate.getMonth() + 1} năm ${customEndDate.getFullYear()}`;
          } else {
            endText = `nay`;
          }
        } else if (fromYearToNowMatch || fromYearToYearMatch) {
          startText = `năm ${customStartDate.getFullYear()}`;
          if (fromYearToYearMatch) {
            endText = `năm ${customEndDate.getFullYear()}`;
          } else {
            endText = `nay`;
          }
        }
        periodText = `từ ${startText} đến ${endText}`;
      } else if (period !== 'all') {
        periodText = period;
      }

      if (lowerCasePrompt.includes('liệt kê') || lowerCasePrompt.includes('tất cả')) {
        let listResponse = `Các giao dịch ${periodText ? periodText : 'của bạn'}:
`;
        if (expenseList.length > 0) {
          listResponse += `Chi tiêu:
- ${expenseList.join(' \n- ')}
`;
        }
        if (incomeList.length > 0) {
          listResponse += `Thu nhập:
- ${incomeList.join(' \n- ')}
`;
        }
        if (expenseList.length === 0 && incomeList.length === 0) {
          listResponse = `Không có giao dịch nào được ghi lại cho ${periodText ? periodText : 'khoảng thời gian này'}.`;
        }
        return { responseText: listResponse.trim(), expenseData: null };
      } else if (lowerCasePrompt.includes('chi bao nhiêu') || lowerCasePrompt.includes('tổng chi')) {
        return { responseText: `Tổng chi tiêu ${periodText ? periodText : 'của bạn'}: ${totalSpent.toLocaleString()} VND.`, expenseData: null };
      } else if (lowerCasePrompt.includes('thu bao nhiêu') || lowerCasePrompt.includes('tổng thu')) {
        return { responseText: `Tổng thu nhập ${periodText ? periodText : 'của bạn'}: ${totalIncome.toLocaleString()} VND.`, expenseData: null };
      } else {
        return { responseText: `Tổng chi tiêu ${periodText ? periodText : 'của bạn'}: ${totalSpent.toLocaleString()} VND. Tổng thu nhập: ${totalIncome.toLocaleString()} VND.`, expenseData: null };
      }
    }
  }
};


// New function to handle financial analysis requests
const handleFinancialAnalysis = async (prompt: string): Promise<{ responseText: string; expenseData: TransactionData[] | null }> => {
  // Use Gemini to provide a detailed financial analysis
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});
  const analysisPrompt = `Dựa trên dữ liệu giao dịch của người dùng (từ Firebase), hãy tạo một báo cáo phân tích tài chính ngắn gọn cho câu lệnh sau: "${prompt}".
  Phân tích này nên bao gồm:
  - Tổng quan về chi tiêu và thu nhập.
  - Phân tích chi tiêu theo từng danh mục.
  - Đưa ra những lời khuyên hữu ích để tối ưu chi tiêu trong tháng tới.
  Sử dụng ngôn ngữ thân thiện, dễ hiểu như một trợ lý tài chính.`;

  try {
    // This is a placeholder for the full implementation
    // You would fetch user data here and pass it to Gemini for a real analysis
    const result = await model.generateContent(analysisPrompt);
    const responseText = result.response.text();
    return { responseText: responseText, expenseData: null };
  } catch (error) {
    console.error('Error generating financial analysis with Gemini:', error);
    return { responseText: 'Xin lỗi, tôi gặp sự cố khi tạo báo cáo phân tích tài chính.', expenseData: null };
  }
};

// Function to handle transaction adding via Gemini
const handleTransactionAdding = async (prompt: string, userId: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const timezoneOffset = -now.getTimezoneOffset();
    const sign = timezoneOffset >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(timezoneOffset) / 60);
    const minutes = Math.abs(timezoneOffset) % 60;
    const timezone = `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const geminiPrompt = `You are an expense and income tracking assistant. The current date is ${currentDate} and the timezone is ${timezone}.
    Your primary goal is to extract expense or income information from user messages and respond ONLY with a JSON array of objects.
    Each object in the array MUST be in the following format:
    [
      {
        "type": "expense" | "income",
        "name": "<string>", // A brief description of the item/service
        "category": "<string>", // e.g., "Ăn uống", "Đi lại", "Mua sắm", "Lương", "Thưởng"
        "amount": <number>, // The amount in VND
        "date": "YYYY-MM-DD" // If specified in the message, otherwise use today's date
      },
      // ... more objects if multiple transactions
    ]
    If the message does NOT contain clear expense or income information that can be fully extracted into the JSON format, then and ONLY then, respond with a natural language answer.
    
    Here are some examples of what to return for different user prompts:
    User: "Hôm nay tôi chi 50k ăn trưa"
    Assistant:
    \`\`\`json
    [
      {
        "type": "expense",
        "name": "Ăn trưa",
        "category": "Ăn uống",
        "amount": 50000,
        "date": "${currentDate}"
      }
    ]
    \`\`\`

    User: "Ngày 19/2/2022 tôi chi 200 tr mua xe"
    Assistant:
    \`\`\`json
    [
      {
        "type": "expense",
        "name": "Mua xe",
        "category": "Đi lại",
        "amount": 200000000,
        "date": "2022-02-19"
      }
    ]
    \`\`\`

    User: "Tôi nhận lương 10 triệu"
    Assistant:
    \`\`\`json
    [
      {
        "type": "income",
        "name": "Lương tháng",
        "category": "Lương",
        "amount": 10000000,
        "date": "${currentDate}"
      }
    ]
    \`\`\`
    
    User: "Hôm nay tôi chi 10k bánh, 2k tiền gửi xe, 5k bị rơi mất. 20k tiền nước"
    Assistant:
    \`\`\`json
    [
      {
        "type": "expense",
        "name": "Bánh ngọt",
        "category": "Ăn uống",
        "amount": 10000,
        "date": "${currentDate}"
      },
      {
        "type": "expense",
        "name": "Gửi xe",
        "category": "Đi lại",
        "amount": 2000,
        "date": "${currentDate}"
      },
      {
        "type": "expense",
        "name": "Bị rơi mất",
        "category": "Khác",
        "amount": 5000,
        "date": "${currentDate}"
      },
      {
        "type": "expense",
        "name": "Tiền nước",
        "category": "Ăn uống",
        "amount": 20000,
        "date": "${currentDate}"
      }
    ]
    \`\`\`

    User message: "${prompt}"`;

    const result = await model.generateContent(geminiPrompt);
    const response = await result.response;
    const geminiText = response.text();

    const jsonMatch = geminiText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = jsonMatch ? jsonMatch[1] : geminiText.trim();

    try {
      const parsedResponse = JSON.parse(jsonString);
      const transactionsToProcess: any[] = Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
      const validTransactions: TransactionData[] = [];
      let summaryResponse = '';

      transactionsToProcess.forEach((item) => {
        if ((item.type === 'expense' || item.type === 'income') && item.name && item.category && item.amount) {
          let transactionDate = item.date;
          if (!transactionDate || !isValidDate(transactionDate)) {
            transactionDate = currentDate;
          }

          validTransactions.push({
            type: item.type,
            name: item.name,
            category: item.category,
            amount: item.amount,
            date: transactionDate,
          });

          summaryResponse += `${item.type === 'expense' ? 'chi tiêu' : 'thu nhập'} ${item.amount.toLocaleString()} VND cho "${item.name}" (${item.category}) vào ngày ${new Date(transactionDate).toLocaleDateString()}. `;
        }
      });

      if (validTransactions.length > 0) {
        for (const transaction of validTransactions) {
          await saveTransactionToDatabase(transaction, userId); // Call the new centralized saving function
        }
        return { responseText: `Understood! I've recorded: ${summaryResponse.trim()}`, expenseData: validTransactions };
      } else {
        return { responseText: geminiText, expenseData: null };
      }
    } catch (jsonError) {
      console.error('Error parsing JSON from Gemini, returning raw text:', jsonError);
      return { responseText: geminiText, expenseData: null };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return { responseText: 'Xin lỗi, tôi gặp sự cố khi kết nối với AI. Vui lòng thử lại sau.', expenseData: null };
  }
};

export async function callGeminiAPI(prompt: string, userId: string): Promise<{ responseText: string; expenseData: TransactionData[] | null }> {
  console.log(`Calling Gemini API with prompt: "${prompt}" for user: ${userId}`);
  const lowerCasePrompt = prompt.toLowerCase();
  
  // 1. Check for complex requests first and route them directly to Gemini
  const isMultiTransaction = lowerCasePrompt.includes(' và ') || lowerCasePrompt.includes(' cùng ') || lowerCasePrompt.split(',').length > 1 || prompt.match(/\b\d+(\.\d+)?\s*(k|nghìn|triệu|tr)\b/g)?.length > 1;
  const isFinancialAnalysis = lowerCasePrompt.includes('phân tích') || lowerCasePrompt.includes('thống kê') || lowerCasePrompt.includes('báo cáo');

  if (isMultiTransaction) {
    return await handleTransactionAdding(prompt, userId);
  }
  
  if (isFinancialAnalysis) {
    return await handleFinancialAnalysis(prompt);
  }

  // 2. If not a complex request, try local NLP
  const localNlpResult = processLocalPrompt(prompt);

  // Intent: ADD TRANSACTION (SINGLE OBJECT)
  if (localNlpResult.intent === 'add_expense' || localNlpResult.intent === 'add_income') {
    if (localNlpResult.data?.type && localNlpResult.data?.amount) {
      const transactionToAdd: TransactionData = {
        type: localNlpResult.data.type,
        name: localNlpResult.data.name || 'Chưa phân loại',
        category: localNlpResult.data.category || 'Chưa phân loại',
        amount: localNlpResult.data.amount,
        date: localNlpResult.data.date || new Date().toISOString().split('T')[0],
      };
      return await addTransactionLocally(transactionToAdd, userId);
    }
  }

  // Intent: QUERY EXPENSE/INCOME
  if (localNlpResult.intent === 'query_expense') {
    return await queryTransactionsLocally(localNlpResult.data, userId);
  }
  
  // Intent: GREETING
  if (localNlpResult.intent === 'greeting') {
    return { responseText: 'Chào bạn! Tôi có thể giúp gì cho bạn hôm nay?', expenseData: null };
  }

  // 3. Fallback to Gemini for unrecognized commands
  return await handleTransactionAdding(prompt, userId);
}
