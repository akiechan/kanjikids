import type { VercelRequest, VercelResponse } from '@vercel/node';
import Tesseract from 'tesseract.js';

// Cache workers across warm invocations
let workerJpn: Tesseract.Worker | null = null;
let workerVert: Tesseract.Worker | null = null;

async function getWorker(vertical: boolean): Promise<Tesseract.Worker> {
  if (vertical) {
    if (!workerVert) {
      workerVert = await Tesseract.createWorker('jpn_vert');
      await workerVert.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK_VERT_TEXT,
      });
    }
    return workerVert;
  } else {
    if (!workerJpn) {
      workerJpn = await Tesseract.createWorker('jpn');
      await workerJpn.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });
    }
    return workerJpn;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, vertical } = req.body;
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Missing image field' });
  }

  try {
    const worker = await getWorker(!!vertical);
    const { data: { text } } = await worker.recognize(image);

    const cleanText = text.replace(/[\s\n\r]+/g, '').trim();
    return res.status(200).json({ text: cleanText });
  } catch (err) {
    console.error('OCR error:', err);
    // Reset workers on error so next request creates fresh ones
    workerJpn = null;
    workerVert = null;
    return res.status(500).json({ error: 'OCR failed' });
  }
}
