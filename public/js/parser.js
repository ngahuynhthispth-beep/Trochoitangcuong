/* ========================================================
   BỘ PHÂN TÍCH TỆP BÀI TẬP LỚP 1 TỰ ĐỘNG THÔNG MINH (GRADE 1 PARSER ENGINE)
   Hỗ trợ đọc file Word (.docx), văn bản (.txt, .json, .md)
   Tự động bóc tách và phân loại chuyên sâu cho học sinh lớp 1:
   - Bài đọc Tiếng Việt (Âm, vần, tiếng, câu, đọc hiểu)
   - Điền âm / vần / chữ khuyết (d/đ, c/k, g/gh, ng/ngh, s/x, tr/ch...)
   - Bài tập Toán (Cộng, trừ, điền dấu >, <, =)
   - Bài tập Tô màu / Khoanh tròn / Chọn từ
   - Trắc nghiệm A, B, C, D (kể cả cùng dòng)
   - Đúng / Sai (Đ / S)
   ======================================================== */

class ExerciseParser {
  constructor() {
    // Từ điển từ vựng chuẩn SGK Tiếng Việt Lớp 1 (Kết nối tri thức / Cánh diều / Chân trời sáng tạo)
    this.grade1Vocab = {
      'd': ['dế', 'dế mèn', 'dạ', 'da', 'dẻ', 'dỗ', 'dù', 'dừa', 'dưa', 'dê', 'dịu', 'dạy', 'dắt', 'dòng'],
      'đ': ['đỏ', 'đò', 'đê', 'đỡ', 'đi', 'đá', 'đậu', 'đèn', 'đồng', 'đường', 'đũa', 'đĩa', 'đua', 'đo', 'đạp', 'đồ'],
      'c': ['cá', 'cò', 'cỏ', 'cô', 'cọ', 'cơm', 'cây', 'con', 'cửa', 'cam', 'cờ', 'cầu', 'cú', 'củ'],
      'k': ['kéo', 'kính', 'kẻ', 'kìm', 'kẹo', 'kể', 'kiến', 'kem', 'kỳ', 'khe', 'khỉ'],
      'g': ['gà', 'gỗ', 'gạo', 'gần', 'gấu', 'gối', 'gạch', 'gõ', 'gù', 'gật'],
      'gh': ['ghế', 'ghi', 'ghé', 'ghép', 'ghẻ', 'ghẹ'],
      'ng': ['ngà', 'ngủ', 'ngựa', 'ngô', 'ngỗng', 'ngày', 'ngắn', 'ngon', 'ngọc'],
      'ngh': ['nghé', 'nghỉ', 'nghe', 'nghĩ', 'nghèo', 'nghiên'],
      's': ['sẻ', 'sóc', 'sông', 'sao', 'sữa', 'sân', 'sách', 'sâu', 'sen'],
      'x': ['xe', 'xinh', 'xôi', 'xu', 'xanh', 'xoài', 'xẻng', 'xóm'],
      'tr': ['tròn', 'trăng', 'trời', 'tre', 'trâu', 'trứng', 'trưa', 'trường'],
      'ch': ['chó', 'mèo', 'chim', 'chuối', 'chợ', 'chân', 'chữ', 'chồi']
    };
  }

