import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPL_API_KEY not configured' });
  }

  const { text, target_lang, source_lang } = req.body;

  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: Array.isArray(text) ? text : [text],
      target_lang: target_lang || 'EN',
      source_lang: source_lang || 'JA',
    }),
  });

  const data = await response.json();
  return res.status(response.status).json(data);
}
