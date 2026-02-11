const express = require('express');
const kuromoji = require('kuromoji');
const Tesseract = require('tesseract.js');
const path = require('path');

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

// Pre-initialize OCR workers for fast responses
let ocrWorkerJpn = null;
let ocrWorkerVert = null;

async function initOcrWorkers() {
  try {
    const T = require('tesseract.js');
    ocrWorkerJpn = await T.createWorker('jpn');
    await ocrWorkerJpn.setParameters({ tessedit_pageseg_mode: '6' });
    console.log('OCR worker (jpn) ready');

    ocrWorkerVert = await T.createWorker('jpn_vert');
    await ocrWorkerVert.setParameters({ tessedit_pageseg_mode: '5' });
    console.log('OCR worker (jpn_vert) ready');
  } catch (err) {
    console.error('Failed to init OCR workers:', err);
  }
}
initOcrWorkers();

app.post('/api/ocr', async (req, res) => {
  const { image, vertical } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Missing image' });
  }

  const worker = vertical ? ocrWorkerVert : ocrWorkerJpn;
  if (!worker) {
    return res.status(503).json({ error: 'OCR worker loading...' });
  }

  try {
    const { data: { text } } = await worker.recognize(image);
    const cleanText = text.replace(/[\s\n\r]+/g, '').trim();
    res.json({ text: cleanText });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'OCR failed' });
  }
});

app.listen(3001, () => {
  console.log('Dev server on http://localhost:3001');
});
