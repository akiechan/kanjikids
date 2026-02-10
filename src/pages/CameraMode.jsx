import { useState, useRef, useEffect } from 'react'
import { tokenize, tokensToFurigana, speak } from '../utils/japanese'

export default function CameraMode({ deeplKey, onBack }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [furiganaData, setFuriganaData] = useState([]);
  const [recognizedText, setRecognizedText] = useState('');
  const [showResults, setShowResults] = useState(false);
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
      setShowResults(false);
      setFuriganaData([]);
      setRecognizedText('');
    } catch (err) {
      console.error('Camera error:', err);
      alert('カメラを　ひらけませんでした');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const stopAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Capture the center box area (60% width, 40% height)
    const boxWidth = video.videoWidth * 0.6;
    const boxHeight = video.videoHeight * 0.4;
    const boxX = (video.videoWidth - boxWidth) / 2;
    const boxY = (video.videoHeight - boxHeight) / 2;

    canvas.width = boxWidth;
    canvas.height = boxHeight;

    // Apply contrast enhancement for better OCR
    ctx.filter = 'contrast(1.4) grayscale(1)';
    ctx.drawImage(video, boxX, boxY, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight);
    ctx.filter = 'none';

    stopCamera();

    try {
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker('jpn');
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      const cleanText = text.replace(/[\s\n\r]+/g, '').trim();
      setRecognizedText(cleanText);

      if (cleanText) {
        const tokens = tokenize(cleanText);
        const furigana = tokensToFurigana(tokens);
        setFuriganaData(furigana);
      }

      setShowResults(true);
    } catch (err) {
      console.error('OCR error:', err);
      alert('もじを　よみとれませんでした');
    }

    setIsProcessing(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="camera-mode">
      <div className="top-bar">
        <button className="back-btn" onClick={() => { stopCamera(); onBack(); }}>
          ← もどる
        </button>
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
            <div className="scan-box">
              <span className="scan-label">ここに　かんじを　うつしてね</span>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="camera-controls">
        {!isStreaming && !isProcessing && (
          <button className="camera-start-btn" onClick={startCamera}>
            📷 カメラを　ひらく
          </button>
        )}
        {isStreaming && (
          <button className="camera-stop-btn" onClick={stopAndAnalyze}>
            ⏹️ とめて　よみとる
          </button>
        )}
        {isProcessing && (
          <div className="processing">
            <div className="loading-spinner small" />
            <span>よみとっています...</span>
          </div>
        )}
      </div>

      {showResults && (
        <div className="results-area">
          <div className="results-header">
            <h2>よみとった　かんじ</h2>
            {recognizedText && (
              <button className="speak-btn" onClick={() => speak(recognizedText)}>
                🔊
              </button>
            )}
          </div>

          {furiganaData.length > 0 ? (
            <div className="furigana-text large">
              {furiganaData.map((item, i) => (
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
          ) : (
            <p className="no-results">かんじが　みつかりませんでした</p>
          )}
        </div>
      )}
    </div>
  );
}
