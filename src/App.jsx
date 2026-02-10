import { useState, useEffect } from 'react'
import { initTokenizer } from './utils/japanese'
import Home from './pages/Home'
import SpeechMode from './pages/SpeechMode'
import CameraMode from './pages/CameraMode'

export default function App() {
  const [page, setPage] = useState('home');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [deeplKey, setDeeplKey] = useState(
    () => import.meta.env.VITE_DEEPL_API_KEY || localStorage.getItem('deepl_key') || ''
  );

  useEffect(() => {
    initTokenizer()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error('Failed to init tokenizer:', err);
        setLoadError(err.message);
        setLoading(false);
      });
  }, []);


  if (loading) {
    return (
      <div className="loading-screen">
        <h1>かんじヘルプ</h1>
        <div className="loading-spinner" />
        <p>じしょを　よみこんでいます...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="loading-screen">
        <h1>かんじヘルプ</h1>
        <p className="error-text">エラー: {loadError}</p>
        <button onClick={() => window.location.reload()}>もういちど</button>
      </div>
    );
  }

  switch (page) {
    case 'speech':
      return <SpeechMode deeplKey={deeplKey} onBack={() => setPage('home')} />;
    case 'camera':
      return <CameraMode deeplKey={deeplKey} onBack={() => setPage('home')} />;
    default:
      return <Home onNavigate={setPage} />;
  }
}
