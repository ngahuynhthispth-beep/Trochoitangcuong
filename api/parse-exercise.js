const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const apiKey = payload.apiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(JSON.stringify({
          error: "MISSING_KEY",
          message: "Chưa cấu hình Google Gemini API Key để AI phân tích hình ảnh."
        }));
      }

      const prompt = `Bạn là chuyên gia sư phạm tiểu học Việt Nam chuyên về chương trình Lớp 1.
Hãy quan sát kỹ nội dung hoặc hình ảnh bài tập lớp 1 được cung cấp và bóc tách thành danh sách các câu hỏi trắc nghiệm hoặc điền khuyết sinh động cho học sinh lớp 1.

YÊU CẦU QUAN TRỌNG:
1. Quan sát mọi hình ảnh minh họa, con vật, đồ vật, số lượng, bài tập đếm, điền dấu, đúng/sai trong đề bài.
2. Với bài tập đếm hình (ví dụ: đếm con tôm, con gà, con mèo, nắm cơm...): hãy đặt câu hỏi rõ ràng (ví dụ: "Bên trái có 5 con tôm, bên phải có 3 con tôm. Bé hãy chọn phép so sánh đúng nhé!").
3. Với bài tập Đúng/Sai (Đ, S): tạo câu hỏi dạng "tf" với 2 lựa chọn [ĐÚNG, SAI].
4. Với bài tập điền dấu (>, <, =): tạo câu hỏi dạng "choice" với các phương án [">", "<", "="].
5. Phân loại câu hỏi thành các dạng: "choice", "tf", "input".
6. Viết thêm "hint" (lời gợi ý ấm áp, dễ hiểu cho trẻ 6-7 tuổi khi làm sai 3 lần).
7. Trả về DUY NHẤT một chuỗi JSON thuần túy (không kèm markdown \`\`\`json), định dạng mảng:
[
  {
    "id": "q1",
    "type": "choice",
    "text": "Nội dung câu hỏi ngắn gọn...",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "answer": "Phương án đúng",
    "hint": "Gợi ý giải thích nhẹ nhàng cho bé lớp 1..."
  }
]`;

      const parts = [{ text: prompt }];

      if (payload.imageBase64) {
        parts.push({
          inline_data: {
            mime_type: payload.mimeType || 'image/jpeg',
            data: payload.imageBase64
          }
        });
      } else if (payload.text) {
        parts.push({ text: `Nội dung đề bài:\n${payload.text}` });
      } else {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(JSON.stringify({ error: "MISSING_DATA", message: "Vui lòng gửi text hoặc imageBase64." }));
      }

      const postData = JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 3000
        }
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const geminiReq = https.request(options, (geminiRes) => {
        let resData = '';
        geminiRes.on('data', chunk => { resData += chunk; });
        geminiRes.on('end', () => {
          try {
            const data = JSON.parse(resData);
            if (geminiRes.statusCode !== 200) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              return res.end(JSON.stringify({
                error: "GEMINI_ERROR",
                message: data.error?.message || "Lỗi phản hồi từ Gemini API"
              }));
            }

            let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            textResponse = textResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            const questions = JSON.parse(textResponse);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true, questions }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: "PARSE_ERROR", message: e.message, raw: resData }));
          }
        });
      });

      geminiReq.on('error', (e) => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: "REQUEST_ERROR", message: e.message }));
      });

      geminiReq.write(postData);
      geminiReq.end();
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: "SERVER_ERROR", message: err.message }));
    }
  });
};
