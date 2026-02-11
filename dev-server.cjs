const fs = require('fs');
const express = require('express');
const kuromoji = require('kuromoji');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  });
}

const app = express();
app.use(express.json({ limit: '10mb' }));

let tokenizer = null;

kuromoji.builder({
  dicPath: path.join(__dirname, 'node_modules', 'kuromoji', 'dict'),
}).build((err, t) => {
  if (err) {
    console.error('Failed to build tokenizer:', err);
    process.exit(1);
  }
  tokenizer = t;
  console.log('Tokenizer ready');
});

function isKanji(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF) ||
         (code >= 0xF900 && code <= 0xFAFF);
}

function hasKanji(str) {
  return [...str].some(isKanji);
}

function katakanaToHiragana(str) {
  if (!str) return '';
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

app.post('/api/tokenize', (req, res) => {
  if (!tokenizer) {
    return res.status(503).json({ error: 'Tokenizer loading...' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const tokens = tokenizer.tokenize(text);
  const furigana = tokens.map((token) => {
    const surface = token.surface_form;
    const reading = token.reading;

    if (reading && reading !== '*' && hasKanji(surface)) {
      return { text: surface, reading: katakanaToHiragana(reading), hasKanji: true };
    }
    return { text: surface, reading: null, hasKanji: false };
  });

  res.json({ furigana });
});

app.post('/api/ocr', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Missing image' });
  }

  const apiKey = process.env.GOOGLE_VISION_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_VISION_KEY not set in .env' });
  }

  try {
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION' }],
            imageContext: { languageHints: ['ja'] },
          }],
        }),
      }
    );

    if (!visionRes.ok) {
      const err = await visionRes.text();
      console.error('Vision API error:', err);
      return res.status(500).json({ error: 'Vision API failed' });
    }

    const data = await visionRes.json();
    const annotations = data.responses?.[0]?.textAnnotations;
    const fullText = annotations?.[0]?.description || '';
    const cleanText = fullText.replace(/[\s\n\r]+/g, '').trim();
    res.json({ text: cleanText });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'OCR failed' });
  }
});

app.listen(3001, () => {
  console.log('Dev server on http://localhost:3001');
});
