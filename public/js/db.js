/* ========================================================
   QUẢN LÝ DỮ LIỆU ĐỒNG BỘ: LOCALSTORAGE & FIREBASE
   Hỗ trợ đồng bộ thời gian thực qua mạng Internet
   ======================================================== */

const DEFAULT_QUESTIONS = [
  {
    id: "q1",
    type: "choice", // choice, tf, input
    text: "Phép tính: 4 + 3 bằng mấy bé nhỉ?",
    options: ["6", "7", "8", "9"],
    answer: "7",
    hint: "Bé thử đếm ngón tay nhé: Có 4 ngón tay, thêm 3 ngón tay nữa là 7 ngón tay đó!"
  },
  {
    id: "q2",
    type: "choice",
    text: "Trong các từ sau, từ nào viết ĐÚNG chính tả?",
    options: ["Quả chanh", "Quả tranh", "Con chăn", "Con trâu vàng"],
    answer: "Quả chanh",
    hint: "Bé nhớ nhé: 'quả chanh' chua mát viết bằng chữ 'ch' xinh xắn!"
  },
  {
    id: "q3",
    type: "tf",
    text: "Số 8 lớn hơn số 5, đúng hay sai?",
    options: ["ĐÚNG", "SAI"],
    answer: "ĐÚNG",
    hint: "Bé đếm từ 1 đến 8 xem: 1, 2, 3, 4, 5 rồi mới tới 6, 7, 8. Vậy 8 lớn hơn 5 là Đúng!"
  },
  {
    id: "q4",
    type: "input",
    text: "Bé hãy điền số còn thiếu vào dãy số sau: 2, 4, 6, ... ?",
    options: [],
    answer: "8",
    hint: "Mỗi số cách nhau 2 đơn vị: 2 thêm 2 là 4, 4 thêm 2 là 6, vậy 6 thêm 2 sẽ là 8!"
  },
  {
    id: "q5",
    type: "choice",
    text: "Chữ cái in hoa tương ứng của chữ 'm' là chữ nào?",
    options: ["M", "N", "H", "U"],
    answer: "M",
    hint: "Chữ 'm' in hoa có hai ngọn núi cao chính là chữ M hoa nha!"
  }
];

const DEFAULT_PRIZES = {
  sitRit: [
    { id: "sr1", name: "🌟 Huy hiệu Bé Siêu Đẳng", desc: "Được gắn huy hiệu danh dự trên bảng thi đua của lớp" },
    { id: "sr2", name: "🎬 30 phút xem phim hoạt hình", desc: "Bé được bố mẹ cho xem tập hoạt hình yêu thích" },
    { id: "sr3", name: "🎁 Món quà nhỏ từ cô giáo", desc: "Một cây bút chì ngộ nghĩnh hoặc chiếc thước kẻ dễ thương" },
    { id: "sr4", name: "👑 Quyền chọn chỗ ngồi yêu thích", desc: "Bé được chọn ngồi cạnh bạn thân 1 tuần" },
    { id: "sr5", name: "📝 Phiếu miễn 1 bài tập về nhà", desc: "Phiếu bảo bối được nghỉ ngơi 1 buổi tối" },
    { id: "sr6", name: "⭐ Được cô khen ngợi trước cả lớp", desc: "Cả lớp sẽ vỗ tay khen ngợi thành tích xuất sắc của bé" }
  ],
  leKhe: [
    { id: "lk1", name: "💃 Nhảy múa vui nhộn 3 phút", desc: "Múa một bài hát thiếu nhi thật đáng yêu cho bố mẹ xem" },
    { id: "lk2", name: "🧹 Quét nhà phụ mẹ 3 ngày", desc: "Cầm chổi nhỏ quét dọn phòng khách sạch bong phụ mẹ" },
    { id: "lk3", name: "👕 Phơi quần áo giúp mẹ 2 ngày", desc: "Giúp mẹ kẹp và phơi những chiếc tất hoặc khăn nhỏ" },
    { id: "lk4", name: "🍵 Rót nước mời ông bà/bố mẹ 3 ngày", desc: "Mỗi tối rót một ly nước ấm mời người lớn trong nhà" },
    { id: "lk5", name: "🧦 Gấp gọn quần áo của mình 3 ngày", desc: "Tự tay xếp gọn ghẽ quần áo sau khi phơi khô" },
    { id: "lk6", name: "💆 Đấm lưng cho ông bà hoặc bố mẹ 5 phút", desc: "Đôi bàn tay nhỏ massage thư giãn cho người thân" }
  ]
};

