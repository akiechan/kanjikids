export async function getFurigana(text) {
  const response = await fetch('/api/tokenize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Tokenize error: ${response.status}`);
  }

  const data = await response.json();
  return data.furigana;
}

export function speak(text, lang = 'ja-JP') {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}
