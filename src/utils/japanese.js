let tokenizerInstance = null;
let initPromise = null;

export function initTokenizer() {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const kuromoji = window.kuromoji;
    if (!kuromoji) {
      reject(new Error('kuromoji not loaded from CDN'));
      return;
    }

    kuromoji.builder({
      dicPath: 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict'
    }).build((err, tokenizer) => {
      if (err) {
        initPromise = null;
        reject(err);
      } else {
        tokenizerInstance = tokenizer;
        resolve(tokenizer);
      }
    });
  });

  return initPromise;
}

export function tokenize(text) {
  if (!tokenizerInstance) throw new Error('Tokenizer not initialized');
  return tokenizerInstance.tokenize(text);
}

export function isKanji(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF) ||
         (code >= 0xF900 && code <= 0xFAFF);
}

export function hasKanji(str) {
  return [...str].some(isKanji);
}

export function katakanaToHiragana(str) {
  if (!str) return '';
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

export function tokensToFurigana(tokens) {
  return tokens.map(token => {
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
}

export function speak(text, lang = 'ja-JP') {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}
