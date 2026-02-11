import type { VercelRequest, VercelResponse } from '@vercel/node';
import kuromoji from 'kuromoji';
import path from 'path';

let tokenizerInstance: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;

function getTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  if (tokenizerInstance) return Promise.resolve(tokenizerInstance);

  const dicPath = path.join(process.cwd(), 'node_modules', 'kuromoji', 'dict');

  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err, tokenizer) => {
      if (err) return reject(err);
      tokenizerInstance = tokenizer;
      resolve(tokenizer);
    });
  });
}

function isKanji(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF) ||
         (code >= 0xF900 && code <= 0xFAFF);
}

function hasKanji(str: string): boolean {
  return [...str].some(isKanji);
}

function katakanaToHiragana(str: string): string {
  if (!str) return '';
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing text field' });
  }

  try {
    const tokenizer = await getTokenizer();
    const tokens = tokenizer.tokenize(text);

    const furigana = tokens.map((token) => {
      const surface = token.surface_form;
      const reading = token.reading;

      if (reading && reading !== '*' && hasKanji(surface)) {
        return {
          text: surface,
          reading: katakanaToHiragana(reading),
          hasKanji: true,
        };
      }

      return {
        text: surface,
        reading: null,
        hasKanji: false,
      };
    });

    return res.status(200).json({ furigana });
  } catch (err) {
    console.error('Tokenizer error:', err);
    return res.status(500).json({ error: 'Tokenizer failed' });
  }
}
