# 📋 Tasks - PWA Quản lý Tiền có AI

## 1. Setup cơ bản
- [x] Khởi tạo project (Next.js đã dùng templete, format nếu cần).
- [x] Cấu hình PWA (manifest.json, service worker).
  - Sử dụng `next-pwa` để cấu hình PWA mạnh mẽ hơn.
  - Xóa `public/service-worker.js` cũ, `next-pwa` sẽ tự động tạo `sw.js`.
  - Cập nhật `next.config.ts` để sử dụng `withPWA` và `customWorkerDir`.
- [x] Tạo cấu trúc thư mục: `pages/`, `components/`, `store/`, `services/`.

## 2. Quản lý dữ liệu (Offline-first)
- [x] Cài Dexie.js (hoặc IndexedDB API trực tiếp).
- [x] Thiết kế schema DB: `giao_dich { id, ngay, loai, so_tien, ghichu, firestoreId }`.
- [x] Viết hàm CRUD (thêm, sửa, xóa, query).
  - `addGiaoDich`, `getGiaoDichById`, `getAllGiaoDich`, `updateGiaoDich`, `deleteGiaoDich`, `getGiaoDichByDateRange`, `getGiaoDichByType`.
- [x] Hiển thị danh sách giao dịch + tổng hợp chi tiêu.
  - Dashboard (`/`): Hiển thị tổng thu/chi và 5 giao dịch gần nhất.
  - Trang Giao dịch (`/transactions`): Hiển thị tất cả giao dịch.

## 3. AI nhập liệu
- [x] Kết nối Gemini API (qua backend serverless để giấu API key).
  - Triển khai Firebase Function `parseTransaction` để làm proxy cho Gemini API.
  - Cấu hình TypeScript cho Firebase Functions.
- [x] Prompt để **parse ngôn ngữ tự nhiên → JSON giao dịch**.
  - Prompt được thiết kế để chuyển đổi văn bản tiếng Việt thành JSON giao dịch với các trường `ngay`, `loai`, `so_tien`, `ghichu`.
- [x] Tích hợp flow:
  1. User nhập text.
  2. Gọi Gemini parse thông qua Firebase Function.
  3. Lưu JSON vào IndexedDB và Firestore.
  - Trang Thêm Giao dịch (`/add-transaction`) hỗ trợ nhập liệu bằng AI.

## 4. AI query & gợi ý
- [x] Prompt để **trả lời dựa trên data đã lọc từ DB**.
  - Triển khai Firebase Function `queryAI` nhận truy vấn và dữ liệu giao dịch.
- [x] Xây module lấy data liên quan từ DB → đưa vào prompt → nhận output từ Gemini.
  - Trang Hỏi AI (`/ai-query`) cho phép người dùng nhập câu hỏi và nhận phản hồi từ AI dựa trên dữ liệu giao dịch.
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

## 6. Thông báo đẩy (Push Notification)
- [x] Cấu hình Firebase Cloud Messaging (FCM) hoặc Web Push API.
  - Tích hợp `firebase/messaging` và `setupNotifications` trong `layout.tsx`.
  - Tạo `src/sw.js` (trước đây là `firebase-messaging-sw.js`) để xử lý thông báo nền.
  - Cấu hình `next-pwa` để sử dụng `customWorkerDir`.
- [ ] Gửi nhắc nhở hàng ngày nhập chi tiêu (cần triển khai backend).
- [ ] Gửi cảnh báo khi chi vượt ngân sách (cần triển khai backend).

## 7. Đồng bộ (Optional)
- [x] Tích hợp Firebase Firestore để sync data đa thiết bị.
  - `addGiaoDich` lưu vào cả IndexedDB và Firestore.
  - `syncFromFirestore` đồng bộ dữ liệu từ Firestore về IndexedDB khi khởi động ứng dụng.
- [ ] Giải quyết conflict (last-write-wins hoặc merge logic).
  - Hiện tại là đồng bộ một chiều đơn giản, chưa có giải quyết xung đột phức tạp.

## 8. Triển khai
- [ ] Deploy frontend lên Vercel/Netlify.
  - Hướng dẫn: Chạy `npm run build` và deploy thư mục `out` (nếu dùng static export) hoặc kết nối repo Git với Vercel/Netlify.
- [ ] Deploy backend serverless (API Gemini proxy) lên Cloudflare Workers / Firebase Functions.
  - Hướng dẫn: Chạy `firebase deploy --only functions`.
- [ ] Test PWA (offline, cài đặt như app mobile).
  - Hướng dẫn: Mở PWA đã deploy, kiểm tra chức năng offline, và thử cài đặt PWA trên thiết bị di động.

## 9. Biến giọng nói → text
- [x] Tích hợp Web Speech API vào trang nhập liệu (`/add-transaction`).
  - Sử dụng `webkitSpeechRecognition` để chuyển giọng nói thành văn bản tiếng Việt.

