import nlp from 'compromise';

interface LocalNlpResult {
  intent: 'add_expense' | 'query_expense' | 'greeting' | null;
  data: {
    type?: 'expense' | 'income';
    name?: string;
    category?: string;
    amount?: number;
    date?: string;
    period?: string;
    startDate?: string; // For custom date ranges
    endDate?: string;  // For custom date ranges
  } | null;
  originalPrompt: string;
}

// Helper to convert date strings to YYYY-MM-DD
function formatDate(day: string, month: string, year?: string): string {
  const currentYear = new Date().getFullYear().toString();
  return `${year || currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function processLocalPrompt(prompt: string): LocalNlpResult {
  const doc = nlp(prompt.toLowerCase());
  const result: LocalNlpResult = { intent: null, data: null, originalPrompt: prompt };
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];

  // Common categories for basic mapping
  const commonCategories = {
    'ăn uống': ['ăn', 'uống', 'trưa', 'sáng', 'tối', 'cafe', 'nhà hàng', 'quán'],
    'đi lại': ['xe', 'xăng', 'bus', 'taxi', 'đi lại', 'tàu', 'máy bay'],
    'mua sắm': ['quần áo', 'giày', 'sách', 'mua sắm', 'đồ dùng'],
    'giải trí': ['phim', 'game', 'giải trí', 'hát', 'karaoke'],
    'lương': ['lương', 'thưởng'],
    'khác': ['khác']
  };

  // --- Intent: Add Expense/Income --- 
  const addKeywords = ['thêm', 'ghi lại', 'chi', 'thu'];
  if (addKeywords.some(keyword => doc.has(keyword))) {
    result.intent = 'add_expense';
    result.data = {};

    // Determine type (expense/income)
    if (doc.has('chi')) {
      result.data.type = 'expense';
    } else if (doc.has('thu')) {
      result.data.type = 'income';
    }

    // Extract amount
    const amountMatch = prompt.match(/(\d+(\.\d+)?)\s*(k|nghìn|triệu|tr)/i);
    if (amountMatch) {
      let amount = parseFloat(amountMatch[1]);
      const unit = amountMatch[3].toLowerCase();
      if (unit === 'k' || unit === 'nghìn') {
        amount *= 1000;
      } else if (unit === 'triệu' || unit === 'tr') {
        amount *= 1000000;
      }
      result.data.amount = amount;
    }

    // Extract date
    const dateMatch = prompt.match(/ngày\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (dateMatch) {
      result.data.date = formatDate(dateMatch[1], dateMatch[2], dateMatch[3]);
    } else if (doc.has('hôm nay')) {
      result.data.date = currentDate;
    } else if (doc.has('hôm qua')) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      result.data.date = yesterday.toISOString().split('T')[0];
    }

    // Extract name and category
    // This is a very basic attempt. More advanced NLP would be needed for robust extraction.
    // Try to find a noun phrase after the amount/type keywords
    let nameCandidate = '';
    const parts = prompt.split(amountMatch ? amountMatch[0] : (result.data.type === 'expense' ? 'chi' : 'thu'));
    if (parts.length > 1) {
      nameCandidate = parts[1].trim();
      // Remove date info if present
      nameCandidate = nameCandidate.replace(/ngày\s*(\d{1,2}\/\d{1,2}(\/\d{4})?)|\s*hôm nay|\s*hôm qua/i, '').trim();
    }

    if (nameCandidate) {
      result.data.name = nameCandidate;
      // Simple category mapping
      for (const category in commonCategories) {
        if (commonCategories[category].some(word => nameCandidate.includes(word))) {
          result.data.category = category;
          break;
        }
      }
      if (!result.data.category) {
        result.data.category = 'Khác'; // Default category if not found
      }
    }
  }

  // --- Intent: Query Expense/Income ---
  const queryKeywords = ['chi bao nhiêu', 'thu bao nhiêu', 'tổng chi', 'tổng thu', 'liệt kê', 'khoản chi', 'khoản thu', 'tất cả'];
  if (queryKeywords.some(keyword => doc.has(keyword))) {
    result.intent = 'query_expense';
    result.data = {};

    // Extract period
    if (doc.has('hôm nay')) {
      result.data.period = 'today';
    } else if (doc.has('tuần này')) {
      result.data.period = 'this week';
    } else if (doc.has('tháng này')) {
      result.data.period = 'this month';
    } else if (doc.has('năm nay')) {
      result.data.period = 'this year';
    } else {
      // More complex period extraction using regex
      const fromDayToDayMatch = prompt.match(/từ ngày (\d{1,2})(?: tháng (\d{1,2}))?(?: năm (\d{4}))? đến ngày (\d{1,2})(?: tháng (\d{1,2}))?(?: năm (\d{4}))?/i);
      const fromDayToNowMatch = prompt.match(/từ ngày (\d{1,2})(?: tháng (\d{1,2}))?(?: năm (\d{4}))? đến nay/i);
      const fromMonthToNowMatch = prompt.match(/từ tháng (\d{1,2})(?: năm (\d{4}))? đến nay/i);
      const fromMonthToMonthMatch = prompt.match(/từ tháng (\d{1,2})(?: năm (\d{4}))? đến tháng (\d{1,2})(?: năm (\d{4}))?/i);
      const fromYearToNowMatch = prompt.match(/từ năm (\d{4}) đến nay/i);
      const fromYearToYearMatch = prompt.match(/từ năm (\d{4}) đến năm (\d{4})/i);

      if (fromDayToDayMatch) {
        result.data.period = 'custom_range';
        result.data.startDate = formatDate(fromDayToDayMatch[1], fromDayToDayMatch[2], fromDayToDayMatch[3]);
        result.data.endDate = formatDate(fromDayToDayMatch[4], fromDayToDayMatch[5], fromDayToDayMatch[6]);
      } else if (fromDayToNowMatch) {
        result.data.period = 'custom_range';
        result.data.startDate = formatDate(fromDayToNowMatch[1], fromDayToNowMatch[2], fromDayToNowMatch[3]);
        result.data.endDate = currentDate;
      } else if (fromMonthToNowMatch) {
        result.data.period = 'custom_range';
        const month = fromMonthToNowMatch[1];
        const year = fromMonthToNowMatch[2] || now.getFullYear().toString();
        result.data.startDate = `${year}-${month.padStart(2, '0')}-01`;
        result.data.endDate = currentDate;
      } else if (fromMonthToMonthMatch) {
        result.data.period = 'custom_range';
        const startMonth = fromMonthToMonthMatch[1];
        const startYear = fromMonthToMonthMatch[2] || now.getFullYear().toString();
        const endMonth = fromMonthToMonthMatch[3];
        const endYear = fromMonthToMonthMatch[4] || now.getFullYear().toString();
        result.data.startDate = `${startYear}-${startMonth.padStart(2, '0')}-01`;
        result.data.endDate = `${endYear}-${endMonth.padStart(2, '0')}-${new Date(parseInt(endYear), parseInt(endMonth), 0).getDate()}`; // Last day of month
      } else if (fromYearToNowMatch) {
        result.data.period = 'custom_range';
        const year = fromYearToNowMatch[1];
        result.data.startDate = `${year}-01-01`;
        result.data.endDate = currentDate;
      } else if (fromYearToYearMatch) {
        result.data.period = 'custom_range';
        const startYear = fromYearToYearMatch[1];
        const endYear = fromYearToYearMatch[2];
        result.data.startDate = `${startYear}-01-01`;
        result.data.endDate = `${endYear}-12-31`;
      }
    }
  }

  // --- Intent: Greeting ---
  const greetingKeywords = ['hello', 'xin chào', 'hi'];
  if (greetingKeywords.some(keyword => doc.has(keyword))) {
    result.intent = 'greeting';
  }

  return result;
}
