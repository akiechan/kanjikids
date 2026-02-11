import type { VercelRequest, VercelResponse } from '@vercel/node';
import Tesseract from 'tesseract.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Missing image field' });
  }

  try {
    const worker = await Tesseract.createWorker('jpn');
    const { data: { text } } = await worker.recognize(image);
    await worker.terminate();

    const cleanText = text.replace(/[\s\n\r]+/g, '').trim();
    return res.status(200).json({ text: cleanText });
  } catch (err) {
    console.error('OCR error:', err);
    return res.status(500).json({ error: 'OCR failed' });
  }
}
