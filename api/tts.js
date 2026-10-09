const https = require('https');

module.exports = (req, res) => {
  const text = req.query ? req.query.q : '';
  if (!text) {
    res.statusCode = 400;
    return res.end('Missing text');
  }

  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(text.substring(0, 180))}`;

  https.get(googleTtsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/'
    }
  }, (ttsRes) => {
    res.writeHead(ttsRes.statusCode || 200, {
      'Content-Type': 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400'
    });
    ttsRes.pipe(res);
  }).on('error', (err) => {
    res.statusCode = 500;
    res.end(err.message);
  });
};
