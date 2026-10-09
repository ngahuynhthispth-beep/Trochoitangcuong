/* ========================================================
   LOGIC TRANG QUẢN TRỊ DÀNH CHO GIÁO VIÊN (ADMIN DASHBOARD)
   Quản lý đề bài, tự động phân tích tệp, thêm bớt câu hỏi,
   theo dõi kết quả học sinh & vòng quay may mắn
   ======================================================== */

class AdminApp {
  constructor() {
    this.currentQuestions = [];
    this.prizes = null;
    this.uploadedFile = null;
  }

  async init() {
    this.bindTabs();
    this.bindUploadEvents();
    this.bindQuestionModalEvents();
    this.bindPrizeEvents();
    this.bindSettingsEvents();
    this.bindRealtimeListener();

    // Tải dữ liệu ban đầu
    await this.loadQuestions();
    await this.renderStudentLogs();
    this.renderPrizes();
    this.loadSettings();
    this.updateConnectionStatus();
  }

  // Chuyển đổi giữa các Tab
  bindTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        if (targetId === 'tab-students') {
          this.renderStudentLogs();
        }
      });
    });
  }

  updateConnectionStatus() {
    const statusElem = document.getElementById('firebase-status-chip');
    if (!statusElem) return;

    if (window.dataManager.isFirebaseConnected()) {
      statusElem.className = 'status-chip online';
      statusElem.innerHTML = `<span class="status-dot"></span> Đã kết nối Firebase (Online)`;
    } else {
      statusElem.className = 'status-chip local';
      statusElem.innerHTML = `<span class="status-dot"></span> Chế độ Cục bộ (Local / Offline)`;
    }
  }

  // ================= TAB 1: QUẢN LÝ & TẢI ĐỀ BÀI =================
  async loadQuestions() {
    this.currentQuestions = await window.dataManager.getQuestions();
    this.renderQuestionsList();
  }

  renderQuestionsList() {
    const container = document.getElementById('questions-preview-list');
    const countBadge = document.getElementById('questions-count-badge');
    if (!container) return;

    countBadge.textContent = `${this.currentQuestions.length} câu hỏi`;
    container.innerHTML = '';

    if (this.currentQuestions.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 36px 20px; color: #64748b; background: white; border-radius: 12px; border: 2px dashed #cbd5e1;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">📝</div>
          <p style="font-weight: 700; font-size: 1.05rem;">Chưa có câu hỏi nào trong đề bài!</p>
          <p style="font-size: 0.9rem; margin-top: 4px;">Cô hãy tải tệp Word, PDF lên, chọn đề mẫu hoặc bấm <strong>"+ Thêm Câu Hỏi Mới"</strong> để bắt đầu soạn đề nhé.</p>
        </div>
      `;
      return;
    }

    this.currentQuestions.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'question-item';

      let optionsHtml = '';
      if (q.type === 'choice' && q.options && q.options.length > 0) {
        optionsHtml = `
          <div class="q-options">
            ${q.options.map((opt, optIdx) => {
              const letters = ['A', 'B', 'C', 'D'];
              const isCorrect = (opt.trim().toLowerCase() === (q.answer || '').trim().toLowerCase()) || (q.answer === letters[optIdx]);
              return `
                <div class="q-opt ${isCorrect ? 'correct' : ''}">
                  <strong>${letters[optIdx] || (optIdx + 1)}:</strong> ${opt} ${isCorrect ? '✓ (Đáp án Đúng)' : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (q.type === 'tf') {
        const isTrue = (q.answer || '').toUpperCase() === 'ĐÚNG';
        optionsHtml = `
          <div class="q-options">
            <div class="q-opt ${isTrue ? 'correct' : ''}">ĐÚNG 👍 ${isTrue ? '✓ (Đáp án Đúng)' : ''}</div>
            <div class="q-opt ${!isTrue ? 'correct' : ''}">SAI 👎 ${!isTrue ? '✓ (Đáp án Đúng)' : ''}</div>
          </div>
        `;
      } else if (q.type === 'input') {
        optionsHtml = `
          <div style="font-size: 0.95rem; margin-bottom: 8px; background: #f0fdf4; padding: 8px 12px; border-radius: 8px; border: 1px solid #bbf7d0;">
            <strong>Đáp án điền chính xác:</strong> <span style="color:#16a34a; font-weight:800; font-size: 1.1rem;">${q.answer}</span>
          </div>
        `;
      }

      item.innerHTML = `
        <div class="q-header">
          <span class="q-num">Câu ${idx + 1}</span>
          <span class="q-type-badge">${q.type === 'choice' ? 'Trắc nghiệm 4 đáp án' : (q.type === 'tf' ? 'Đúng / Sai' : 'Điền số/chữ')}</span>
        </div>
        <div class="q-text" style="font-size: 1.1rem; font-weight: 800; color: #1e1b4b; margin-bottom: 12px;">${q.text}</div>
        ${optionsHtml}
        <div class="q-hint" style="margin-top: 8px;">💡 <strong>Gợi ý khi sai 3 lần:</strong> ${q.hint || 'Bé suy nghĩ kỹ nhé!'}</div>
        
        <!-- NÚT SỬA VÀ BỚT (XÓA) CÂU HỎI -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
          <button class="btn-outline" style="color: #4f46e5; border-color: #818cf8; font-weight: 700; padding: 6px 14px;" onclick="window.adminApp.openEditQuestionModal(${idx})">
            ✏️ Sửa Câu Này
          </button>
          <button class="btn-outline" style="color: #ef4444; border-color: #fca5a5; font-weight: 700; padding: 6px 14px;" onclick="window.adminApp.deleteQuestion(${idx})">
            🗑️ Bớt Câu Này (Xóa)
          </button>
        </div>
      `;

      container.appendChild(item);
    });
  }

  // Bớt (Xóa) câu hỏi
  deleteQuestion(index) {
    const q = this.currentQuestions[index];
    const qName = q ? q.text.substring(0, 30) + '...' : `Câu số ${index + 1}`;
    if (confirm(`Cô có chắc chắn muốn bớt (xóa) "${qName}" khỏi đề bài không?`)) {
      this.currentQuestions.splice(index, 1);
      this.renderQuestionsList();
    }
  }

  // ================= MODAL THÊM / SỬA CÂU HỎI =================
  bindQuestionModalEvents() {
    const btnAddTop = document.getElementById('btn-add-question-top');
    const btnAddBottom = document.getElementById('btn-add-question-bottom');
    const modal = document.getElementById('question-modal');
    const btnClose = document.getElementById('btn-close-q-modal');
    const btnCancel = document.getElementById('btn-cancel-q-modal');
    const btnSave = document.getElementById('btn-save-q-modal');
    const typeSelect = document.getElementById('modal-q-type');

    if (btnAddTop) btnAddTop.addEventListener('click', () => this.openAddQuestionModal());
    if (btnAddBottom) btnAddBottom.addEventListener('click', () => this.openAddQuestionModal());
    if (btnClose) btnClose.addEventListener('click', () => this.closeQuestionModal());
    if (btnCancel) btnCancel.addEventListener('click', () => this.closeQuestionModal());

    // Chuyển đổi hiển thị form khi chọn loại câu hỏi khác nhau
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        const val = typeSelect.value;
        const choiceGroup = document.getElementById('modal-choice-group');
        const tfGroup = document.getElementById('modal-tf-group');
        const inputGroup = document.getElementById('modal-input-group');

        if (choiceGroup) choiceGroup.classList.toggle('hidden', val !== 'choice');
        if (tfGroup) tfGroup.classList.toggle('hidden', val !== 'tf');
        if (inputGroup) inputGroup.classList.toggle('hidden', val !== 'input');
      });
    }

    // Nút Lưu câu hỏi
    if (btnSave) {
      btnSave.addEventListener('click', () => this.saveQuestionFromModal());
    }
  }

  openAddQuestionModal() {
    document.getElementById('modal-q-index').value = '-1';
    document.getElementById('q-modal-title').innerHTML = `<span>➕</span> Thêm Câu Hỏi Mới`;
    document.getElementById('modal-q-text').value = '';
    document.getElementById('modal-q-type').value = 'choice';
    document.getElementById('modal-q-type').dispatchEvent(new Event('change'));

    document.getElementById('modal-opt-0').value = '';
    document.getElementById('modal-opt-1').value = '';
    document.getElementById('modal-opt-2').value = '';
    document.getElementById('modal-opt-3').value = '';

    const radios = document.getElementsByName('modal-correct-choice');
    if (radios.length > 0) radios[0].checked = true;

    document.getElementById('modal-tf-answer').value = 'ĐÚNG';
    document.getElementById('modal-input-answer').value = '';
    document.getElementById('modal-q-hint').value = '';

    document.getElementById('question-modal').classList.remove('hidden');
    document.getElementById('modal-q-text').focus();
  }

  openEditQuestionModal(index) {
    const q = this.currentQuestions[index];
    if (!q) return;

    document.getElementById('modal-q-index').value = index;
    document.getElementById('q-modal-title').innerHTML = `<span>✏️</span> Chỉnh Sửa Câu Số ${index + 1}`;
    document.getElementById('modal-q-text').value = q.text || '';
    document.getElementById('modal-q-type').value = q.type || 'choice';
    document.getElementById('modal-q-type').dispatchEvent(new Event('change'));

    if (q.type === 'choice' && q.options) {
      document.getElementById('modal-opt-0').value = q.options[0] || '';
      document.getElementById('modal-opt-1').value = q.options[1] || '';
      document.getElementById('modal-opt-2').value = q.options[2] || '';
      document.getElementById('modal-opt-3').value = q.options[3] || '';

      const radios = document.getElementsByName('modal-correct-choice');
      let matched = false;
      q.options.forEach((opt, idx) => {
        if (opt.trim().toLowerCase() === (q.answer || '').trim().toLowerCase() && radios[idx]) {
          radios[idx].checked = true;
          matched = true;
        }
      });
      if (!matched && radios[0]) radios[0].checked = true;
    } else if (q.type === 'tf') {
      document.getElementById('modal-tf-answer').value = (q.answer || '').toUpperCase() === 'SAI' ? 'SAI' : 'ĐÚNG';
    } else if (q.type === 'input') {
      document.getElementById('modal-input-answer').value = q.answer || '';
    }

    document.getElementById('modal-q-hint').value = q.hint || '';
    document.getElementById('question-modal').classList.remove('hidden');
  }

  closeQuestionModal() {
    document.getElementById('question-modal').classList.add('hidden');
  }

  saveQuestionFromModal() {
    const text = document.getElementById('modal-q-text').value.trim();
    if (!text) {
      alert("Vui lòng nhập nội dung câu hỏi!");
      document.getElementById('modal-q-text').focus();
      return;
    }

    const type = document.getElementById('modal-q-type').value;
    let options = [];
    let answer = '';

    if (type === 'choice') {
      const opt0 = document.getElementById('modal-opt-0').value.trim();
      const opt1 = document.getElementById('modal-opt-1').value.trim();
      const opt2 = document.getElementById('modal-opt-2').value.trim();
      const opt3 = document.getElementById('modal-opt-3').value.trim();

      if (!opt0 || !opt1) {
        alert("Vui lòng nhập ít nhất 2 đáp án lựa chọn!");
        return;
      }

      options = [opt0, opt1];
      if (opt2) options.push(opt2);
      if (opt3) options.push(opt3);

      const radios = document.getElementsByName('modal-correct-choice');
      let selectedIdx = 0;
      for (let i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
          selectedIdx = i;
          break;
        }
      }
      answer = options[selectedIdx] || options[0];
    } else if (type === 'tf') {
      options = ['ĐÚNG', 'SAI'];
      answer = document.getElementById('modal-tf-answer').value;
    } else if (type === 'input') {
      options = [];
      answer = document.getElementById('modal-input-answer').value.trim();
      if (!answer) {
        alert("Vui lòng nhập đáp án điền chính xác!");
        document.getElementById('modal-input-answer').focus();
        return;
      }
    }

    const hint = document.getElementById('modal-q-hint').value.trim() || 'Bé đọc kỹ câu hỏi và làm lại nhé!';
    const index = parseInt(document.getElementById('modal-q-index').value, 10);

    const questionObj = {
      id: index >= 0 && this.currentQuestions[index] ? this.currentQuestions[index].id : 'q_' + Date.now(),
      type: type,
      text: text,
      options: options,
      answer: answer,
      hint: hint
    };

    if (index >= 0) {
      this.currentQuestions[index] = questionObj;
    } else {
      this.currentQuestions.push(questionObj);
    }

    this.renderQuestionsList();
    this.closeQuestionModal();
    alert("Đã lưu câu hỏi vào danh sách đề bài thành công!");
  }

  // ================= TẢI TỆP ĐỀ BÀI =================
  bindUploadEvents() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('exercise-file-input');
    const btnParse = document.getElementById('btn-parse-exercise');
    const btnPublish = document.getElementById('btn-publish-quiz');
    const btnSampleMath = document.getElementById('btn-sample-math');
    const btnSampleViet = document.getElementById('btn-sample-viet');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#4f46e5';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#818cf8';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#818cf8';
      if (e.dataTransfer.files.length > 0) {
        this.handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelected(e.target.files[0]);
      }
    });

    // Nút "Phân tích bài tập"
    btnParse.addEventListener('click', async () => {
      const rawText = document.getElementById('manual-text-input').value.trim();
      if (!this.uploadedFile && !rawText) {
        alert("Vui lòng chọn một tệp bài tập (.docx, .pdf, .txt, .json) hoặc dán nội dung bài tập vào ô bên dưới!");
        return;
      }

      const apiKey = window.dataManager.getGeminiKey();
      btnParse.disabled = true;
      btnParse.innerHTML = `⏳ Đang tự động phân tích câu hỏi...`;

      try {
        let parsed = [];
        if (rawText && rawText.length > 0) {
          parsed = await window.exerciseParser.parseFileOrText(rawText, apiKey);
        } else if (this.uploadedFile) {
          parsed = await window.exerciseParser.parseFileOrText(this.uploadedFile, apiKey);
        }

        if (parsed && parsed.length > 0) {
          this.currentQuestions = parsed;
          this.renderQuestionsList();

          // TỰ ĐỘNG LƯU VÀ PHÁT HÀNH NGAY LẬP TỨC CHO HỌC SINH
          await window.dataManager.saveQuestions(this.currentQuestions);
          alert(`🎉 TUYỆT VỜI!\n\nHệ thống đã tự động phân tích thành công ${parsed.length} câu hỏi từ đề bài và ĐÃ TỰ ĐỘNG PHÁT HÀNH cho học sinh!\n\nHọc sinh ở nhà mở ứng dụng là có thể làm bài ngay lập tức mà cô không cần phải cập nhật từng câu nữa!`);
        } else {
          alert("⚠️ Chưa nhận diện được câu hỏi từ nội dung này!\n\nCô hãy kiểm tra:\n1. Nếu là tệp PDF dạng ảnh chụp/scan (không bôi đen chữ được), hệ thống không đọc được lớp chữ. Cô hãy dùng file Word (.docx) hoặc dán trực tiếp chữ vào ô nhé!\n2. Đảm bảo nội dung có cấu trúc câu hỏi (như: 'Câu 1:', 'Bài 1:', 'A. B. C. D' hoặc phép tính '4 + 3 = ...').");
        }
      } catch (err) {
        alert("Lỗi khi phân tích: " + err.message);
      } finally {
        btnParse.disabled = false;
        btnParse.innerHTML = `⚡ Tự Động Phân Tích Bài Tập`;
      }
    });

    // Nút "Phát hành cho học sinh" (Giữ lại để cô giáo có thể bấm cập nhật thủ công nếu muốn sau khi sửa)
    btnPublish.addEventListener('click', async () => {
      if (this.currentQuestions.length === 0) {
        alert("Danh sách câu hỏi đang trống! Cô hãy tải tệp hoặc thêm câu hỏi trước.");
        return;
      }

      await window.dataManager.saveQuestions(this.currentQuestions);
      alert(`🎉 Đã cập nhật và phát hành ${this.currentQuestions.length} câu hỏi thành công! Học sinh mở app là nhận được ngay đề mới!`);
    });

    // Nạp đề mẫu Toán Lớp 1
    btnSampleMath.addEventListener('click', () => {
      document.getElementById('manual-text-input').value = `PHIẾU ÔN TẬP TOÁN LỚP 1
Bài 1. Tính:
3 + 2 = ...
5 - 1 = ...
6 + 4 = ...
8 - 3 = ...

Bài 2. Điền dấu >, <, = vào chỗ chấm:
4 ... 6
7 ... 3
5 ... 5

Bài 3. Khoanh vào chữ cái đặt trước câu trả lời đúng:
Số liền sau của số 9 là số nào?
A. 8     B. 10     C. 7     D. 6
Đáp án: B`;
      alert("Đã điền nội dung Đề Mẫu Toán Lớp 1! Cô hãy nhấn nút 'Tự Động Phân Tích Bài Tập' nhé.");
    });

    // Nạp đề mẫu Tiếng Việt Lớp 1 (Phù hợp chuẩn phiếu ôn tập cuối tuần)
    btnSampleViet.addEventListener('click', () => {
      document.getElementById('manual-text-input').value = `Họ và tên: ............ Lớp: 1A ............ Nhận xét của giáo viên: ............
PHIẾU ÔN TẬP CUỐI TUẦN 3 Môn Tiếng Việt
Bài tập 1. Đọc. (HS đọc xong, PH đọc lại nội dung trong bảng để các em rèn kĩ năng nghe viết vào vở nháp)
o d đ ô ơ
dế cô đỏ cò dạ cọ đò bờ đê đỡ bé ô đỏ cá cờ cô bé cờ đỏ
Bò, bê có cỏ. Bà đỡ bé. Bố có bể cá.

Bài tập 2. Điền d hay đ vào chỗ chấm:
a) ...ế mèn
b) bờ ...ê
c) cờ ...ỏ
d) cá ...ạ

Bài tập 3. Tìm từ có chứa âm đ:
A. cò
B. đò
C. cô bé
D. dạ
Đáp án: B

Bài tập 4. Tô màu vào từ ngữ có chứa âm ô:
ô đỏ, cá cờ, bờ đê, cô bé`;
      alert("Đã nạp nội dung Đề Mẫu Tiếng Việt Lớp 1! Cô hãy nhấn nút 'Tự Động Phân Tích Bài Tập' nhé.");
    });
  }

  // Xử lý khi cô giáo chọn tệp (Tự động đọc, phân tích và phát hành tức thì)
  async handleFileSelected(file) {
    this.uploadedFile = file;
    const nameLabel = document.getElementById('selected-file-name');
    nameLabel.innerHTML = `📄 Đang đọc tệp: <strong>${file.name}</strong> (${Math.round(file.size / 1024)} KB)...`;

    try {
      const text = await window.exerciseParser.readFileContent(file);
      const manualInput = document.getElementById('manual-text-input');
      if (manualInput) manualInput.value = text;

      nameLabel.innerHTML = `⏳ Đang tự động phân tích tệp <strong>${file.name}</strong>...`;

      // Tự động phân tích ngay lập tức
      const apiKey = window.dataManager.getGeminiKey();
      const parsed = await window.exerciseParser.parseFileOrText(text, apiKey);

      if (parsed && parsed.length > 0) {
        this.currentQuestions = parsed;
        this.renderQuestionsList();

        // TỰ ĐỘNG LƯU VÀ PHÁT HÀNH TỨC THÌ CHO HỌC SINH
        await window.dataManager.saveQuestions(this.currentQuestions);

        nameLabel.innerHTML = `🚀 <strong style="color: #16a34a;">ĐÃ TỰ ĐỘNG PHÂN TÍCH & PHÁT HÀNH ${parsed.length} CÂU HỎI THÀNH CÔNG!</strong>`;
        alert(`🎉 TUYỆT VỜI!\n\nHệ thống đã tự động đọc file "${file.name}", phân tích thông minh thành ${parsed.length} câu hỏi và ĐÃ TỰ ĐỘNG PHÁT HÀNH cho học sinh!\n\nHọc sinh ở nhà mở ứng dụng là làm được bài ngay lập tức mà cô không cần phải cập nhật từng câu nữa!`);
      } else {
        nameLabel.innerHTML = `⚠️ Đã tải văn bản vào ô dưới. Cô hãy bấm "⚡ Tự Động Phân Tích Bài Tập" nhé.`;
      }
    } catch (err) {
      alert("⚠️ " + err.message);
      nameLabel.innerHTML = `❌ ${err.message}`;
    }
  }

  // ================= TAB 2: NHẬT KÝ HỌC SINH & BỐC THĂM =================
  async renderStudentLogs() {
    const tbody = document.getElementById('student-logs-tbody');
    if (!tbody) return;

    const logs = await window.dataManager.getAllStudentLogs();

    // Thống kê nhanh
    const totalStudents = logs.length;
    const avgScore = totalStudents > 0 
      ? (logs.reduce((acc, l) => acc + (l.score || 0), 0) / totalStudents).toFixed(1)
      : '0.0';
    const sitRitCount = logs.filter(l => l.drawType === 'sit-rit').length;
    const leKheCount = logs.filter(l => l.drawType === 'le-khe').length;

    document.getElementById('stat-total-students').textContent = totalStudents;
    document.getElementById('stat-avg-score').textContent = avgScore;
    document.getElementById('stat-sit-rit-count').textContent = sitRitCount;
    document.getElementById('stat-le-khe-count').textContent = leKheCount;

    tbody.innerHTML = '';
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;">Chưa có học sinh nào làm bài.</td></tr>`;
      return;
    }

    logs.forEach(log => {
      const tr = document.createElement('tr');

      // Phân loại màu sắc điểm số
      let scoreClass = 'high';
      if (log.score < 7) scoreClass = 'low';
      else if (log.score < 9) scoreClass = 'medium';

      // Badge bốc xăm
      let drawBadge = '<span style="color: #94a3b8; font-size: 0.85rem;">Chưa quay</span>';
      if (log.drawType === 'sit-rit') {
        drawBadge = `<span class="badge-sit-rit">🎁 SÍT RỊT</span>`;
      } else if (log.drawType === 'le-khe') {
        drawBadge = `<span class="badge-le-khe">😜 LÈ KHE</span>`;
      }

      // Chi tiết sai
      const wrongCount = log.wrongAttempts ? log.wrongAttempts.length : 0;
      const wrongText = wrongCount > 0 ? `<span style="color:#ef4444; font-weight:700;">${wrongCount} lần sai</span>` : `<span style="color:#10b981; font-weight:700;">Làm đúng hết!</span>`;

      tr.innerHTML = `
        <td><strong>${log.studentName}</strong></td>
        <td><span class="score-pill ${scoreClass}">${log.score} / 10</span></td>
        <td>${log.correctCount || 0} / ${log.totalQuestions || 5} câu</td>
        <td>${wrongText}</td>
        <td>${drawBadge}</td>
        <td><strong style="color:#1e1b4b;">${log.drawPrize || '---'}</strong></td>
        <td style="color:#64748b; font-size:0.85rem;">${log.timestamp}</td>
      `;

      tbody.appendChild(tr);
    });
  }

  // ================= TAB 3: KHO QUÀ & THỬ THÁCH =================
  renderPrizes() {
    this.prizes = window.dataManager.getPrizes();

    const sitRitList = document.getElementById('sit-rit-prizes-list');
    const leKheList = document.getElementById('le-khe-prizes-list');

    sitRitList.innerHTML = '';
    (this.prizes.sitRit || []).forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'prize-item';
      li.innerHTML = `
        <div>
          <div>${item.name}</div>
          <small style="color:#64748b;">${item.desc}</small>
        </div>
        <button class="btn-del-prize" onclick="window.adminApp.removePrize('sitRit', ${idx})">✕</button>
      `;
      sitRitList.appendChild(li);
    });

    leKheList.innerHTML = '';
    (this.prizes.leKhe || []).forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'prize-item';
      li.innerHTML = `
        <div>
          <div>${item.name}</div>
          <small style="color:#64748b;">${item.desc}</small>
        </div>
        <button class="btn-del-prize" onclick="window.adminApp.removePrize('leKhe', ${idx})">✕</button>
      `;
      leKheList.appendChild(li);
    });
  }

  removePrize(type, idx) {
    if (confirm("Cô có chắc muốn xóa mục này không?")) {
      this.prizes[type].splice(idx, 1);
      window.dataManager.savePrizes(this.prizes);
      this.renderPrizes();
    }
  }

  bindPrizeEvents() {
    document.getElementById('btn-add-sit-rit').addEventListener('click', () => {
      const name = prompt("Nhập tên phần quà SÍT RỊT mới (VD: 🎁 Hộp bút chì sáp màu):");
      if (name) {
        const desc = prompt("Nhập mô tả phần quà:", "Phần thưởng khích lệ bé học tốt");
        this.prizes.sitRit.push({ id: 'sr_' + Date.now(), name: name.trim(), desc: desc || '' });
        window.dataManager.savePrizes(this.prizes);
        this.renderPrizes();
      }
    });

    document.getElementById('btn-add-le-khe').addEventListener('click', () => {
      const name = prompt("Nhập tên thử thách LÈ KHE mới (VD: 🧹 Quét sạch sân nhà giúp bố mẹ):");
      if (name) {
        const desc = prompt("Nhập mô tả nhiệm vụ vui:", "Thử thách vừa sức học sinh lớp 1");
        this.prizes.leKhe.push({ id: 'lk_' + Date.now(), name: name.trim(), desc: desc || '' });
        window.dataManager.savePrizes(this.prizes);
        this.renderPrizes();
      }
    });
  }

  // ================= TAB 4: CÀI ĐẶT HỆ THỐNG =================
  loadSettings() {
    // Gemini Key
    const geminiKey = window.dataManager.getGeminiKey();
    if (geminiKey) {
      document.getElementById('gemini-api-key-input').value = geminiKey;
    }

    // Firebase Config
    const fbConfig = window.dataManager.getFirebaseConfig();
    if (fbConfig) {
      document.getElementById('firebase-config-input').value = JSON.stringify(fbConfig, null, 2);
    }
  }

  bindSettingsEvents() {
    // Lưu Gemini Key
    document.getElementById('btn-save-gemini-key').addEventListener('click', () => {
      const key = document.getElementById('gemini-api-key-input').value.trim();
      window.dataManager.saveGeminiKey(key);
      alert("Đã lưu Gemini API Key! Khi phân tích bài tập, hệ thống sẽ tự động dùng AI của Google.");
    });

    // Lưu Firebase Config
    document.getElementById('btn-save-firebase-config').addEventListener('click', () => {
      const val = document.getElementById('firebase-config-input').value.trim();
      if (!val) {
        localStorage.removeItem('lop1_firebase_config');
        alert("Đã xóa cấu hình Firebase. Ứng dụng chuyển về chế độ Cục bộ (Local).");
        this.updateConnectionStatus();
        return;
      }

      try {
        const parsed = JSON.parse(val);
        window.dataManager.saveFirebaseConfig(parsed);
        this.updateConnectionStatus();
        alert("Đã lưu cấu hình Firebase! Dữ liệu của học sinh ở nhà sẽ được tự động đồng bộ qua mạng Internet.");
      } catch (err) {
        alert("Định dạng JSON cấu hình Firebase không hợp lệ! Vui lòng kiểm tra lại dấu ngoặc và dấu phẩy.");
      }
    });

    // Nút xóa lịch sử học sinh
    document.getElementById('btn-clear-logs').addEventListener('click', async () => {
      if (confirm("Cô có chắc chắn muốn xóa toàn bộ lịch sử làm bài của học sinh để bắt đầu tuần mới?")) {
        await window.dataManager.clearAllLogs();
        await this.renderStudentLogs();
        alert("Đã dọn dẹp sạch nhật ký làm bài!");
      }
    });

    // Nút xuất Excel
    document.getElementById('btn-export-excel').addEventListener('click', async () => {
      const logs = await window.dataManager.getAllStudentLogs();
      if (logs.length === 0) {
        alert("Chưa có dữ liệu để xuất file!");
        return;
      }

      if (window.XLSX) {
        const rows = logs.map(l => ({
          "Tên Học Sinh": l.studentName,
          "Điểm Số": l.score,
          "Số Câu Đúng": `${l.correctCount}/${l.totalQuestions}`,
          "Số Lần Làm Sai": l.wrongAttempts ? l.wrongAttempts.length : 0,
          "Bốc Thăm": l.drawType === 'sit-rit' ? 'Sít Rịt' : (l.drawType === 'le-khe' ? 'Lè Khe' : 'Chưa quay'),
          "Phần Quà / Thử Thách": l.drawPrize || '',
          "Thời Gian Nộp Bài": l.timestamp
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "KetQuaOnTapLop1");
        XLSX.writeFile(wb, `KetQua_OnTap_Lop1_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
      } else {
        alert("Thư viện xuất Excel đang được tải...");
      }
    });
  }

  // Lắng nghe cập nhật thời gian thực từ tab học sinh
  bindRealtimeListener() {
    if (window.dataManager.channel) {
      window.dataManager.channel.onmessage = (event) => {
        if (event.data?.type === 'STUDENT_SUBMITTED' || event.data?.type === 'STUDENT_DRAW_UPDATED') {
          console.log("Phát hiện học sinh mới nộp bài hoặc bốc xăm!", event.data);
          this.renderStudentLogs();
        }
      };
    }
  }
}

window.adminApp = new AdminApp();
document.addEventListener('DOMContentLoaded', () => {
  window.adminApp.init();
});
