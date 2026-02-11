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

export async function batchTranslate(words, deeplKey, targetLang = 'EN') {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: words,
      target_lang: targetLang,
      source_lang: 'JA',
    }),
  });

  if (!response.ok) {
    throw new Error(`Translation error: ${response.status}`);
  }

  const data = await response.json();
  const map = {};
  words.forEach((word, i) => {
    map[word] = data.translations[i].text;
  });
  return map;
}
