# 📋 Tasks - PWA Quản lý Tiền có AI

## 1. Setup cơ bản
- [ ] Khởi tạo project (Next.js đã dùng templete, format nếu cần).
- [ ] Cấu hình PWA (manifest.json, service worker).
- [ ] Tạo cấu trúc thư mục: `pages/`, `components/`, `store/`, `services/`.

## 2. Quản lý dữ liệu (Offline-first)
- [ ] Cài Dexie.js (hoặc IndexedDB API trực tiếp).
- [ ] Thiết kế schema DB: `giao_dich { id, ngay, loai, so_tien, ghichu }`.
- [ ] Viết hàm CRUD (thêm, sửa, xóa, query).
- [ ] Hiển thị danh sách giao dịch + tổng hợp chi tiêu.

## 3. AI nhập liệu
- [ ] Kết nối Gemini API (qua backend serverless để giấu API key).
- [ ] Prompt để **parse ngôn ngữ tự nhiên → JSON giao dịch**.
  - Input: `"Chi 50k ăn sáng hôm nay"`
  - Output JSON: `{ "ngay": "2025-09-07", "loai": "ăn uống", "so_tien": 50000, "ghichu": "" }`
- [ ] Tích hợp flow:
  1. User nhập text.
  2. Gọi Gemini parse.
  3. Lưu JSON vào IndexedDB.

## 4. AI query & gợi ý
- [ ] Prompt để **trả lời dựa trên data đã lọc từ DB**.
  - Ví dụ: “Tháng này tôi chi bao nhiêu tiền cafe?”
- [ ] Xây module lấy data liên quan từ DB → đưa vào prompt → nhận output từ Gemini.
- [ ] AI gợi ý tiết kiệm / chiến lược dựa trên lịch sử chi tiêu.

## 5. Giao diện người dùng
- [ ] Trang Dashboard:
  - Tổng thu/chi, biểu đồ.
  - Danh sách giao dịch gần nhất.
- [ ] Trang nhập liệu:
  - Nhập text tự nhiên (AI hỗ trợ).
  - Form thủ công (fallback).
- [ ] Trang cài đặt:
  - Ngân sách mục tiêu.
  - Tùy chọn đồng bộ cloud.

## 6. Thông báo đẩy (Push Notification)
- [ ] Cấu hình Firebase Cloud Messaging (FCM) hoặc Web Push API.
- [ ] Gửi nhắc nhở hàng ngày nhập chi tiêu.
- [ ] Gửi cảnh báo khi chi vượt ngân sách.

## 7. Đồng bộ (Optional)
- [ ] Tích hợp Firebase Firestore để sync data đa thiết bị.
- [ ] Giải quyết conflict (last-write-wins hoặc merge logic).

## 8. Triển khai
- [ ] Deploy frontend lên Vercel/Netlify.
- [ ] Deploy backend serverless (API Gemini proxy) lên Cloudflare Workers / Firebase Functions.
- [ ] Test PWA (offline, cài đặt như app mobile).

## 9. Biến giọng nói → text

Trên browser bạn có vài lựa chọn:

Web Speech API (native của Chrome, Edge, Safari):

Dùng SpeechRecognition hoặc webkitSpeechRecognition.

Ưu điểm: không cần server, chạy ngay trong browser.

Nhược: chỉ hỗ trợ tốt trên Chrome và một số trình duyệt.