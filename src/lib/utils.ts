// src/lib/utils.ts

// Emoji gợi ý theo category
const CATEGORY_ICONS: Record<string, string> = {
  "Ăn uống": "🍔",
  "Ăn sáng": "🥐",
  "Đi lại": "🚗",
  "Khác": "🔖",
  "Nước uống": "🥤",
  "default": "💸"
};

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS["default"];
}

/**
 * Format mặc định: liệt kê từng khoản + tổng cộng
 */
export function formatTransactions(data: any[]): string {
  if (!data || data.length === 0) return "Không có dữ liệu.";

  let total = 0;
  let lines = data.map(item => {
    if (typeof item.amount === "number") total += item.amount;

    const name = item.name || "Không tên";
    const amount = typeof item.amount === "number" ? item.amount.toLocaleString() : "N/A";
    const category = item.category || "Không rõ";
    const date = item.date || "Không ngày";
    const icon = getCategoryIcon(category);

    return `${icon} ${name}: ${amount}đ (${category}, ${date})`;
  });

  return lines.join("\n") + `\n👉 Tổng cộng: ${total.toLocaleString()}đ`;
}

/**
 * Format ngắn gọn: chỉ tên + số tiền
 */
export function formatTransactionsShort(data: any[]): string {
  if (!data || data.length === 0) return "Không có dữ liệu.";

  let total = 0;
  let lines = data.map(item => {
    if (typeof item.amount === "number") total += item.amount;

    const name = item.name || "Không tên";
    const amount = typeof item.amount === "number" ? item.amount.toLocaleString() : "N/A";
    return `- ${name}: ${amount}đ`;
  });

  return lines.join("\n") + `\n👉 Tổng cộng: ${total.toLocaleString()}đ`;
}

/**
 * Format bảng Markdown: có thể render đẹp trong chat (nếu bạn xài markdown renderer)
 */
export function formatTransactionsTable(data: any[]): string {
  if (!data || data.length === 0) return "Không có dữ liệu.";

  let total = 0;
  let rows = data.map(item => {
    if (typeof item.amount === "number") total += item.amount;

    const name = item.name || "Không tên";
    const amount = typeof item.amount === "number" ? item.amount.toLocaleString() : "N/A";
    const category = item.category || "Không rõ";
    const date = item.date || "Không ngày";
    return `| ${name} | ${amount}đ | ${category} | ${date} |`;
  });

  return (
    `| Tên | Số tiền | Loại | Ngày |\n` +
    `| --- | --- | --- | --- |\n` +
    rows.join("\n") +
    `\n| 👉 Tổng cộng | ${total.toLocaleString()}đ |  |  |`
  );
}

/**
 * Format kết quả aggregate (sum, avg, max, min, count)
 */
export function formatAggregateResult(operation: string, field: string, result: any): string {
  if (result === undefined || result === null) {
    return `Không có kết quả cho phép tính ${operation} trên trường ${field}.`;
  }

  let formattedResult = result.toLocaleString();
  if (field === "amount" && ["sum", "avg", "max", "min"].includes(operation)) {
    formattedResult += "đ";
  }

  switch (operation) {
    case "sum": return `Tổng ${field}: ${formattedResult}`;
    case "avg": return `Trung bình ${field}: ${formattedResult}`;
    case "max": return `Lớn nhất ${field}: ${formattedResult}`;
    case "min": return `Nhỏ nhất ${field}: ${formattedResult}`;
    case "count": return `Số lượng ${field}: ${formattedResult}`;
    default: return `Kết quả ${operation} ${field}: ${formattedResult}`;
  }
}
