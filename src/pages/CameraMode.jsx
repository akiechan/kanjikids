import { useState, useRef, useEffect, useCallback } from 'react'
import { getFurigana, speak } from '../utils/japanese'

export default function CameraMode({ deeplKey, onBack }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [results, setResults] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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
      setCapturedImage(null);
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

  const takePicture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Save a color version for display
    ctx.drawImage(video, 0, 0);
    const imageUrl = canvas.toDataURL('image/png');
    setCapturedImage(imageUrl);

    // Apply filters for OCR
    ctx.filter = 'contrast(1.5) grayscale(1)';
    ctx.drawImage(video, 0, 0);
    ctx.filter = 'none';

    stopCamera();
    setIsAnalyzing(true);

    try {
      // Send image to server-side OCR
      const imageData = canvas.toDataURL('image/png');
      const ocrRes = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!ocrRes.ok) throw new Error(`OCR error: ${ocrRes.status}`);
      const { text: cleanText } = await ocrRes.json();

      if (cleanText && cleanText.length > 0) {
        const furigana = await getFurigana(cleanText);
        setResults([{ id: 1, text: cleanText, furigana }]);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('OCR error:', err);
      setResults([]);
    }

    setIsAnalyzing(false);
  }, [stopCamera]);

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

      <div className="camera-area">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={isStreaming ? 'visible' : 'hidden'}
        />
        {capturedImage && !isStreaming && (
          <div className="captured-preview">
            <img src={capturedImage} alt="とった　しゃしん" />
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="camera-controls">
        {!isStreaming && !capturedImage && !isAnalyzing && (
          <button className="camera-start-btn" onClick={startCamera}>
            📷 カメラを　ひらく
          </button>
        )}
        {isStreaming && (
          <>
            <button className="camera-shutter-btn" onClick={takePicture}>
              📸
            </button>
            <span className="shutter-hint">ボタンを　おして　しゃしんを　とってね</span>
          </>
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

      {!isAnalyzing && results.length > 0 && (
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
      )}

      {!isAnalyzing && capturedImage && results.length === 0 && (
        <div className="results-area">
          <p className="no-results">かんじが　みつかりませんでした</p>
        </div>
      )}

      {!isAnalyzing && allText && (
        <div className="camera-controls">
          <button className="speak-btn-large" onClick={() => speak(allText)}>
            🔊 よむ
          </button>
        </div>
      )}
    </div>
  );
}
