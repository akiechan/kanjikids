export async function translateWithDeepL(text, deeplKey, targetLang = 'EN') {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      target_lang: targetLang,
      source_lang: 'JA',
    }),
  });

  if (!response.ok) {
    throw new Error(`Translation error: ${response.status}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}
