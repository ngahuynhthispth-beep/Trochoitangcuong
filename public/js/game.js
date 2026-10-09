/* ========================================================
   LOGIC TRÒ CHƠI ÔN TẬP TĂNG CƯỜNG DÀNH CHO HỌC SINH LỚP 1
   Quy tắc: 3 lần thử, > 9 điểm quay Vòng Quay Sít Rịt & Lè Khe (1 lần duy nhất)
   ======================================================== */

class StudyGame {
  constructor() {
    this.studentName = '';
    this.questions = [];
    this.currentIndex = 0;
    this.currentScore = 0;
    this.correctCount = 0;
    this.attempts = 0; // Đếm số lần làm sai ở câu hiện tại (tối đa 3 lần)
    this.wrongDetails = [];
    this.currentSubmission = null;
    this.prizes = null;

    // Quản lý Vòng Quay May Mắn
    this.wheelSegments = [];
    this.wheelAngle = 0;
    this.isSpinning = false;
    this.hasSpun = false; // Quy định bé chỉ được quay 1 lần duy nhất
    this.lastTickSegment = -1;
    this.bulbPhase = 0;

    this.dom = {};
  }

  async init() {
    this.bindDom();
    this.bindEvents();
    this.prizes = window.dataManager.getPrizes();

    // Lắng nghe cập nhật đề bài từ giáo viên qua BroadcastChannel
    if (window.dataManager && window.dataManager.channel) {
      window.dataManager.channel.onmessage = (event) => {
        if (event.data?.type === 'QUESTIONS_UPDATED') {
          console.log("Đã nhận bộ câu hỏi mới từ cô giáo!");
        }
      };
    }
  }

  bindDom() {
    this.dom.joinScreen = document.getElementById('join-screen');
    this.dom.gameScreen = document.getElementById('game-screen');
    this.dom.resultScreen = document.getElementById('result-screen');

    this.dom.studentNameInput = document.getElementById('student-name-input');
    this.dom.btnStart = document.getElementById('btn-start-game');

    this.dom.headerName = document.getElementById('header-student-name');
    this.dom.headerScore = document.getElementById('header-current-score');
    this.dom.progressText = document.getElementById('progress-text');
    this.dom.progressFill = document.getElementById('progress-fill');

    this.dom.speakerBtn = document.getElementById('speaker-btn');
    this.dom.questionText = document.getElementById('question-text');
    this.dom.attemptsBadge = document.getElementById('attempts-badge');
    this.dom.hintBox = document.getElementById('hint-box');
    this.dom.hintText = document.getElementById('hint-text');
    this.dom.btnNextFromHint = document.getElementById('btn-next-from-hint');

    this.dom.answersContainer = document.getElementById('answers-container');
    this.dom.correctToast = document.getElementById('correct-toast');

    // Màn hình kết quả & Vòng quay
    this.dom.finalScoreVal = document.getElementById('final-score-val');
    this.dom.finalScoreMsg = document.getElementById('final-score-msg');
    this.dom.retryEncourageBox = document.getElementById('retry-encourage-box');
    this.dom.luckyDrawGate = document.getElementById('lucky-draw-gate');
    this.dom.btnPlayAgain = document.getElementById('btn-play-again');

    this.dom.wheelCanvas = document.getElementById('wheel-canvas');
    this.dom.wheelPointer = document.getElementById('wheel-pointer');
    this.dom.btnSpinWheel = document.getElementById('btn-spin-wheel');
    this.dom.btnSpinWheelCenter = document.getElementById('btn-spin-wheel-center');

    // Modal popup kết quả
    this.dom.prizeModal = document.getElementById('prize-modal');
    this.dom.prizeCategoryTag = document.getElementById('prize-category-tag');
    this.dom.prizeIcon = document.getElementById('prize-icon');
    this.dom.prizeTitle = document.getElementById('prize-title');
    this.dom.prizeDesc = document.getElementById('prize-desc');
    this.dom.btnClosePrize = document.getElementById('btn-close-prize');
  }

