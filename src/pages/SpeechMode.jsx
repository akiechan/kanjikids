import { useState, useRef, useCallback } from 'react'
import { getFurigana, speak } from '../utils/japanese'
import { translateWithDeepL, batchTranslate } from '../utils/api'

export default function SpeechMode({ deeplKey, onBack }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [furiganaData, setFuriganaData] = useState([]);
  const [fontSize, setFontSize] = useState(28);
  const [englishTranslation, setEnglishTranslation] = useState('');
  const [wordTranslations, setWordTranslations] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('このブラウザは　おんせいにんしきに　たいおうしていません');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        setIsListening(false);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setAnalyzed(false);
    setEnglishTranslation('');
    setWordTranslations({});
    setFuriganaData([]);
  }, []);

  const stopListening = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);

    if (transcript) {
      setIsAnalyzing(true);
      try {
        const furigana = await getFurigana(transcript);
        setFuriganaData(furigana);
        setAnalyzed(true);

        // Auto-translate all unique meaningful words
        const uniqueWords = [...new Set(
          furigana
            .filter((item) => item.text.trim().length > 0 && item.hasKanji)
            .map((item) => item.text)
        )];

        if (uniqueWords.length > 0) {
          try {
            const translations = await batchTranslate(uniqueWords, deeplKey);
            setWordTranslations(translations);
          } catch (err) {
            console.error('Batch translate error:', err);
          }
        }
      } catch (err) {
        console.error('Tokenizer error:', err);
        setAnalyzed(true);
      }
      setIsAnalyzing(false);
    }
  }, [transcript, deeplKey]);

  const translateToEnglish = async () => {
    setIsTranslating(true);
    try {
      const result = await translateWithDeepL(transcript, deeplKey);
      setEnglishTranslation(result);
    } catch (err) {
      console.error('Translation error:', err);
      alert('ほんやくに　しっぱいしました');
    }
    setIsTranslating(false);
  };

  return (
    <div className="speech-mode">
      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← もどる</button>
        <h1>おはなしモード 🎤</h1>
      </div>

      <div className="font-controls">
        <span>もじの　おおきさ</span>
        <button onClick={() => setFontSize((s) => Math.max(16, s - 4))}>
          <span className="font-small">あ</span>
        </button>
        <button onClick={() => setFontSize((s) => Math.min(48, s + 4))}>
          <span className="font-large">あ</span>
        </button>
      </div>

      <div className="mic-controls">
        {!isListening ? (
          <button className="mic-btn" onClick={startListening}>
            🎤 はなす
          </button>
        ) : (
          <button className="stop-btn" onClick={stopListening}>
            ⏹️ とめる
          </button>
        )}
        {isListening && <div className="listening-indicator">きいています...</div>}
        {isAnalyzing && (
          <div className="processing">
            <div className="loading-spinner small" />
            <span>かんがえています...</span>
          </div>
        )}
      </div>

      {transcript && !isAnalyzing && (
        <div className="transcript-area" style={{ fontSize: `${fontSize}px` }}>
          <div className="transcript-header">
            <span>にんしきした　ことば</span>
            <button className="speak-btn" onClick={() => speak(transcript)}>
              🔊
            </button>
          </div>

          {analyzed && furiganaData.length > 0 ? (
            <div className="furigana-text with-english">
              {furiganaData.map((item, i) => (
                <span key={i} className={`word-block ${item.hasKanji ? 'has-kanji' : ''}`}>
                  {item.hasKanji ? (
                    <ruby>
                      {item.text}
                      <rt>{item.reading}</rt>
                    </ruby>
                  ) : (
                    <span>{item.text}</span>
                  )}
                  {item.hasKanji && wordTranslations[item.text] && (
                    <span className="word-english">{wordTranslations[item.text]}</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <div className="raw-transcript">{transcript}</div>
          )}
        </div>
      )}

      {analyzed && (
        <div className="translation-area">
          <button
            className="translate-btn"
            onClick={translateToEnglish}
            disabled={isTranslating}
          >
            🌐 えいごに　ほんやく
          </button>

          {englishTranslation && (
            <div className="english-result">
              <p>{englishTranslation}</p>
              <button className="speak-btn" onClick={() => speak(englishTranslation, 'en-US')}>
                🔊
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