class DataManager {
  constructor() {
    this.channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('lop1_study_channel');
    }
    this.firebaseApp = null;
    this.firestore = null;
    this.initFirebase();
  }

  // Khởi tạo Firebase nếu có cấu hình trong LocalStorage
  initFirebase() {
    const configStr = localStorage.getItem('lop1_firebase_config');
    if (configStr && window.firebase) {
      try {
        const config = JSON.parse(configStr);
        if (config.apiKey && config.projectId) {
          if (!firebase.apps.length) {
            this.firebaseApp = firebase.initializeApp(config);
          } else {
            this.firebaseApp = firebase.app();
          }
          this.firestore = firebase.firestore();
          console.log("Firebase Firestore đã kết nối thành công!");
        }
      } catch (err) {
        console.warn("Lỗi cấu hình Firebase:", err);
      }
    }
  }

  isFirebaseConnected() {
    return !!(this.firestore);
  }

  // Lưu cấu hình Firebase
  saveFirebaseConfig(configObj) {
    localStorage.setItem('lop1_firebase_config', JSON.stringify(configObj));
    this.initFirebase();
  }

  getFirebaseConfig() {
    const configStr = localStorage.getItem('lop1_firebase_config');
    return configStr ? JSON.parse(configStr) : null;
  }

  // Quản lý Gemini API Key
  getGeminiKey() {
    return localStorage.getItem('lop1_gemini_key') || '';
  }

  saveGeminiKey(key) {
    localStorage.setItem('lop1_gemini_key', key.trim());
  }

  // Lấy danh sách câu hỏi
  async getQuestions() {
    // 1. Thử lấy từ Firestore nếu có kết nối
    if (this.firestore) {
      try {
        const doc = await this.firestore.collection('config').doc('current_quiz').get();
        if (doc.exists && doc.data().questions && doc.data().questions.length > 0) {
          return doc.data().questions;
        }
      } catch (e) {
        console.warn("Không thể tải câu hỏi từ Firebase, dùng dữ liệu lưu cục bộ:", e);
      }
    }

    // 2. Lấy từ LocalStorage
    const local = localStorage.getItem('lop1_questions');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
    }

    // 3. Trả về câu hỏi mặc định
    return DEFAULT_QUESTIONS;
  }

  // Cập nhật bộ câu hỏi mới (giáo viên phát hành)
  async saveQuestions(questions) {
    localStorage.setItem('lop1_questions', JSON.stringify(questions));

    // Đẩy lên Firestore nếu có
    if (this.firestore) {
      try {
        await this.firestore.collection('config').doc('current_quiz').set({
          questions: questions,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Lỗi đồng bộ câu hỏi lên Firebase:", e);
      }
    }

    // Phát tín hiệu qua BroadcastChannel cho các tab cùng máy
    if (this.channel) {
      this.channel.postMessage({ type: 'QUESTIONS_UPDATED', questions });
    }
  }

  // Lấy danh sách quà & thử thách
  getPrizes() {
    const saved = localStorage.getItem('lop1_prizes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_PRIZES;
  }

  // Lưu danh sách quà & thử thách
  savePrizes(prizes) {
    localStorage.setItem('lop1_prizes', JSON.stringify(prizes));
  }

  // Ghi nhận kết quả làm bài & bốc xăm của học sinh
  async recordStudentResult(record) {
    const fullRecord = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      studentName: record.studentName || 'Bé lớp 1',
      score: record.score || 0,
      totalQuestions: record.totalQuestions || 5,
      correctCount: record.correctCount || 0,
      wrongAttempts: record.wrongAttempts || [],
      drawType: record.drawType || null, // 'sit-rit' hoặc 'le-khe'
      drawPrize: record.drawPrize || null,
      timestamp: new Date().toLocaleString('vi-VN'),
      timeISO: new Date().toISOString()
    };

    // 1. Lưu cục bộ
    let logs = this.getLocalStudentLogs();
    logs.unshift(fullRecord);
    localStorage.setItem('lop1_student_logs', JSON.stringify(logs));

    // 2. Đẩy lên Firebase nếu có kết nối
    if (this.firestore) {
      try {
        await this.firestore.collection('student_results').doc(fullRecord.id).set(fullRecord);
      } catch (e) {
        console.warn("Lỗi lưu kết quả lên Firebase:", e);
      }
    }

    // 3. Thông báo tức thì cho trang Admin
    if (this.channel) {
      this.channel.postMessage({ type: 'STUDENT_SUBMITTED', record: fullRecord });
    }

    return fullRecord;
  }

  // Cập nhật kết quả bốc xăm sau khi học sinh bốc thăm
  async updateStudentDraw(recordId, drawType, drawPrize) {
    let logs = this.getLocalStudentLogs();
    const item = logs.find(l => l.id === recordId);
    if (item) {
      item.drawType = drawType;
      item.drawPrize = drawPrize;
      localStorage.setItem('lop1_student_logs', JSON.stringify(logs));
    }

    if (this.firestore) {
      try {
        await this.firestore.collection('student_results').doc(recordId).update({
          drawType: drawType,
          drawPrize: drawPrize
        });
      } catch (e) {
        console.warn("Lỗi cập nhật bốc xăm trên Firebase:", e);
      }
    }

    if (this.channel) {
      this.channel.postMessage({ type: 'STUDENT_DRAW_UPDATED', recordId, drawType, drawPrize });
    }
  }

  getLocalStudentLogs() {
    const data = localStorage.getItem('lop1_student_logs');
    return data ? JSON.parse(data) : [];
  }

  // Lấy toàn bộ nhật ký học sinh (kết hợp Firebase và Local)
  async getAllStudentLogs() {
    if (this.firestore) {
      try {
        const snap = await this.firestore.collection('student_results').orderBy('timeISO', 'desc').limit(100).get();
        const results = [];
        snap.forEach(doc => results.push(doc.data()));
        if (results.length > 0) return results;
      } catch (e) {
        console.warn("Lỗi đọc Firestore, dùng local logs:", e);
      }
    }
    return this.getLocalStudentLogs();
  }

  // Xóa toàn bộ dữ liệu nhật ký
  async clearAllLogs() {
    localStorage.removeItem('lop1_student_logs');
    if (this.channel) {
      this.channel.postMessage({ type: 'LOGS_CLEARED' });
    }
  }
}

window.dataManager = new DataManager();
