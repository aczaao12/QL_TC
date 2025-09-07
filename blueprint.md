# 📋 Tasks - PWA Quản lý Tiền có AI

## 1. Setup cơ bản
- [x] Khởi tạo project (Next.js đã dùng templete, format nếu cần).
- [ ] Cấu hình PWA (manifest.json, service worker) - *Tạm thời bỏ qua*.
  - Sử dụng `next-pwa` để cấu hình PWA mạnh mẽ hơn.
  - Xóa `public/service-worker.js` cũ, `next-pwa` sẽ tự động tạo `sw.js`.
  - Cấu hình `next.config.ts` để sử dụng `withPWA` và `customWorkerDir`.
- [x] Tạo cấu trúc thư mục: `pages/`, `components/`, `store/`, `services/`.

## 2. Quản lý dữ liệu (Offline-first)
- [x] Cài Dexie.js (hoặc IndexedDB API trực tiếp).
- [x] Thiết kế schema DB: `giao_dich { id, ngay, loai, so_tien, ghichu, tai_khoan, du_an_muc_tieu }`.
- [x] Viết hàm CRUD (thêm, sửa, xóa, query).
  - `addGiaoDich`, `getGiaoDichById`, `getAllGiaoDich`, `updateGiaoDich`, `deleteGiaoDich`, `getGiaoDichByDateRange`, `getGiaoDichByType`.
- [x] Hiển thị danh sách giao dịch + tổng hợp chi tiêu.
  - Dashboard (`/`): Hiển thị tổng thu/chi và 5 giao dịch gần nhất.
  - Trang Giao dịch (`/transactions`): Hiển thị tất cả giao dịch.

## 3. AI nhập liệu
- [x] Kết nối Gemini API (trực tiếp trên frontend, sử dụng model `gemini-2.5-flash`).
- [x] Prompt để **parse ngôn ngữ tự nhiên → JSON giao dịch**.
  - Prompt được thiết kế để chuyển đổi văn bản tiếng Việt thành JSON giao dịch với các trường `ngay`, `loai`, `so_tien`, `ghichu`.
- [x] Tích hợp flow:
  1. User nhập text.
  2. Gọi Gemini parse trực tiếp từ frontend.
  3. Lưu JSON vào IndexedDB.
  - Trang Thêm Giao dịch (`/add-transaction`) hỗ trợ nhập liệu bằng AI.
- [x] Đảm bảo múi giờ cho ngày mặc định là GMT+7 (HCM).

## 4. AI query & gợi ý
- [x] Prompt để **trả lời dựa trên data đã lọc từ DB** (sử dụng model `gemini-2.5-flash`).
- [x] Xây module lấy data liên quan từ DB → đưa vào prompt → nhận output từ Gemini.
  - Trang Hỏi AI (`/ai-query`) cho phép người dùng nhập câu hỏi và nhận phản hồi từ AI dựa trên dữ liệu giao dịch.
  - [x] Định dạng phản hồi từ AI bằng Markdown.
- [ ] AI gợi ý tiết kiệm / chiến lược dựa trên lịch sử chi tiêu.
  - Chức năng gợi ý được tích hợp trong phản hồi của AI.

## 5. Giao diện người dùng
- [x] Trang Dashboard (`/`):
  - Tổng thu/chi, biểu đồ (chưa có biểu đồ, chỉ có tổng hợp số liệu).
  - Danh sách giao dịch gần nhất.
- [x] Trang nhập liệu (`/add-transaction`):
  - Nhập text tự nhiên (AI hỗ trợ).
  - Form thủ công (fallback).
- [x] Trang cài đặt (`/settings`):
  - Ngân sách mục tiêu (placeholder UI).
  - Tùy chọn đồng bộ cloud (placeholder UI).
  - [x] Hiển thị dung lượng lưu trữ trình duyệt (IndexedDB).

## 6. Thông báo đẩy (Push Notification) - *Tạm thời bỏ qua*
- [ ] Cấu hình Firebase Cloud Messaging (FCM) hoặc Web Push API.
  - Tích hợp `firebase/messaging` và `setupNotifications` trong `layout.tsx`.
  - Tạo `src/sw.js` (trước đây là `firebase-messaging-sw.js`) để xử lý thông báo nền.
  - Cấu hình `next-pwa` để sử dụng `customWorkerDir`.
- [ ] Gửi nhắc nhở hàng ngày nhập chi tiêu (cần triển khai backend).
- [ ] Gửi cảnh báo khi chi vượt ngân sách (cần triển khai backend).

## 7. Đồng bộ (Optional)
- [ ] Tích hợp Firebase Firestore để sync data đa thiết bị.
  - Hiện tại không có đồng bộ Firestore.
- [ ] Giải quyết conflict (last-write-wins hoặc merge logic).

## 8. Triển khai
- [x] Deploy frontend lên Vercel/Netlify (hoặc Firebase Hosting với static export).
  - Hướng dẫn: Chạy `npm run build` để tạo thư mục `out`.
  - Cấu hình `next.config.ts` với `output: 'export'`.
  - Cấu hình `firebase.json` để `public` trỏ đến thư mục `out`.
- [ ] Deploy backend serverless (API Gemini proxy) lên Cloudflare Workers / Firebase Functions.
  - Hướng dẫn: Hiện tại không có backend serverless cho Gemini API.
- [ ] Test PWA (offline, cài đặt như app mobile).
  - Hướng dẫn: Mở PWA đã deploy, kiểm tra chức năng offline, và thử cài đặt PWA trên thiết bị di động.

## 9. Biến giọng nói → text
- [x] Tích hợp Web Speech API vào trang nhập liệu (`/add-transaction`).
  - Sử dụng `webkitSpeechRecognition` để chuyển giọng nói thành văn bản tiếng Việt.
  - Đã thêm các khai báo kiểu dữ liệu cần thiết cho `SpeechRecognition`, `SpeechRecognitionEvent`, `SpeechRecognitionErrorEvent`, `SpeechGrammarList`, `SpeechRecognitionEventInit`, `SpeechRecognitionErrorEventInit`.

## 10. Phân loại & Thống kê
### 10.1. Phân loại theo thời gian
- [x] Theo tháng: để tổng hợp chi tiêu, doanh thu, báo cáo, biểu đồ.
- [x] Theo năm: để so sánh hiệu quả, lập báo cáo dài hạn.
- [x] Theo ngày / tuần: để hiển thị lịch sử chi tiết hoặc dashboard chi tiết.

### 10.2. Phân loại theo loại giao dịch
- [x] Thu / Chi: giúp dễ thống kê.
- [x] Loại chi tiêu / nguồn thu: ăn uống, đi lại, lương, đầu tư…
- [x] Tài khoản / ví: tiền mặt, ngân hàng, ví điện tử.

### 10.3. Phân loại theo dự án hoặc mục tiêu
- [x] Ví dụ: chi tiêu cho “Dự án A”, “Dự án B” → giúp phân tích hiệu quả tài chính.
- [x] Hoặc “Mục tiêu tiết kiệm” → dễ theo dõi tiến độ.

### 10.4. Thống kê & Báo cáo
- [x] Tổng thu/chi theo ngày, tuần, tháng, năm.
- [x] Biểu đồ cột, tròn, đường để so sánh, trend.
- [x] Báo cáo dựa trên loại chi tiêu, tài khoản, category.

## 11. Tính năng nâng cao
- [x] Budget / hạn mức chi tiêu theo category.
- [x] Xuất dữ liệu CSV / PDF để lưu trữ hoặc báo cáo.
- [x] Nhắc nhở / notification khi chi vượt hạn mức.