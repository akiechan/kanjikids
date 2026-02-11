import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Missing image field' });
  }

  const apiKey = process.env.GOOGLE_VISION_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Vision API key not configured' });
  }

  try {
    // Strip data URL prefix to get raw base64
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

    return res.status(200).json({ text: cleanText });
  } catch (err) {
    console.error('OCR error:', err);
    return res.status(500).json({ error: 'OCR failed' });
  }
}
