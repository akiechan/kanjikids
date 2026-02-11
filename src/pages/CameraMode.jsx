import { useState, useRef, useEffect, useCallback } from 'react'
import { getFurigana, speak } from '../utils/japanese'
import { batchTranslate, translateWithDeepL } from '../utils/api'

export default function CameraMode({ deeplKey, onBack }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [wordTranslations, setWordTranslations] = useState({});
  const [englishTranslation, setEnglishTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [boxMode, setBoxMode] = useState('tall'); // 'tall' or 'wide'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsStreaming(true);
      setCapturedImage(null);
      setResults([]);
      setError(null);
      setWordTranslations({});
      setEnglishTranslation('');
    } catch (err) {
      console.error('Camera error:', err);
      alert('カメラを　ひらけませんでした');
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const takePicture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Crop dimensions based on box mode
    const cropW = boxMode === 'tall'
      ? video.videoWidth * 0.3
      : video.videoWidth * 0.8;
    const cropH = boxMode === 'tall'
      ? video.videoHeight * 0.8
      : video.videoHeight * 0.3;
    const cropX = (video.videoWidth - cropW) / 2;
    const cropY = (video.videoHeight - cropH) / 2;

    canvas.width = cropW;
    canvas.height = cropH;

    // Save a color version for display
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageUrl);

    // Downscale for OCR (max 800px on longest side)
    const maxOcr = 800;
    const scale = Math.min(maxOcr / cropW, maxOcr / cropH, 1);
    const ocrW = Math.round(cropW * scale);
    const ocrH = Math.round(cropH * scale);
    canvas.width = ocrW;
    canvas.height = ocrH;
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, ocrW, ocrH);

    stopCamera();
    setIsAnalyzing(true);

    try {
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const ocrRes = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) throw new Error(ocrData.error || `OCR error: ${ocrRes.status}`);

      const cleanText = ocrData.text;
      if (cleanText && cleanText.length > 0) {
        setError(null);
        const furigana = await getFurigana(cleanText);
        setResults([{ id: 1, text: cleanText, furigana }]);

        const uniqueWords = [...new Set(
          furigana
            .filter((item) => item.text.trim().length > 0 && item.hasKanji)
            .map((item) => item.text)
        )];
        if (uniqueWords.length > 0) {
          const translations = await batchTranslate(uniqueWords, deeplKey);
          setWordTranslations(translations);
        }
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('OCR error:', err);
      if (err.name === 'AbortError') {
        setResults([{ id: 1, text: '', furigana: [], timeout: true }]);
      } else {
        setError(err.message);
        setResults([]);
      }
    }

    setIsAnalyzing(false);
  }, [stopCamera, boxMode]);

  const translateToEnglish = async () => {
    if (!allText || isTranslating) return;
    setIsTranslating(true);
    try {
      const translation = await translateWithDeepL(allText, deeplKey);
      setEnglishTranslation(translation);
    } catch (err) {
      console.error('Translation error:', err);
    }
    setIsTranslating(false);
  };

  const handleBack = () => {
    stopCamera();
    onBack();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const allText = results.map((r) => r.text).join('');

  return (
    <div className="camera-mode">
      <div className="top-bar">
        <button className="back-btn" onClick={handleBack}>← もどる</button>
        <h1>カメラモード 📷</h1>
      </div>

      <div className="camera-area" style={{ display: isStreaming ? 'block' : 'none' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
        />
        <div className="scan-overlay">
          <div className={`scan-box ${boxMode}`} />
        </div>
        <div className="camera-bottom-bar">
          <div className="box-toggle">
            <button
              className={`toggle-btn ${boxMode === 'tall' ? 'active' : ''}`}
              onClick={() => setBoxMode('tall')}
            >
              たて
            </button>
            <button
              className={`toggle-btn ${boxMode === 'wide' ? 'active' : ''}`}
              onClick={() => setBoxMode('wide')}
            >
              よこ
            </button>
          </div>
          <button className="camera-shutter-btn" onClick={takePicture}>
            📸
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {capturedImage && !isStreaming && (
        <div className="captured-crop">
          <img src={capturedImage} alt="とった　しゃしん" />
        </div>
      )}

      <div className="camera-controls">
        {!isStreaming && !capturedImage && !isAnalyzing && (
          <button className="camera-start-btn" onClick={startCamera}>
            📷 カメラを　ひらく
          </button>
        )}
        {capturedImage && !isAnalyzing && (
          <button className="camera-start-btn" onClick={startCamera}>
            📷 もういちど　とる
          </button>
        )}
      </div>

      {isAnalyzing && (
        <div className="scan-status">
          <div className="loading-spinner small" />
          <span>よみとっています...</span>
        </div>
      )}

      {!isAnalyzing && results.length > 0 && !results[0].timeout && (
        <div className="live-results">
          {results.map((result) => (
            <div key={result.id} className="live-result-item">
              <div className="live-result-content">
                <div className="furigana-text with-english" style={{ fontSize: 32 }}>
                  {result.furigana.map((item, i) => (
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
              </div>
              <button className="speak-btn" onClick={() => speak(result.text)}>
                🔊
              </button>
            </div>
          ))}
        </div>
      )}

      {!isAnalyzing && capturedImage && results.length > 0 && results[0].timeout && (
        <div className="results-area">
          <p className="no-results">じかんが　かかりすぎました。もういちど　ためしてね</p>
        </div>
      )}

      {!isAnalyzing && capturedImage && results.length === 0 && (
        <div className="results-area">
          <p className="no-results">
            {error ? `エラー: ${error}` : 'もじが　みつかりませんでした'}
          </p>
        </div>
      )}

      {!isAnalyzing && allText && (
        <div className="translation-area">
          <button className="speak-btn-large" onClick={() => speak(allText)}>
            🔊 よむ
          </button>
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