  // Đọc nội dung thô từ file tải lên
  async readFileContent(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'docx') {
      if (window.mammoth) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
          return result.value;
        } catch (err) {
          throw new Error("Không thể đọc tệp Word (.docx): " + err.message);
        }
      } else {
        throw new Error("Thư viện đọc file Word (.docx) chưa sẵn sàng. Bạn vui lòng thử lại sau vài giây!");
      }
    } else if (ext === 'pdf') {
      const pdfLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      if (!pdfLib) {
        throw new Error("Thư viện đọc file PDF (.pdf) chưa sẵn sàng. Bạn vui lòng thử lại sau vài giây!");
      }
      try {
        if (pdfLib.GlobalWorkerOptions) {
          pdfLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/js/pdf.worker.min.js';
        }
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent({ includeMarkedContent: true });
          let lastY = null;
          let pageText = '';
          for (const item of textContent.items) {
            if (!item.str) continue;
            const currentY = item.transform ? item.transform[5] : null;
            if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
              pageText += '\n';
            } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
              pageText += ' ';
            }
            pageText += item.str;
            if (currentY !== null) lastY = currentY;
          }
          fullText += pageText.trim() + '\n\n';
        }
        fullText = fullText.trim();
        if (!fullText) {
          throw new Error("Tệp PDF này là dạng hình ảnh scan/chụp (không có lớp chữ). Cô hãy dùng tệp Word (.docx) hoặc dán chữ đề bài vào ô bên dưới nhé!");
        }
        return fullText;
      } catch (err) {
        throw new Error(err.message || "Không thể đọc tệp PDF.");
      }
    } else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext) || (file.type && file.type.startsWith('image/'))) {
      if (window.Tesseract) {
        try {
          const ret = await Tesseract.recognize(file, 'vie', {
            logger: m => console.log(m)
          });
          const ocrText = (ret && ret.data && ret.data.text) ? ret.data.text.trim() : '';
          if (!ocrText) {
            throw new Error("Không nhận diện được chữ rõ ràng từ ảnh này. Cô hãy đảm bảo ảnh chụp đủ sáng và rõ nét nhé!");
          }
          return ocrText;
        } catch (err) {
          throw new Error("Lỗi khi đọc ảnh (OCR): " + err.message);
        }
      } else {
        throw new Error("Thư viện nhận diện chữ Tesseract chưa tải xong. Bạn vui lòng thử lại sau vài giây!");
      }
    } else if (ext === 'json') {
      return await file.text();
    } else {
      // txt, csv, md
      return await file.text();
    }
  }

  // 1. Lọc bỏ hoàn toàn nhiễu tiêu đề trang bài tập (Header & Metadata)
  cleanHeaderNoise(text) {
    if (!text) return '';
    const lines = text.split(/\r?\n/);
    const cleanedLines = [];
    let isHeaderArea = true;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      // Nhận diện dòng bắt đầu bài tập thực sự -> chấm dứt vùng Header
      if (/^(bài\s*(tập)?\s*(\d+|[ivx]+)|câu\s*(\d+|[ivx]+)|phần\s*(\d+|[ivx]+)|đề\s*bài|(\d+)[\.\:\)\/-])/i.test(line)) {
        isHeaderArea = false;
      }

      // Kiểm tra dòng tiêu đề trường, tên học sinh, lớp, điểm, nhận xét, phiếu cuối tuần
      const isNoise = /^(họ\s*(và|&)?\s*tên|lớp\b|trường\b|điểm\s*[:\.]|nhận\s*xét|lời\s*phê|chữ\s*ký|ngày\s*\d+|thời\s*gian\s*làm\s*bài|phiếu\s*(ôn\s*tập|bài\s*tập|cuối\s*tuần|học\s*tập)|đề\s*(kiểm\s*tra|ôn\s*tập|thi)|môn\s*[:\.]|tuần\s*\d+|kiến\s*thức\s*trọng\s*tâm)/i.test(line);

      // Ghi chú phụ huynh / giáo viên trong ngoặc: (HS đọc xong, PH đọc lại...)
      const isParentNote = /^\((hs|học sinh|ph|phụ huynh|gv|giáo viên|lưu ý|chú ý).*\)$/i.test(line);

      // Dòng chỉ chứa các dấu gạch hoặc chấm: --------- hay ............
      const isDottedLineOnly = /^[\.\-_\s]{4,}$/.test(line);

      if (isHeaderArea && (isNoise || isParentNote || isDottedLineOnly)) {
        continue; // Bỏ qua rác đầu trang
      }

      // Loại bỏ ghi chú phụ huynh trong ngoặc xen giữa dòng
      line = line.replace(/\((hs|học sinh|ph|phụ huynh|gv|giáo viên)\s+[^)]+\)/gi, '').trim();
      if (line.length > 0 && !isDottedLineOnly) {
        cleanedLines.push(line);
      }
    }

    return cleanedLines.join('\n');
  }

  // 2. Chia văn bản thành từng bài tập (Exercises)
  splitIntoExercises(text) {
    const cleanedText = this.cleanHeaderNoise(text);
    const lines = cleanedText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const exercises = [];
    let currentEx = null;

    // Pattern nhận diện tiêu đề bài tập: Bài 1, Bài tập 1, Câu 1, Phần 1, 1., 1)
    const exHeaderPattern = /^(?:bài\s*(?:tập)?\s*(\d+|[ivx]+)|câu\s*(\d+|[ivx]+)|phần\s*(\d+|[ivx]+)|(\d+)[\.\:\)\/-])/i;

    for (const line of lines) {
      if (exHeaderPattern.test(line)) {
        if (currentEx) exercises.push(currentEx);
        currentEx = {
          header: line,
          lines: []
        };
      } else {
        if (!currentEx) {
          currentEx = {
            header: 'Bài 1: Ôn tập',
            lines: []
          };
        }
        currentEx.lines.push(line);
      }
    }
    if (currentEx) exercises.push(currentEx);

    return exercises;
  }

  // 3. Phân tích bài tập Đọc Tiếng Việt (Reading Section)
  parseReadingExercise(ex) {
    const questions = [];
    const stopWords = ['bài', 'tập', 'đọc', 'câu', 'phần', 'hs', 'ph', 'trang', 'viết'];
    const contentLines = ex.lines;

    const sentences = [];
    const vocabularyList = [];

    contentLines.forEach(line => {
      // Tìm các câu văn hoàn chỉnh kết thúc bằng dấu chấm: "Bò, bê có cỏ. Bà đỡ bé. Bố có bể cá."
      const sentMatches = line.match(/([A-ZÀ-Ỹ][^.!?]*[.!?])/g);
      if (sentMatches && sentMatches.length > 0) {
        sentMatches.forEach(s => {
          const clean = s.trim();
          if (clean.length >= 5 && !stopWords.some(w => clean.toLowerCase().startsWith(w))) {
            sentences.push(clean);
          }
        });
      } else {
        // Dòng chứa danh sách từ hoặc chữ cái
        const words = line.replace(/[,.!?()]/g, ' ').split(/\s+/).filter(w => w.length > 0);
        words.forEach(w => {
          if (!stopWords.includes(w.toLowerCase()) && w.length >= 1) {
            vocabularyList.push(w);
          }
        });
      }
    });

    // A. Tạo câu hỏi đọc hiểu từ các câu văn ngắn (Sentences)
    sentences.forEach((sent, idx) => {
      const cleanSent = sent.replace(/[.!?]$/, '').trim();

      // Mẫu: "Bà đỡ bé" -> Ai đỡ bé?
      if (/(\w+)\s+(đỡ|bế|chăm|yêu|dỗ|dắt)\s+(\w+)/i.test(cleanSent)) {
        const m = cleanSent.match(/(\w+)\s+(đỡ|bế|chăm|yêu|dỗ|dắt)\s+(\w+)/i);
        const subject = m[1];
        const verb = m[2];
        const object = m[3];
        questions.push({
          id: `q_read_who_${idx + 1}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'choice',
          text: `Bé đọc câu: "${cleanSent}." - Theo bài đọc, ai ${verb} ${object}?`,
          options: [subject, "Bố", "Mẹ", "Cô bé"],
          answer: subject,
          hint: `Bé đọc kỹ lại câu văn: "${cleanSent}." để tìm đáp án nhé!`
        });
      }
      // Mẫu: "Bố có bể cá" hoặc "Bò, bê có cỏ" -> ... có gì?
      else if (/có\s+([^,.]+)/i.test(cleanSent)) {
        const m = cleanSent.match(/(.+?)\s+có\s+([^,.]+)/i);
        const owner = m[1].replace(/^[,\s]+/, '').trim();
        const item = m[2].trim();
        const displayItem = item.charAt(0).toUpperCase() + item.slice(1);
        questions.push({
          id: `q_read_has_${idx + 1}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'choice',
          text: `Bé đọc câu: "${cleanSent}." - Theo bài đọc, ${owner} có gì?`,
          options: [displayItem, "Cá cờ", "Ô đỏ", "Quả na"],
          answer: displayItem,
          hint: `Bé đọc lại câu: "${cleanSent}." để tìm đáp án đúng nhé!`
        });
      } else {
        // Câu hỏi chọn câu đọc đúng
        questions.push({
          id: `q_read_sent_${idx + 1}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'choice',
          text: `Bé hãy chọn câu đọc đúng có trong bài:`,
          options: [
            cleanSent + '.',
            cleanSent.split(' ').reverse().join(' ') + '.',
            'Bé đi học bài chăm chỉ.',
            'Mẹ đi chợ mua cá.'
          ],
          answer: cleanSent + '.',
          hint: `Câu chính xác trong bài đọc là: "${cleanSent}."`
        });
      }
    });

    // B. Tạo câu hỏi nhận diện âm trong từ (Target phonemes: đ, d, b, c, o, ô, ơ...)
    const phonemesToCheck = ['đ', 'd', 'b', 'c', 'o', 'ô', 'ơ'];
    for (const ph of phonemesToCheck) {
      const matchWords = vocabularyList.filter(w => w.toLowerCase().includes(ph) && w.length >= 2);
      const otherWords = vocabularyList.filter(w => !w.toLowerCase().includes(ph) && w.length >= 2);

      if (matchWords.length > 0 && otherWords.length >= 3) {
        const correct = matchWords[0];
        const d1 = otherWords[0];
        const d2 = otherWords[1];
        const d3 = otherWords[2];

        questions.push({
          id: `q_read_ph_${ph}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'choice',
          text: `Bé hãy tìm từ có chứa âm "${ph}" trong bài đọc:`,
          options: [correct, d1, d2, d3],
          answer: correct,
          hint: `Bé nhìn kỹ chữ "${ph}" trong từ "${correct}" nhé!`
        });
        if (questions.length >= 6) break; // Giới hạn tối đa 6 câu từ bài đọc
      }
    }

    return questions;
  }

  // 4. Phân tích bài tập Điền âm / vần / chữ (d hay đ, c hay k...)
  parseFillExercise(ex) {
    const questions = [];

    // Tìm cặp âm/vần cần điền từ tiêu đề: "Điền d hay đ", "Điền c hay k", "Điền dấu >, <, ="
    let targetChoices = [];
    const pairMatch = ex.header.match(/điền\s+([a-zA-Zà-ỹ]+|\>|<|=)\s+(?:hay|hoặc|\/)\s+([a-zA-Zà-ỹ]+|\>|<|=)/i);
    if (pairMatch) {
      targetChoices = [pairMatch[1].trim(), pairMatch[2].trim()];
    }

    const subItemRegex = /^(?:[a-z]\)|\d+[\)\.]|\-|\*)\s*(.*)/i;

    for (const line of ex.lines) {
      if (!line.includes('...') && !line.includes('___')) continue;

      const subMatch = line.match(subItemRegex);
      const content = subMatch ? subMatch[1].trim() : line.trim();

      if (targetChoices.length === 2) {
        const c1 = targetChoices[0];
        const c2 = targetChoices[1];

        // Đoán đáp án dựa trên từ điển lớp 1
        let ans = c1;
        const testWord1 = content.replace(/\.{2,}|_{2,}/, c1).replace(/[^\w\sà-ỹ]/g, '').trim().toLowerCase();
        const testWord2 = content.replace(/\.{2,}|_{2,}/, c2).replace(/[^\w\sà-ỹ]/g, '').trim().toLowerCase();

        const list1 = this.grade1Vocab[c1.toLowerCase()] || [];
        const list2 = this.grade1Vocab[c2.toLowerCase()] || [];

        if (list2.some(w => testWord2.includes(w))) {
          ans = c2;
        } else if (list1.some(w => testWord1.includes(w))) {
          ans = c1;
        }

        questions.push({
          id: `q_fill_${questions.length + 1}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'choice',
          text: `Bé hãy chọn âm thích hợp điền vào chỗ chấm: ${content}`,
          options: [c1, c2],
          answer: ans,
          hint: `Bé thử ghép âm "${ans}" vào ta được từ đúng và quen thuộc nhé!`
        });
      } else {
        // Điền khuyết tự luận ngắn
        questions.push({
          id: `q_fill_${questions.length + 1}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'input',
          text: `Bé hãy điền từ thích hợp vào chỗ chấm: ${content}`,
          options: [],
          answer: '',
          hint: `Bé đọc kỹ câu và điền từ thích hợp vào ô trống nhé!`
        });
      }
    }

    return questions;
  }

  // 5. Phân tích bài tập Toán Lớp 1 (Phép tính và so sánh)
  parseMathExercise(ex) {
    const questions = [];
    const allLines = [ex.header, ...ex.lines];

    for (const line of allLines) {
      // 1. Phép tính cộng / trừ: 3 + 2 = ... hoặc 5 - 1 = ...
      const calcMatch = line.match(/(\d+)\s*([\+\-])\s*(\d+)\s*=\s*(?:\.{2,}|_{2,}|\?|[a-zA-Z]*)/);
      if (calcMatch) {
        const a = parseInt(calcMatch[1], 10);
        const op = calcMatch[2];
        const b = parseInt(calcMatch[3], 10);
        const result = op === '+' ? a + b : a - b;

        // Sinh 3 đáp án nhiễu gần đúng
        const d1 = result + 1;
        const d2 = Math.max(0, result - 1);
        const d3 = result + 2;
        const options = Array.from(new Set([result.toString(), d1.toString(), d2.toString(), d3.toString()])).slice(0, 4);

        questions.push({
          id: `q_math_calc_${questions.length + 1}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'choice',
          text: `Phép tính: ${a} ${op} ${b} = ?`,
          options: options,
          answer: result.toString(),
          hint: `Bé làm tính: ${a} ${op === '+' ? 'thêm' : 'bớt'} ${b} thì được ${result} nhé!`
        });
        continue;
      }

      // 2. So sánh: 4 ... 6 hoặc 7 ... 3
      const compMatch = line.match(/(\d+)\s*(?:\.{2,}|_{2,})\s*(\d+)/);
      if (compMatch) {
        const a = parseInt(compMatch[1], 10);
        const b = parseInt(compMatch[2], 10);
        let correctSign = '=';
        let desc = 'bằng';
        if (a > b) {
          correctSign = '>';
          desc = 'lớn hơn';
        } else if (a < b) {
          correctSign = '<';
          desc = 'bé hơn';
        }

        questions.push({
          id: `q_math_comp_${questions.length + 1}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'choice',
          text: `Bé hãy chọn dấu thích hợp điền vào chỗ chấm: ${a} ... ${b}`,
          options: ['<', '>', '='],
          answer: correctSign,
          hint: `Vì ${a} ${desc} ${b} nên ta điền dấu "${correctSign}" nhé!`
        });
      }
    }

    return questions;
  }

  // 6. Phân tích bài tập Tô màu / Khoanh tròn / Tìm từ ngữ (Selection exercise)
  parseSelectExercise(ex) {
    const questions = [];
    const header = ex.header;
    const allContent = ex.lines.join(' ');

    if (/tô\s*màu|khoanh|gạch\s*chân|tìm\s*từ|chọn\s*từ/i.test(header)) {
      const targetMatch = header.match(/(?:chứa|có)\s*(?:âm|vần|chữ|dấu)\s*([a-zA-Zà-ỹ\~`'^\?]+)/i);
      const targetPhoneme = targetMatch ? targetMatch[1].trim() : '';

      const words = allContent.replace(/[,.!?()]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
      if (words.length >= 2) {
        let correctWord = '';
        if (targetPhoneme) {
          const found = words.find(w => w.toLowerCase().includes(targetPhoneme.toLowerCase()));
          if (found) correctWord = found;
        }
        if (!correctWord) correctWord = words[0];

        const uniqueWords = Array.from(new Set(words));
        const options = uniqueWords.slice(0, 4);

        let cleanTitle = header.replace(/^(?:bài\s*(?:tập)?\s*\d+|câu\s*\d+)[\s\:\.\-]*/i, '').trim();
        cleanTitle = cleanTitle.replace(/^tô\s*màu\s*(xanh|đỏ|vàng)?\s*(vào|lên)?/i, 'Bé hãy chọn');
        cleanTitle = cleanTitle.replace(/^khoanh\s*(vào|tròn)?/i, 'Bé hãy chọn');
        cleanTitle = cleanTitle.replace(/^gạch\s*chân\s*(dưới)?/i, 'Bé hãy chọn');

        questions.push({
          id: `q_select_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'choice',
          text: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          options: options,
          answer: correctWord,
          hint: targetPhoneme 
            ? `Bé chú ý tìm từ có chứa chữ "${targetPhoneme}" nhé!` 
            : `Bé đọc kỹ các từ để tìm từ đúng nhé!`
        });
      }
    }

    return questions;
  }

  // 7. Phân tích bài tập trắc nghiệm tiêu chuẩn (A, B, C, D)
  parseChoiceExercise(ex) {
    const questions = [];
    const options = [];
    let detectedAnswer = null;

    for (const line of ex.lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const ansMatch = trimmed.match(/^(?:đáp\s*án|đa|key|chọn|đáp\s*số)[\s\:\.\-]+([A-D]|.+)/i);
      if (ansMatch) {
        detectedAnswer = ansMatch[1].trim();
        continue;
      }

      // Tách các lựa chọn A, B, C, D (kể cả trên cùng 1 dòng hoặc nhiều dòng)
      const parts = trimmed.split(/(?=[A-Da-d][\.\:\)])/);
      for (const part of parts) {
        const optMatch = part.trim().match(/^([A-Da-d])[\.\:\)]\s*(.+)/);
        if (optMatch) {
          options.push(optMatch[2].trim());
        }
      }
    }

    if (options.length >= 2) {
      let finalAns = options[0];
      if (detectedAnswer) {
        if (['A', 'B', 'C', 'D'].includes(detectedAnswer.toUpperCase())) {
          const idx = detectedAnswer.toUpperCase().charCodeAt(0) - 65;
          if (options[idx]) finalAns = options[idx];
        } else {
          const found = options.find(o => o.toLowerCase() === detectedAnswer.toLowerCase());
          if (found) finalAns = found;
        }
      }

      let qTitle = ex.header.replace(/^(?:bài\s*(?:tập)?\s*\d+|câu\s*\d+)[\s\:\.\-]*/i, '').trim();
      if (!qTitle && ex.lines[0]) qTitle = ex.lines[0];

      // Nhận diện dạng Đúng / Sai
      if (/đúng\s*hay\s*sai|đúng\s*sai|đ\/s/i.test(qTitle)) {
        questions.push({
          id: `q_tf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'tf',
          text: qTitle,
          options: ['ĐÚNG', 'SAI'],
          answer: (detectedAnswer && detectedAnswer.toUpperCase() === 'SAI') ? 'SAI' : 'ĐÚNG',
          hint: `Bé suy nghĩ kỹ xem câu này Đúng hay Sai nhé!`
        });
      } else {
        questions.push({
          id: `q_choice_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'choice',
          text: qTitle || "Bé hãy chọn đáp án đúng:",
          options: options,
          answer: finalAns,
          hint: `Bé đọc kỹ câu hỏi và các lựa chọn để chọn đáp án đúng nhé!`
        });
      }
    }

    return questions;
  }

  // 8. Tầng phân tích quy tắc cốt lõi (Core Smart Rules Parser)
  parseWithRules(text) {
    if (!text || text.trim() === '') return [];

    // Nếu văn bản là JSON hợp lệ từ lần xuất bản trước
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].text) {
        return parsed;
      }
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions;
      }
    } catch (e) {
      // Tiếp tục phân tích văn bản tự do
    }

    const exercises = this.splitIntoExercises(text);
    let allQuestions = [];

    exercises.forEach((ex) => {
      const headerLower = ex.header.toLowerCase();
      const contentLower = ex.lines.join(' ').toLowerCase();

      // Kiểm tra có phép tính toán không
      const hasMathCalc = /\d+\s*[\+\-]\s*\d+\s*=|điền\s*dấu\s*[\>\<]/i.test(ex.header + ' ' + contentLower);

      // 1. Phép tính / so sánh toán học
      if (hasMathCalc || headerLower.includes('tính:') || headerLower.includes('tính')) {
        const qList = this.parseMathExercise(ex);
        if (qList.length > 0) {
          allQuestions.push(...qList);
          return;
        }
      }

      // 2. Bài đọc Tiếng Việt (Reading section)
      if (headerLower.includes('đọc') || contentLower.includes('đọc')) {
        const qList = this.parseReadingExercise(ex);
        if (qList.length > 0) {
          allQuestions.push(...qList);
          return;
        }
      }

      // 3. Bài điền âm / vần / chữ khuyết
      if (headerLower.includes('điền') || contentLower.includes('...')) {
        const qList = this.parseFillExercise(ex);
        if (qList.length > 0) {
          allQuestions.push(...qList);
          return;
        }
      }

      // 4. Bài tô màu / khoanh tròn / chọn từ ngữ
      if (/tô\s*màu|khoanh|gạch\s*chân|tìm\s*từ|chọn\s*từ/i.test(headerLower)) {
        const selectList = this.parseSelectExercise(ex);
        if (selectList.length > 0) {
          allQuestions.push(...selectList);
          return;
        }
      }

      // 5. Trắc nghiệm A, B, C, D hoặc Đúng/Sai
      const choiceList = this.parseChoiceExercise(ex);
      if (choiceList.length > 0) {
        allQuestions.push(...choiceList);
        return;
      }

      // 6. Tự luận ngắn nếu có câu hỏi
      if (ex.lines.length > 0) {
        let qTitle = ex.header.replace(/^(?:bài\s*(?:tập)?\s*\d+|câu\s*\d+)[\s\:\.\-]*/i, '').trim();
        if (!qTitle) qTitle = ex.lines[0];
        if (qTitle && qTitle.length >= 5) {
          allQuestions.push({
            id: `q_gen_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: 'input',
            text: qTitle,
            options: [],
            answer: ex.lines[1] || '1',
            hint: `Bé suy nghĩ kỹ và trả lời nhé!`
          });
        }
      }
    });

    // Fallback: nếu đề bài quá ngắn mà chưa trích xuất được câu nào
    if (allQuestions.length === 0 && text.trim().length > 0) {
      allQuestions.push({
        id: 'q_gen_fallback',
        type: 'choice',
        text: text.trim().substring(0, 150),
        options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
        answer: "Đáp án A",
        hint: "Bé chọn đáp án đúng nhất nhé!"
      });
    }

    return allQuestions;
  }

  // Tầng 2: Phân tích bằng Gemini AI khi có API Key
  async parseWithGemini(rawText, apiKey) {
    if (!apiKey) {
      throw new Error("Chưa nhập Gemini API Key.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `Bạn là chuyên gia giáo dục tiểu học chuyên về chương trình lớp 1 tại Việt Nam.
Hãy phân tích toàn bộ nội dung phiếu bài tập / đề ôn tập lớp 1 sau đây và chuyển đổi thành danh sách các câu hỏi trắc nghiệm/tương tác sinh động dành cho học sinh lớp 1.

YÊU CẦU:
1. BỎ HOÀN TOÀN các thông tin rác đầu trang: Họ và tên, Lớp, Trường, Nhận xét của giáo viên, Lời phê, Điểm số, Phiếu cuối tuần, v.v.
2. Bóc tách từng bài tập và từng câu con (a, b, c, d...) thành các câu hỏi riêng biệt.
3. Nếu gặp Bài đọc (các chữ cái, từ ngữ, câu văn ngắn): hãy tạo các câu hỏi đọc hiểu hấp dẫn (như: "Theo bài đọc, ai làm gì?", "Ai có gì?", hoặc "Bé hãy tìm từ có chứa âm...") với các lựa chọn ngắn gọn, thân thiện.
4. Nếu gặp bài toán tính hoặc so sánh (3 + 2, 5 ... 7): tạo câu hỏi tính toán với các đáp án trắc nghiệm chuẩn xác.
5. Phân loại câu hỏi thành các dạng:
   - "choice": trắc nghiệm 2 đến 4 lựa chọn ngắn
   - "tf": đúng hoặc sai
   - "input": điền số hoặc điền từ ngắn gọn
6. Viết thêm một câu "hint" (gợi ý giải thích) ấm áp, dễ hiểu để hướng dẫn khi bé làm sai 3 lần.
7. Trả về DUY NHẤT một chuỗi JSON thuần túy (không kèm markdown \`\`\`json), định dạng mảng:
[
  {
    "id": "q1",
    "type": "choice",
    "text": "Nội dung câu hỏi ngắn gọn...",
    "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
    "answer": "Nội dung đáp án đúng",
    "hint": "Lời giải thích gợi ý nhẹ nhàng cho bé lớp 1..."
  }
]

Nội dung bài tập từ giáo viên:
${rawText}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      const errJson = await response.json();
      throw new Error(errJson.error?.message || "Lỗi gọi Gemini API.");
    }

    const data = await response.json();
    let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("AI không trả về nội dung hợp lệ.");

    textResponse = textResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(textResponse);
  }

  // Chuyển file thành chuỗi base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Phân tích hình ảnh trực quan bằng Gemini 2.0 Flash Vision
  async parseImageWithGemini(file, apiKey) {
    const base64Data = await this.fileToBase64(file);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `Bạn là chuyên gia giáo dục tiểu học chuyên về chương trình lớp 1 tại Việt Nam.
Hãy quan sát thật kỹ hình ảnh phiếu bài tập / đề ôn tập lớp 1 được đính kèm và chuyển đổi thành danh sách các câu hỏi trắc nghiệm/tương tác sinh động dành cho học sinh lớp 1.

YÊU CẦU:
1. Quan sát mọi hình ảnh, con vật, đồ vật, số lượng, bài tập nối, điền dấu, đúng/sai trong ảnh.
2. Với bài tập đếm hình (ví dụ: đếm con tôm, con gà, nắm cơm...): hãy đặt câu hỏi rõ ràng (ví dụ: "Bên trái có 5 con tôm, bên phải có 3 con tôm. Bé hãy chọn phép so sánh đúng nhé!").
3. Với bài tập Đúng/Sai (Đ, S): tạo câu hỏi dạng "tf" với lựa chọn ĐÚNG / SAI.
4. Với bài tập điền dấu (>, <, =): tạo câu hỏi dạng "choice" với các phương án [">", "<", "="].
5. Phân loại câu hỏi thành các dạng: "choice", "tf", "input".
6. Viết thêm "hint" ấm áp, dễ hiểu cho bé lớp 1.
7. Trả về DUY NHẤT một chuỗi JSON thuần túy (không kèm markdown \`\`\`json), định dạng mảng:
[
  {
    "id": "q1",
    "type": "choice",
    "text": "Nội dung câu hỏi...",
    "options": ["Phương án A", "Phương án B", "Phương án C"],
    "answer": "Phương án đúng",
    "hint": "Gợi ý giải thích nhẹ nhàng..."
  }
]`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: file.type || 'image/png',
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500
        }
      })
    });

    if (!response.ok) {
      const errJson = await response.json();
      throw new Error(errJson.error?.message || "Lỗi gọi Gemini Vision API.");
    }

    const data = await response.json();
    let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("AI không trả về nội dung hợp lệ.");

    textResponse = textResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(textResponse);
  }

  // Phương thức tổng hợp chính
  async parseFileOrText(fileOrText, apiKey = '') {
    const isImage = (fileOrText instanceof Blob && fileOrText.type && fileOrText.type.startsWith('image/')) ||
                    (fileOrText && fileOrText.name && /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileOrText.name));

    // Nếu là ảnh và có Gemini API key -> gọi Gemini Vision đọc trực tiếp hình ảnh
    if (isImage && apiKey && apiKey.length > 10) {
      try {
        console.log("Đang phân tích ảnh chụp bằng Gemini AI Vision...");
        const aiResult = await this.parseImageWithGemini(fileOrText, apiKey);
        if (aiResult && aiResult.length > 0) return aiResult;
      } catch (err) {
        console.warn("Gemini Vision gặp lỗi, chuyển sang OCR Tesseract:", err);
      }
    }

    let rawText = '';
    if (typeof fileOrText === 'string') {
      rawText = fileOrText;
    } else {
      rawText = await this.readFileContent(fileOrText);
    }

    // Nếu có API Key và không phải ảnh đã xử lý, ưu tiên phân tích bằng AI
    if (apiKey && apiKey.length > 10) {
      try {
        console.log("Đang phân tích bài tập bằng Gemini AI...");
        const aiResult = await this.parseWithGemini(rawText, apiKey);
        if (aiResult && aiResult.length > 0) return aiResult;
      } catch (err) {
        console.warn("Gemini AI gặp lỗi, chuyển sang phân tích thông minh bằng Rules:", err);
      }
    }

    // Mặc định: Phân tích bằng bộ giải thuật Smart Rules chuyên dụng lớp 1 (100% offline, không cần key)
    console.log("Đang phân tích bài tập bằng Grade 1 Smart Rules Engine...");
    return this.parseWithRules(rawText);
  }
}

window.exerciseParser = new ExerciseParser();
