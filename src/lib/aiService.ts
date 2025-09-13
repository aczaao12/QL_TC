// src/lib/aiService.ts
import { database } from './firebase';
import { ref, get, child } from 'firebase/database';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(endYear, endMonth, endDay);
    endDate.setHours(23, 59, 59, 999);
  } else if (fromDayToNowMatch) {
    const startDay = parseInt(fromDayToNowMatch[1], 10);
    const startMonth = fromDayToNowMatch[2] ? parseInt(fromDayToNowMatch[2], 10) - 1 : now.getMonth();
    const startYear = fromDayToNowMatch[3] ? parseInt(fromDayToNowMatch[3], 10) : now.getFullYear();

    startDate = new Date(startYear, startMonth, startDay);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(); // End date is today
    endDate.setHours(23, 59, 59, 999);
  } else if (fromMonthToNowMatch) {
    const startMonth = parseInt(fromMonthToNowMatch[1], 10) - 1;
    const startYear = fromMonthToNowMatch[2] ? parseInt(fromMonthToNowMatch[2], 10) : now.getFullYear();

    startDate = new Date(startYear, startMonth, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(); // End date is today
    endDate.setHours(23, 59, 59, 999);
  } else if (fromMonthToMonthMatch) {
    const startMonth = parseInt(fromMonthToMonthMatch[1], 10) - 1;
    const startYear = fromMonthToMonthMatch[2] ? parseInt(fromMonthToMonthMatch[2], 10) : now.getFullYear();

    const endMonth = parseInt(fromMonthToMonthMatch[3], 10) - 1;
    const endYear = fromMonthToMonthMatch[4] ? parseInt(fromMonthToMonthMatch[4], 10) : now.getFullYear();

    startDate = new Date(startYear, startMonth, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(endYear, endMonth + 1, 0); // Last day of the end month
    endDate.setHours(23, 59, 59, 999);
  } else if (fromYearToNowMatch) {
    const startYear = parseInt(fromYearToNowMatch[1], 10);

    startDate = new Date(startYear, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(); // End date is today
    endDate.setHours(23, 59, 59, 999);
  } else if (fromYearToYearMatch) {
    const startYear = parseInt(fromYearToYearMatch[1], 10);
    const endYear = parseInt(fromYearToYearMatch[2], 10);

    startDate = new Date(startYear, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(endYear, 11, 31); // Last day of the end year
    endDate.setHours(23, 59, 59, 999);
  } else if (period.includes('hôm nay') || period.includes('today')) {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (period.includes('tuần này') || period.includes('this week')) {
    const day = now.getDay();
    startDate = new Date(now.setDate(now.getDate() - day));
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.setDate(now.getDate() - day + 6));
    endDate.setHours(23, 59, 59, 999);
  } else if (period.includes('tháng này') || period.includes('this month')) {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (period.includes('năm nay') || period.includes('this year')) {
    startDate = new Date(now.getFullYear(), 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31);
    endDate.setHours(23, 59, 59, 999);
  }
  return { startDate, endDate };
};

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
      customStartDate.setHours(0, 0, 0, 0);
      customEndDate = new Date(endYear, endMonth, endDay);
      customEndDate.setHours(23, 59, 59, 999);
    } else if (fromDayToNowMatch) {
      period = 'custom_range';
      const now = new Date();
      const startDay = parseInt(fromDayToNowMatch[1], 10);
      const startMonth = fromDayToNowMatch[2] ? parseInt(fromDayToNowMatch[2], 10) - 1 : now.getMonth();
      const startYear = fromDayToNowMatch[3] ? parseInt(fromDayToNowMatch[3], 10) : now.getFullYear();

      customStartDate = new Date(startYear, startMonth, startDay);
      customStartDate.setHours(0, 0, 0, 0);
      customEndDate = new Date(); // End date is today
      customEndDate.setHours(23, 59, 59, 999);
    } else if (fromMonthToNowMatch) {
      period = 'custom_range';
      const now = new Date();
      const startMonth = parseInt(fromMonthToNowMatch[1], 10) - 1;
      const startYear = fromMonthToNowMatch[2] ? parseInt(fromMonthToNowMatch[2], 10) : now.getFullYear();

      customStartDate = new Date(startYear, startMonth, 1);
      customStartDate.setHours(0, 0, 0, 0);
      customEndDate = new Date(); // End date is today
      customEndDate.setHours(23, 59, 59, 999);
    } else if (fromMonthToMonthMatch) {
      period = 'custom_range';
      const now = new Date();
      const startMonth = parseInt(fromMonthToMonthMatch[1], 10) - 1;
      const startYear = fromMonthToMonthMatch[2] ? parseInt(fromMonthToMonthMatch[2], 10) : now.getFullYear();

      const endMonth = parseInt(fromMonthToMonthMatch[3], 10) - 1;
      const endYear = fromMonthToMonthMatch[4] ? parseInt(fromMonthToMonthMatch[4], 10) : now.getFullYear();

      customStartDate = new Date(startYear, startMonth, 1);
      customStartDate.setHours(0, 0, 0, 0);
      customEndDate = new Date(endYear, endMonth + 1, 0); // Last day of the end month
      customEndDate.setHours(23, 59, 59, 999);
    } else if (fromYearToNowMatch) {
      period = 'custom_range';
      const now = new Date();
      const startYear = parseInt(fromYearToNowMatch[1], 10);

      customStartDate = new Date(startYear, 0, 1);
      customStartDate.setHours(0, 0, 0, 0);
      customEndDate = new Date(); // End date is today
      customEndDate.setHours(23, 59, 59, 999);
    } else if (fromYearToYearMatch) {
      period = 'custom_range';
      const now = new Date();
      const startYear = parseInt(fromYearToYearMatch[1], 10);
      const endYear = parseInt(fromYearToYearMatch[2], 10);

      customStartDate = new Date(startYear, 0, 1);
      customStartDate.setHours(0, 0, 0, 0);
      customEndDate = new Date(endYear, 11, 31); // Last day of the end year
      customEndDate.setHours(23, 59, 59, 999);
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
      const { startDate, endDate } = (period === 'custom_range' && customStartDate && customEndDate)
        ? { startDate: customStartDate, endDate: customEndDate } 
        : getPeriodDates(period, lowerCasePrompt);

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

// Function to handle transaction adding via Gemini
const handleTransactionAdding = async (prompt: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const timezoneOffset = -now.getTimezoneOffset();
    const sign = timezoneOffset >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(timezoneOffset) / 60);
    const minutes = Math.abs(timezoneOffset) % 60;
    const timezone = `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const commonCategories = {
      expense: ['Ăn uống', 'Đi lại', 'Nhà cửa', 'Tiện ích', 'Mua sắm', 'Giải trí', 'Sức khỏe', 'Giáo dục', 'Khác'],
      income: ['Lương', 'Thưởng', 'Đầu tư', 'Quà tặng', 'Khác'],
    };

    const geminiPrompt = `You are an expense and income tracking assistant. The current date is ${currentDate} and the timezone is ${timezone}. Analyze the following user message. If it contains information about one or more expenses or incomes, extract them and respond ONLY with a JSON array of objects. Each object in the array should be in the format: 
    [
      {
        "type": "expense" | "income",
        "name": "<string>",
        "category": "<string>",
        "amount": <number>,
        "date": "YYYY-MM-DD" (if specified, otherwise today's date)
      },
      // ... more objects if multiple transactions
    ]
    If the message is not about expenses or incomes, or if you cannot extract all necessary details, respond with a natural language answer. User message: "${prompt}"`;

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
        return { responseText: `Understood! I'll record: ${summaryResponse.trim()}`, expenseData: validTransactions };
      } else {
        return { responseText: geminiText, expenseData: null };
      }
    } catch (jsonError) {
      return { responseText: geminiText, expenseData: null };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return { responseText: 'Sorry, I am having trouble connecting to the AI at the moment.', expenseData: null };
  }
};

// Data-driven routing model
const intentRoutes = [
  {
    keywords: ['chi bao nhiêu', 'thu bao nhiêu', 'tổng chi', 'tổng thu', 'liệt kê', 'khoản chi', 'khoản thu', 'tất cả', 'từ ngày', 'từ tháng', 'từ năm'],
    action: handleTransactionQuery,
  },
  {
    keywords: ['hello', 'xin chào', 'hi'],
    action: async () => ({ responseText: 'Hello there! How can I help you with your expenses and income today?', expenseData: null }),
  },
  {
    keywords: ['thêm chi', 'ghi lại chi', 'thêm thu', 'ghi lại thu', 'chi', 'thu'],
    action: handleTransactionAdding,
  }
];

export async function callGeminiAPI(prompt: string, userId: string): Promise<{ responseText: string; expenseData: TransactionData[] | null }> {
  console.log(`Calling Gemini API with prompt: "${prompt}" for user: ${userId}`);
  const lowerCasePrompt = prompt.toLowerCase();

  // Find a matching intent based on keywords
  for (const route of intentRoutes) {
    if (route.keywords.some(keyword => lowerCasePrompt.includes(keyword))) {
      return await route.action(prompt, userId);
    }
  }

  // Fallback to a generic Gemini call if no specific intent is found
  return handleTransactionAdding(prompt);
}