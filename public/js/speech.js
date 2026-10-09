/* ========================================================
   TRỢ LÝ ĐỌC BÀI TIẾNG VIỆT CHUẨN 100% CHO HỌC SINH LỚP 1
   Sử dụng giọng đọc tiếng Việt tự nhiên, ấm áp, rõ từng chữ.
   Hỗ trợ cả khi chạy qua server localhost hoặc mở trực tiếp file://
   ======================================================== */

class KidsSpeech {
  constructor() {
    this.synth = window.speechSynthesis;
    this.viVoice = null;
    this.currentAudio = null;
    this.isSpeaking = false;
    this.initVoice();
  }

  initVoice() {
    if (!this.synth) return;

    const findViVoice = () => {
      const voices = this.synth.getVoices();
      // CHỈ CHẤP NHẬN giọng có mã ngôn ngữ bắt đầu bằng 'vi' (vi-VN, vi_VN, vie)
      // TUYỆT ĐỐI KHÔNG dùng các từ chung chung như 'an' vì sẽ nhầm với English/German/Spanish
      this.viVoice = voices.find(v => {
        const lang = (v.lang || '').toLowerCase();
        return lang.startsWith('vi') || lang.startsWith('vie');
      });

      if (this.viVoice) {
        console.log("Tìm thấy giọng đọc tiếng Việt hệ thống:", this.viVoice.name, this.viVoice.lang);
      } else {
        console.log("Hệ thống Windows không cài sẵn giọng tiếng Việt. Ứng dụng kích hoạt bộ đọc tiếng Việt chuẩn tự nhiên.");
      }
    };

    findViVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findViVoice;
    }
  }

  // Tách câu dài thành các câu nhỏ tự nhiên theo dấu câu
  splitIntoPhrases(text) {
    const clean = text.replace(/[*#_~`]/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();

    // Tách theo dấu chấm, chấm hỏi, chấm than, hai chấm
    const rawParts = clean.split(/([,.:;?!]+)/);
    const phrases = [];
    let current = '';

    for (let i = 0; i < rawParts.length; i++) {
      const part = rawParts[i];
      if (!part) continue;

      if (/^[,.:;?!]+$/.test(part)) {
        current += part + ' ';
        if (current.trim().length > 0) {
          phrases.push(current.trim());
          current = '';
        }
      } else {
        if ((current + part).length > 80) {
          if (current.trim().length > 0) phrases.push(current.trim());
          current = part;
        } else {
          current += (current ? ' ' : '') + part;
        }
      }
    }

    if (current.trim().length > 0) {
      phrases.push(current.trim());
    }

    return phrases.length > 0 ? phrases : [clean];
  }

  // Lấy URL âm thanh tiếng Việt chuẩn
  getAudioUrl(text) {
    const encoded = encodeURIComponent(text);
    // Nếu chạy qua HTTP server (localhost:3000 hoặc host)
    if (window.location.protocol.startsWith('http') && window.location.host) {
      return `/api/tts?q=${encoded}`;
    }
    // Nếu mở trực tiếp dạng tệp file://
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encoded}`;
  }

  // Phát tuần tự từng câu tiếng Việt bằng luồng Audio chuẩn
  playAudioQueue(phrases, onStart, onEnd) {
    this.stop();
    this.isSpeaking = true;
    if (onStart) onStart();

    let index = 0;

    const playNext = () => {
      if (!this.isSpeaking) return;

      if (index >= phrases.length) {
        this.isSpeaking = false;
        if (onEnd) onEnd();
        return;
      }

      const phrase = phrases[index];
      index++;

      const url = this.getAudioUrl(phrase);
      this.currentAudio = new Audio(url);

      this.currentAudio.onplay = () => {
        this.isSpeaking = true;
      };

      this.currentAudio.onended = () => {
        // Nghỉ một nhịp 150ms giữa các câu để học sinh nghe kịp
        setTimeout(playNext, 150);
      };

      this.currentAudio.onerror = (e) => {
        console.warn("Lỗi phát audio:", phrase, e);
        // Fallback sang link trực tiếp nếu proxy lỗi
        if (url.startsWith('/api/tts')) {
          const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(phrase)}`;
          this.currentAudio = new Audio(directUrl);
          this.currentAudio.onended = () => setTimeout(playNext, 150);
          this.currentAudio.onerror = () => playNext();
          this.currentAudio.play().catch(() => playNext());
        } else {
          playNext();
        }
      };

      this.currentAudio.play().catch(err => {
        console.warn("Trình duyệt chặn autoplay:", err);
        // Nếu trình duyệt chặn Audio mà có viVoice của hệ thống thì dùng viVoice
        if (this.viVoice) {
          this.speakWithSpeechSynthesis(phrase, null, playNext);
        } else {
          this.isSpeaking = false;
          if (onEnd) onEnd();
        }
      });
    };

    playNext();
  }

  // Phát bằng SpeechSynthesis (CHỈ GỌI KHI ĐÃ XÁC NHẬN CÓ GIỌNG TIẾNG VIỆT)
  speakWithSpeechSynthesis(text, onStart, onEnd) {
    if (!this.synth || !this.viVoice) {
      if (onEnd) onEnd();
      return;
    }

    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = this.viVoice;
      utter.lang = this.viVoice.lang || 'vi-VN';
      utter.rate = 0.88;
      utter.pitch = 1.05;

      utter.onstart = () => {
        this.isSpeaking = true;
        if (onStart) onStart();
      };

      utter.onend = () => {
        this.isSpeaking = false;
        if (onEnd) onEnd();
      };

      utter.onerror = () => {
        this.isSpeaking = false;
        if (onEnd) onEnd();
      };

      this.synth.speak(utter);
    } catch (e) {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    }
  }

  // Hàm phát âm chính
  speak(text, onStart, onEnd) {
    this.stop();

    if (!text || text.trim() === '') {
      if (onEnd) onEnd();
      return;
    }

    // Ưu tiên 1: Dùng Audio phát âm tiếng Việt tự nhiên chuẩn 100%
    // Giọng đọc ấm áp, tự nhiên, chuẩn dấu hỏi ngã, không bị lỗi phát âm tiếng Anh
    const phrases = this.splitIntoPhrases(text);
    this.playAudioQueue(phrases, onStart, onEnd);
  }

  stop() {
    this.isSpeaking = false;
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }
}

window.kidsSpeech = new KidsSpeech();