  bindEvents() {
    this.dom.btnStart.addEventListener('click', () => this.startGame());
    this.dom.studentNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.startGame();
    });

    this.dom.speakerBtn.addEventListener('click', () => this.readCurrentQuestion());
    this.dom.btnNextFromHint.addEventListener('click', () => {
      window.sounds.playClick();
      this.nextQuestion();
    });

    // Nút quay vòng quay (chỉ cho phép quay 1 lần)
    if (this.dom.btnSpinWheel) {
      this.dom.btnSpinWheel.addEventListener('click', () => this.spinWheel());
    }
    if (this.dom.btnSpinWheelCenter) {
      this.dom.btnSpinWheelCenter.addEventListener('click', () => this.spinWheel());
    }

    // Khi nhận thưởng/phạt xong -> Đóng vòng quay và trở về giao diện ban đầu
    this.dom.btnClosePrize.addEventListener('click', () => {
      this.dom.prizeModal.classList.add('hidden');
      this.resetGame();
    });

    this.dom.btnPlayAgain.addEventListener('click', () => this.resetGame());
  }

  async startGame() {
    const name = this.dom.studentNameInput.value.trim();
    if (!name) {
      alert("Bé ơi, hãy nhập tên của mình để bắt đầu nhé!");
      this.dom.studentNameInput.focus();
      return;
    }

    window.sounds.playClick();
    this.studentName = name;
    this.dom.headerName.textContent = this.studentName;
    this.hasSpun = false; // Reset trạng thái quay cho lượt làm bài mới

    // Tải câu hỏi từ DataManager
    this.questions = await window.dataManager.getQuestions();
    if (!this.questions || this.questions.length === 0) {
      alert("Chưa có câu hỏi nào. Bạn hãy nhờ cô giáo phát hành đề bài nhé!");
      return;
    }

    this.currentIndex = 0;
    this.currentScore = 0;
    this.correctCount = 0;
    this.wrongDetails = [];

    this.dom.joinScreen.classList.add('hidden');
    this.dom.resultScreen.classList.add('hidden');
    if (this.dom.retryEncourageBox) this.dom.retryEncourageBox.classList.add('hidden');
    this.dom.gameScreen.classList.remove('hidden');

    this.loadQuestion(this.currentIndex);
  }

  loadQuestion(index) {
    if (index >= this.questions.length) {
      this.finishGame();
      return;
    }

    this.attempts = 0;
    const q = this.questions[index];

    // Cập nhật Header & Progress
    this.dom.progressText.textContent = `Câu hỏi ${index + 1} / ${this.questions.length}`;
    const percent = ((index) / this.questions.length) * 100;
    this.dom.progressFill.style.width = `${percent}%`;
    this.dom.headerScore.textContent = this.currentScore.toFixed(1);

    // Ẩn badge cảnh báo và hint box
    this.dom.attemptsBadge.classList.add('hidden');
    this.dom.hintBox.classList.add('hidden');

    // Hiển thị nội dung câu hỏi
    this.dom.questionText.textContent = q.text;

    // Tự động phát âm đọc đề bài tiếng Việt cho học sinh lớp 1
    this.readCurrentQuestion();

    // Render vùng trả lời tương ứng theo loại câu hỏi
    this.renderAnswers(q);
  }

  readCurrentQuestion() {
    const q = this.questions[this.currentIndex];
    if (!q) return;

    let fullText = `Câu hỏi số ${this.currentIndex + 1}: ${q.text}`;
    if (q.type === 'choice' && q.options) {
      const letters = ['A', 'B', 'C', 'D'];
      const optStr = q.options.map((opt, i) => `${letters[i] || (i+1)}: ${opt}`).join(". ");
      fullText += ". Các lựa chọn là: " + optStr;
    } else if (q.type === 'tf') {
      fullText += ". Bé hãy chọn Đúng hay Sai?";
    }

    this.dom.speakerBtn.classList.add('speaking');
    window.kidsSpeech.speak(
      fullText,
      () => this.dom.speakerBtn.classList.add('speaking'),
      () => this.dom.speakerBtn.classList.remove('speaking')
    );
  }

  renderAnswers(q) {
    this.dom.answersContainer.innerHTML = '';

    if (q.type === 'choice') {
      const grid = document.createElement('div');
      grid.className = 'answers-grid';
      const letters = ['A', 'B', 'C', 'D'];

      q.options.forEach((optText, i) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.innerHTML = `
          <span class="answer-letter">${letters[i] || (i + 1)}</span>
          <span class="answer-text">${optText}</span>
        `;
        btn.addEventListener('click', () => this.handleAnswerSubmit(optText, btn));
        grid.appendChild(btn);
      });

      this.dom.answersContainer.appendChild(grid);
    } else if (q.type === 'tf') {
      const container = document.createElement('div');
      container.className = 'true-false-container';

      const btnTrue = document.createElement('button');
      btnTrue.className = 'tf-btn true-btn';
      btnTrue.innerHTML = `<span>👍</span><span>ĐÚNG</span>`;
      btnTrue.addEventListener('click', () => this.handleAnswerSubmit('ĐÚNG', btnTrue));

      const btnFalse = document.createElement('button');
      btnFalse.className = 'tf-btn false-btn';
      btnFalse.innerHTML = `<span>👎</span><span>SAI</span>`;
      btnFalse.addEventListener('click', () => this.handleAnswerSubmit('SAI', btnFalse));

      container.appendChild(btnTrue);
      container.appendChild(btnFalse);
      this.dom.answersContainer.appendChild(container);
    } else if (q.type === 'input') {
      const container = document.createElement('div');
      container.className = 'input-answer-container';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'kids-input';
      input.placeholder = '?';
      input.autofocus = true;

      const submitBtn = document.createElement('button');
      submitBtn.className = 'submit-answer-btn';
      submitBtn.textContent = 'Trả lời ngay 🚀';

      const onSub = () => {
        const val = input.value.trim();
        if (!val) return;
        this.handleAnswerSubmit(val, submitBtn);
      };

      submitBtn.addEventListener('click', onSub);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') onSub();
      });

      container.appendChild(input);
      container.appendChild(submitBtn);
      this.dom.answersContainer.appendChild(container);
    }
  }

  // Xử lý nộp câu trả lời & Quy tắc 3 lần thử
  handleAnswerSubmit(userAnswer, btnElement) {
    const q = this.questions[this.currentIndex];
    const isCorrect = this.checkAnswerMatch(userAnswer, q.answer);

    if (isCorrect) {
      // TRẢ LỜI ĐÚNG
      window.sounds.playCorrect();
      if (btnElement && btnElement.classList) {
        btnElement.classList.add('correct');
      }

      // 1. Tung hiệu ứng pháo hoa rực rỡ từ 2 bên màn hình
      if (window.confetti) {
        window.confetti({
          particleCount: 60,
          angle: 60,
          spread: 65,
          origin: { x: 0.05, y: 0.65 }
        });
        window.confetti({
          particleCount: 60,
          angle: 120,
          spread: 65,
          origin: { x: 0.95, y: 0.65 }
        });
        setTimeout(() => {
          window.confetti({
            particleCount: 90,
            spread: 90,
            origin: { x: 0.5, y: 0.45 }
          });
        }, 220);
      }

      // 2. Hiển thị Popup Thông Báo Trả Lời Đúng
      if (this.dom.correctToast) {
        this.dom.correctToast.classList.remove('hidden');
        void this.dom.correctToast.offsetWidth;
        this.dom.correctToast.classList.add('show');
      }

      // 3. Đọc lời khen ngợi khích lệ bằng tiếng Việt
      const praises = [
        "Hoan hô! Bé trả lời hoàn toàn chính xác!",
        "Tuyệt vời quá! Bé làm đúng rồi nè!",
        "Bé giỏi lắm, thêm một câu trả lời đúng!",
        "Chính xác! Bé thông minh quá đi thôi!"
      ];
      const randomPraise = praises[Math.floor(Math.random() * praises.length)];
      window.kidsSpeech.speak(randomPraise);

      // Nếu làm đúng ở lần 1 hoặc lần 2 -> Cộng điểm
      if (this.attempts < 2) {
        const pointsPerQ = 10 / this.questions.length;
        this.currentScore += pointsPerQ;
        this.correctCount++;
        this.dom.headerScore.textContent = this.currentScore.toFixed(1);
      }

      // Khóa tương tác và chuyển sang câu tiếp theo sau 2.2 giây
      this.disableAllAnswerButtons();
      setTimeout(() => {
        if (this.dom.correctToast) {
          this.dom.correctToast.classList.remove('show');
          setTimeout(() => this.dom.correctToast.classList.add('hidden'), 350);
        }
        this.nextQuestion();
      }, 2200);
    } else {
      // TRẢ LỜI SAI
      this.attempts++;
      this.wrongDetails.push({
        questionIndex: this.currentIndex + 1,
        questionText: q.text,
        attempt: this.attempts,
        wrongChoice: userAnswer
      });

      if (this.attempts === 1) {
        // Sai lần 1: Cho làm lại lần 2
        window.sounds.playWrong();
        if (btnElement && btnElement.classList) {
          btnElement.classList.add('wrong');
          setTimeout(() => btnElement.classList.remove('wrong'), 800);
        }
        this.dom.attemptsBadge.classList.remove('hidden');
        this.dom.attemptsBadge.className = 'attempts-badge';
        this.dom.attemptsBadge.innerHTML = `⚠️ Bé chưa chọn đúng rồi! Bé thử lại lần 2 nhé (còn 2 lần)!`;
        window.kidsSpeech.speak("Chưa đúng rồi bé ơi, bé thử lại một lần nữa nhé!");
      } else if (this.attempts === 2) {
        // Sai lần 2: Cho làm lại lần 3
        window.sounds.playWrong();
        if (btnElement && btnElement.classList) {
          btnElement.classList.add('wrong');
          setTimeout(() => btnElement.classList.remove('wrong'), 800);
        }
        this.dom.attemptsBadge.classList.remove('hidden');
        this.dom.attemptsBadge.className = 'attempts-badge warning';
        this.dom.attemptsBadge.innerHTML = `⚡ Vẫn chưa đúng nè! Bé suy nghĩ thật kỹ để chọn lần 3 (lần cuối cùng)!`;
        window.kidsSpeech.speak("Bé cố gắng suy nghĩ thêm chút nữa nhé, đây là lần cuối cùng nha!");
      } else {
        // Sai lần 3: GỢI Ý & KHÔNG TÍNH ĐIỂM
        window.sounds.playHint();
        this.disableAllAnswerButtons();
        this.dom.attemptsBadge.classList.add('hidden');
        this.dom.hintBox.classList.remove('hidden');
        this.dom.hintText.innerHTML = `
          <strong>💡 Lời giải thích gợi ý:</strong> ${q.hint || 'Bé xem lại bài nhé!'}<br>
          <span style="color:#b91c1c; margin-top:6px; display:inline-block;">👉 Đáp án đúng là: <strong>${q.answer}</strong> (Câu này không được cộng điểm bé nha)</span>
        `;
        window.kidsSpeech.speak(`Gợi ý cho bé: ${q.hint}. Đáp án đúng là ${q.answer}`);
      }
    }
  }

  checkAnswerMatch(userVal, correctVal) {
    if (!userVal || !correctVal) return false;
    const u = userVal.toString().trim().toLowerCase();
    const c = correctVal.toString().trim().toLowerCase();
    return u === c;
  }

  disableAllAnswerButtons() {
    const buttons = this.dom.answersContainer.querySelectorAll('button, input');
    buttons.forEach(b => b.disabled = true);
  }

  nextQuestion() {
    this.currentIndex++;
    this.loadQuestion(this.currentIndex);
  }

  async finishGame() {
    this.dom.gameScreen.classList.add('hidden');
    this.dom.resultScreen.classList.remove('hidden');

    const finalScore = Math.min(10, Math.round(this.currentScore * 10) / 10);
    this.dom.finalScoreVal.textContent = finalScore;

    // Lưu kết quả vào cơ sở dữ liệu
    this.currentSubmission = await window.dataManager.recordStudentResult({
      studentName: this.studentName,
      score: finalScore,
      totalQuestions: this.questions.length,
      correctCount: this.correctCount,
      wrongAttempts: this.wrongDetails
    });

    if (finalScore >= 9) {
      // ĐẠT TRÊN 9 ĐIỂM -> MỞ VÒNG QUAY MAY MẮN (QUAY 1 LẦN DUY NHẤT)
      window.sounds.playFanfare();
      if (window.confetti) {
        window.confetti({ particleCount: 130, spread: 85, origin: { y: 0.6 } });
      }

      this.hasSpun = false;
      this.dom.finalScoreMsg.textContent = `🎉 XUẤT SẮC! Bé đã đạt ${finalScore} điểm! Bé được 1 lượt quay Vòng Quay May Mắn duy nhất:`;
      if (this.dom.retryEncourageBox) this.dom.retryEncourageBox.classList.add('hidden');
      this.dom.luckyDrawGate.classList.remove('hidden');

      // Khởi tạo và vẽ Vòng Quay
      this.initLuckyWheel();
      window.kidsSpeech.speak(`Chúc mừng bé đạt ${finalScore} điểm xuất sắc! Bé hãy nhấn nút quay để nhận quà may mắn hoặc thử thách vui nhé!`);
    } else {
      // DƯỚI 9 ĐIỂM -> ĐỘNG VIÊN LÀM LẠI BÀI
      this.dom.finalScoreMsg.textContent = `🌟 Bé đã hoàn thành bài tập với ${finalScore} điểm!`;
      this.dom.luckyDrawGate.classList.add('hidden');
      if (this.dom.retryEncourageBox) this.dom.retryEncourageBox.classList.remove('hidden');

      // Đọc to câu nhắc nhở tiếng Việt theo đúng yêu cầu
      window.kidsSpeech.speak("Em hãy làm lại bài để tham gia quay vòng quay nhé!");
    }
  }

  // ================= VÒNG QUAY MAY MẮN SINH ĐỘNG =================
  initLuckyWheel() {
    this.prizes = window.dataManager.getPrizes();
    const sitRit = this.prizes.sitRit || [];
    const leKhe = this.prizes.leKhe || [];

    // Tạo danh sách các ô xen kẽ giữa Sít Rịt (Thưởng) và Lè Khe (Phạt vui)
    this.wheelSegments = [];
    const colors = [
      { bg: '#ef4444', text: '#ffffff', type: 'sit-rit' }, // Đỏ cờ
      { bg: '#7c3aed', text: '#ffffff', type: 'le-khe' }, // Tím đậm
      { bg: '#f59e0b', text: '#ffffff', type: 'sit-rit' }, // Cam vàng
      { bg: '#0284c7', text: '#ffffff', type: 'le-khe' }, // Xanh dương
      { bg: '#db2777', text: '#ffffff', type: 'sit-rit' }, // Hồng sen
      { bg: '#059669', text: '#ffffff', type: 'le-khe' }, // Xanh ngọc
      { bg: '#ea580c', text: '#ffffff', type: 'sit-rit' }, // Cam lửa
      { bg: '#4f46e5', text: '#ffffff', type: 'le-khe' }  // Chàm tím
    ];

    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) {
        const item = sitRit[(i / 2) % sitRit.length] || { name: '🎁 Quà May Mắn', desc: 'Món quà khích lệ bé' };
        this.wheelSegments.push({
          type: 'sit-rit',
          tag: 'SÍT RỊT',
          icon: '🎁',
          name: item.name,
          desc: item.desc,
          bg: colors[i % colors.length].bg,
          text: colors[i % colors.length].text
        });
      } else {
        const item = leKhe[Math.floor(i / 2) % leKhe.length] || { name: '😜 Nhảy múa vui nhộn', desc: 'Thử thách vui vẻ' };
        this.wheelSegments.push({
          type: 'le-khe',
          tag: 'LÈ KHE',
          icon: '😜',
          name: item.name,
          desc: item.desc,
          bg: colors[i % colors.length].bg,
          text: colors[i % colors.length].text
        });
      }
    }

    this.wheelAngle = 0;
    this.hasSpun = false;

    // Reset trạng thái các nút quay
    if (this.dom.btnSpinWheel) {
      this.dom.btnSpinWheel.disabled = false;
      this.dom.btnSpinWheel.innerHTML = '🎡 BẤM ĐỂ QUAY NGAY 🎯';
    }
    if (this.dom.btnSpinWheelCenter) {
      this.dom.btnSpinWheelCenter.disabled = false;
      this.dom.btnSpinWheelCenter.innerHTML = 'QUAY';
    }

    this.drawWheel(this.wheelAngle);
  }

  drawWheel(angle) {
    const canvas = this.dom.wheelCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 14;

    ctx.clearRect(0, 0, width, height);

    const totalSegs = this.wheelSegments.length;
    const arc = (2 * Math.PI) / totalSegs;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    for (let i = 0; i < totalSegs; i++) {
      const seg = this.wheelSegments[i];
      const startAngle = i * arc;
      const endAngle = (i + 1) * arc;

      // Vẽ cánh quạt màu sắc rực rỡ
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.bg;
      ctx.fill();

      // Viền cánh quạt trắng nổi bật
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Vẽ chữ và icon
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = seg.text;

      // Icon và Tag (SÍT RỊT / LÈ KHE)
      ctx.font = '900 15px Nunito, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${seg.icon} [${seg.tag}]`, radius - 18, -8);

      // Tên rút gọn phần quà / thử thách
      let shortName = seg.name.replace(/^[^\w\s\u00C0-\u1EF9]+/, '').trim();
      if (shortName.length > 13) shortName = shortName.substring(0, 12) + '...';
      ctx.font = '800 13px Nunito, sans-serif';
      ctx.shadowBlur = 3;
      ctx.fillText(shortName, radius - 18, 12);

      ctx.restore();
    }

    // Viền kim loại vàng rực rỡ bên ngoài
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Dải bóng đèn lấp lánh xung quanh viền
    this.bulbPhase = (this.bulbPhase || 0) + 1;
    const bulbCount = 16;
    for (let i = 0; i < bulbCount; i++) {
      const dotAngle = (i * 2 * Math.PI) / bulbCount;
      const dx = (radius + 2) * Math.cos(dotAngle);
      const dy = (radius + 2) * Math.sin(dotAngle);

      ctx.beginPath();
      ctx.arc(dx, dy, 4.5, 0, 2 * Math.PI);
      const isGlowing = (i + Math.floor(this.bulbPhase / 15)) % 2 === 0;
      ctx.fillStyle = isGlowing ? '#fef08a' : '#ffffff';
      ctx.shadowColor = isGlowing ? '#f59e0b' : 'transparent';
      ctx.shadowBlur = isGlowing ? 8 : 0;
      ctx.fill();
    }

    ctx.restore();
  }

  // Thực hiện quay vòng quay (CHỈ QUAY 1 LẦN DUY NHẤT)
  spinWheel() {
    if (this.isSpinning || this.hasSpun || this.wheelSegments.length === 0) return;

    this.isSpinning = true;
    this.hasSpun = true; // Khóa quay, không cho phép quay lại
    window.sounds.playClick();

    // Vô hiệu hóa nút quay ngay lập tức
    if (this.dom.btnSpinWheel) {
      this.dom.btnSpinWheel.disabled = true;
      this.dom.btnSpinWheel.innerHTML = '⏳ ĐANG QUAY HỒI HỘP...';
    }
    if (this.dom.btnSpinWheelCenter) {
      this.dom.btnSpinWheelCenter.disabled = true;
      this.dom.btnSpinWheelCenter.innerHTML = '...';
    }

    // Chọn ngẫu nhiên ô chiến thắng
    const totalSegs = this.wheelSegments.length;
    const winnerIndex = Math.floor(Math.random() * totalSegs);
    const segArc = (2 * Math.PI) / totalSegs;

    // Kim chỉ nằm ở góc 12 giờ (đỉnh vòng quay: 3 * PI / 2)
    const targetAngleAt12 = (3 * Math.PI / 2) - (winnerIndex + 0.5) * segArc;

    // Quay từ 7 đến 9 vòng đầy đủ để tăng độ kịch tính
    const fullSpins = (7 + Math.floor(Math.random() * 2)) * 2 * Math.PI;
    const startAngle = this.wheelAngle % (2 * Math.PI);
    const finalAngle = startAngle + fullSpins + (targetAngleAt12 - (startAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    const duration = 5200; // 5.2 giây kịch tính
    const startTime = performance.now();
    this.lastTickSegment = -1;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing giảm tốc mượt mà (Cubic Ease-Out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + (finalAngle - startAngle) * easeOut;

      this.wheelAngle = currentAngle;
      this.drawWheel(currentAngle);

      // Tính ô hiện tại đang đi qua kim để phát tiếng tạch tạch & lắc kim chỉ
      const normalized = (currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const currentSeg = Math.floor(((3 * Math.PI / 2 - normalized + 2 * Math.PI) % (2 * Math.PI)) / segArc);

      if (currentSeg !== this.lastTickSegment) {
        this.lastTickSegment = currentSeg;
        window.sounds.playWheelTick();

        // Hiệu ứng kim chỉ bị gẩy lắc lư (pointer wobble)
        if (this.dom.wheelPointer) {
          this.dom.wheelPointer.classList.remove('tick-wobble');
          void this.dom.wheelPointer.offsetWidth; // trigger reflow
          this.dom.wheelPointer.classList.add('tick-wobble');
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;

        // Khóa vĩnh viễn nút quay lượt này
        if (this.dom.btnSpinWheel) {
          this.dom.btnSpinWheel.disabled = true;
          this.dom.btnSpinWheel.innerHTML = '🔒 ĐÃ QUAY XONG LƯỢT NÀY';
        }
        if (this.dom.btnSpinWheelCenter) {
          this.dom.btnSpinWheelCenter.disabled = true;
          this.dom.btnSpinWheelCenter.innerHTML = 'XONG';
        }

        // Bật popup chúc mừng kết quả
        this.handleWheelResult(this.wheelSegments[winnerIndex]);
      }
    };

    requestAnimationFrame(animate);
  }

  // Xử lý kết quả sau khi vòng quay dừng
  async handleWheelResult(winner) {
    const isSitRit = (winner.type === 'sit-rit');

    // Hiển thị Modal Popup
    this.dom.prizeCategoryTag.className = `prize-category-tag ${isSitRit ? 'tag-sit-rit' : 'tag-le-khe'}`;
    this.dom.prizeCategoryTag.textContent = isSitRit ? '🎁 BỐC QUÀ SÍT RỊT (MAY MẮN)' : '😜 THỬ THÁCH LÈ KHE (VUI NHỘN)';
    this.dom.prizeIcon.textContent = isSitRit ? '🎊' : '💃';
    this.dom.prizeTitle.textContent = winner.name;
    this.dom.prizeDesc.textContent = winner.desc;

    this.dom.prizeModal.classList.remove('hidden');

    // Âm thanh và hiệu ứng
    if (isSitRit) {
      window.sounds.playSitRit();
      if (window.confetti) {
        window.confetti({ particleCount: 180, spread: 110, origin: { y: 0.5 } });
      }
      window.kidsSpeech.speak(`Tuyệt vời! Bé đã quay trúng phần quà Sít rịt: ${winner.name}!`);
    } else {
      window.sounds.playLeKhe();
      window.kidsSpeech.speak(`Haha, bé đã quay trúng thử thách Lè khe: ${winner.name}! Bé hãy thực hiện thật vui nhé!`);
    }

    // Cập nhật kết quả vào hệ thống & trang Admin
    if (this.currentSubmission && this.currentSubmission.id) {
      await window.dataManager.updateStudentDraw(
        this.currentSubmission.id,
        winner.type,
        winner.name
      );
    }
  }

  // Reset về màn hình ban đầu
  resetGame() {
    this.dom.resultScreen.classList.add('hidden');
    this.dom.gameScreen.classList.add('hidden');
    this.dom.luckyDrawGate.classList.add('hidden');
    if (this.dom.retryEncourageBox) this.dom.retryEncourageBox.classList.add('hidden');

    this.dom.joinScreen.classList.remove('hidden');
    this.dom.studentNameInput.value = '';
    this.dom.studentNameInput.focus();
    this.hasSpun = false;
  }
}

window.studyGame = new StudyGame();
document.addEventListener('DOMContentLoaded', () => {
  window.studyGame.init();
});
