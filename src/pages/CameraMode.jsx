import { useState, useRef, useEffect, useCallback } from 'react'
import { getFurigana, speak } from '../utils/japanese'

export default function CameraMode({ deeplKey, onBack }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [stopped, setStopped] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const workerRef = useRef(null);
  const scanningRef = useRef(false);
  const busyRef = useRef(false);
  const intervalRef = useRef(null);
  const resultIdRef = useRef(0);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsStreaming(true);
      setStopped(false);
      setResults([]);
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

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const boxWidth = video.videoWidth * 0.7;
    const boxHeight = video.videoHeight * 0.3;
    const boxX = (video.videoWidth - boxWidth) / 2;
    const boxY = (video.videoHeight - boxHeight) / 2;

    canvas.width = boxWidth;
    canvas.height = boxHeight;

    ctx.filter = 'contrast(1.5) grayscale(1)';
    ctx.drawImage(video, boxX, boxY, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight);
    ctx.filter = 'none';

    return canvas;
  }, []);

  const startScanning = async () => {
    setIsScanning(true);
    scanningRef.current = true;

    const Tesseract = await import('tesseract.js');
    workerRef.current = await Tesseract.createWorker('jpn');

    const seenTexts = new Set();

    intervalRef.current = setInterval(async () => {
      if (busyRef.current || !scanningRef.current) return;
      busyRef.current = true;

      try {
        const canvas = captureFrame();
        if (!canvas) { busyRef.current = false; return; }

        const { data: { text } } = await workerRef.current.recognize(canvas);
        const cleanText = text.replace(/[\s\n\r]+/g, '').trim();

        if (cleanText && cleanText.length > 1 && !seenTexts.has(cleanText)) {
          seenTexts.add(cleanText);

          try {
            const furigana = await getFurigana(cleanText);
            const id = ++resultIdRef.current;
            setResults((prev) => [{ id, text: cleanText, furigana }, ...prev]);
          } catch (e) {
            console.error('Furigana error:', e);
          }
        }
      } catch (err) {
        console.error('OCR scan error:', err);
      }

      busyRef.current = false;
    }, 2000);
  };

  const stopScanning = async () => {
    scanningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (workerRef.current) {
      await workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsScanning(false);
    stopCamera();
    setStopped(true);
  };

  const handleBack = async () => {
    scanningRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (workerRef.current) await workerRef.current.terminate().catch(() => {});
    stopCamera();
    onBack();
  };

  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (workerRef.current) workerRef.current.terminate().catch(() => {});
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

      <div className="camera-area">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={isStreaming ? 'visible' : 'hidden'}
        />
        {isStreaming && (
          <div className="scan-overlay">
            <div className="scan-box wide">
              <span className="scan-label">
                {isScanning ? 'よみとりちゅう...' : 'ここに　かんじを　うつしてね'}
              </span>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="camera-controls">
        {!isStreaming && !stopped && (
          <button className="camera-start-btn" onClick={startCamera}>
            📷 カメラを　ひらく
          </button>
        )}
        {isStreaming && !isScanning && (
          <button className="camera-start-btn" onClick={startScanning}>
            ▶️ よみとり　スタート
          </button>
        )}
        {isScanning && (
          <button className="camera-stop-btn" onClick={stopScanning}>
            ⏹️ とめる
          </button>
        )}
        {stopped && results.length > 0 && (
          <button className="camera-start-btn" onClick={startCamera}>
            📷 もういちど
          </button>
        )}
      </div>

      {isScanning && (
        <div className="scan-status">
          <div className="loading-spinner small" />
          <span>リアルタイムで　よみとっています...</span>
        </div>
      )}

      <div className="live-results">
        {results.map((result) => (
          <div key={result.id} className="live-result-item">
            <div className="live-result-content">
              <div className="furigana-text large">
                {result.furigana.map((item, i) => (
                  <span key={i} className="word">
                    {item.hasKanji ? (
                      <ruby>
                        {item.text}
                        <rt>{item.reading}</rt>
                      </ruby>
                    ) : (
                      item.text
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

      {stopped && results.length === 0 && (
        <div className="results-area">
          <p className="no-results">かんじが　みつかりませんでした</p>
        </div>
      )}

      {stopped && allText && (
        <div className="camera-controls">
          <button className="speak-btn-large" onClick={() => speak(allText)}>
            🔊 ぜんぶ　よむ
          </button>
        </div>
      )}
    </div>
  );
}
