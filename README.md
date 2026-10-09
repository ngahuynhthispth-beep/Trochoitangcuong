# Ứng Dụng Ôn Tập Tăng Cường Lớp 1 (Gamification Học Sinh & Admin Giáo Viên)

Ứng dụng web trò chơi giáo dục dành riêng cho học sinh lớp 1 ôn tập bài tập tại nhà trên iPad, máy tính bảng hoặc điện thoại di động, tích hợp bộ phân tích đề bài tự động cho giáo viên và trang quản trị theo dõi kết quả.

---

## 🌟 Các Tính Năng Nổi Bật

### 1. Giao Diện Học Sinh Lớp 1 (`index.html`)
- **Tối ưu trải nghiệm trẻ 6-7 tuổi:** Giao diện nhiều màu sắc tươi sáng (Kid-Friendly), nút bấm lớn, hình vẽ minh họa ngộ nghĩnh, hiệu ứng pháo hoa và âm thanh hoạt hình.
- **Trợ lý đọc câu hỏi (Text-to-Speech):** Tích hợp nút loa 🔊 phát âm tiếng Việt chuẩn giúp các bé chưa đọc thạo vẫn nghe hiểu đề bài và các phương án trả lời.
- **Quy tắc làm bài 3 lần (Pedagogical Game Loop):**
  - **Lần 1 sai:** Âm thanh vui nhộn động viên, cho bé thử lại lần 2.
  - **Lần 2 sai:** Lời nhắc nhở khích lệ bé suy nghĩ kỹ thêm, cho bé chọn lần 3.
  - **Lần 3 vẫn sai:** Hệ thống hiện khung **Gợi ý giải thích** đáp án đúng bằng lời ấm áp, chuyển câu tiếp theo và **không cộng điểm** câu đó.
- **Vòng quay Gamification khi đạt trên 9 điểm:**
  - Kích hoạt màn hình bốc thăm đặc biệt với 2 lựa chọn:
    - 🎁 **"SÍT - RỊT":** Bốc quà may mắn (Huy hiệu Bé Siêu Đẳng, 30 phút xem hoạt hình, quà bánh từ cô giáo, phiếu miễn 1 bài tập,...).
    - 😜 **"LÈ - KHE":** Thử thách hài hước, việc nhà vừa sức trẻ lớp 1 (Nhảy múa vui nhộn 3 phút, quét nhà phụ mẹ 3 ngày, phơi quần áo giúp mẹ 2 ngày, rót nước mời ông bà,...).

### 2. Trang Quản Trị Dành Cho Giáo Viên (`admin.html`)
- **Tự động phân tích đề bài:**
  - Giáo viên chỉ cần kéo thả hoặc chọn tệp Word (`.docx`), tệp văn bản (`.txt`) hoặc dán nội dung bài tập vào.
  - **2 tầng phân tích:**
    - *Tầng 1 (Smart Rule Parser):* Tự động nhận diện cấu trúc câu hỏi, trắc nghiệm, đúng/sai, điền khuyết ngay trên trình duyệt mà không cần tài khoản hay API key.
    - *Tầng 2 (Gemini AI Parser):* Khi cô nhập mã Google Gemini API Key, AI sẽ đọc hiểu ngữ nghĩa bài tập phức tạp và tạo gợi ý giải thích cho từng câu.
  - Xem trước và chỉnh sửa danh sách câu hỏi trước khi bấm **"Phát hành cho học sinh"**.
- **Nhật ký theo dõi học sinh & Bốc thăm trực tiếp:**
  - Thống kê sĩ số làm bài, điểm trung bình, số lượt bốc "Sít rịt", số lượt bốc "Lè khe".
  - Bảng danh sách chi tiết: Tên học sinh, điểm số, số câu đúng, số lần thử sai, lựa chọn bốc thăm và phần quà/thử thách trúng.
  - Hỗ trợ xuất dữ liệu ra file Excel (`.xlsx`).
- **Kho quà & Thử thách tùy biến:** Giáo viên dễ dàng thêm/sửa/xóa các món quà "Sít rịt" hoặc hình phạt vui "Lè khe" theo từng chủ đề tuần.
- **Đồng bộ trực tuyến với Firebase:** Hỗ trợ cấu hình Firebase Firestore để học sinh làm bài ở nhà là kết quả nhảy thẳng về màn hình cô giáo tức thì.

---

## 🚀 Hướng Dẫn Sử Dụng

### Cách 1: Chạy máy chủ cục bộ (Khuyên dùng)
1. Mở terminal tại thư mục dự án và chạy:
   ```bash
   node server.js
   ```
2. Mở trình duyệt:
   - **Giao diện học sinh:** [http://localhost:3000/index.html](http://localhost:3000/index.html)
   - **Trang quản trị giáo viên:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

### Cách 2: Mở trực tiếp không cần máy chủ
Bạn có thể nhấp đúp trực tiếp vào file `index.html` hoặc `admin.html` để mở trong bất kỳ trình duyệt nào (Chrome, Safari, Edge, Cốc Cốc).

---

##  cấu trúc Thư Mục
```
UngDungTroChoiTangCuong/
├── index.html        # Giao diện học sinh làm bài & bốc xăm
├── admin.html        # Trang quản trị của cô giáo
├── server.js         # Máy chủ web tĩnh siêu nhẹ thuần Node.js
├── README.md         # Hướng dẫn chi tiết
├── css/
│   ├── style.css     # Thiết kế giao diện học sinh (Kid-Friendly)
│   └── admin.css     # Thiết kế giao diện quản trị Admin
└── js/
    ├── audio.js      # Bộ tổng hợp âm thanh Web Audio API
    ├── speech.js     # Trợ lý đọc đề tiếng Việt Text-to-Speech
    ├── db.js         # Lưu trữ LocalStorage & Đồng bộ Firebase
    ├── parser.js     # Bộ phân tích tệp Word & Gemini AI
    ├── game.js       # Logic trò chơi & Quy tắc 3 lần thử
    └── admin.js      # Logic quản lý bài tập & giám sát bốc xăm
```
