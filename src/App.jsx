import { useState, useEffect, useCallback } from 'react'
import Home from './pages/Home'
import SpeechMode from './pages/SpeechMode'
import CameraMode from './pages/CameraMode'

export default function App() {
  const [page, setPage] = useState('home');
  const [deeplKey] = useState(
    () => import.meta.env.VITE_DEEPL_API_KEY || localStorage.getItem('deepl_key') || ''
  );

  const navigate = useCallback((newPage) => {
    setPage(newPage);
    if (newPage !== 'home') {
      history.pushState({ page: newPage }, '', `#${newPage}`);
    }
  }, []);

  const goHome = useCallback(() => {
    setPage('home');
    if (location.hash) {
      history.replaceState(null, '', location.pathname);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPage('home');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  switch (page) {
    case 'speech':
      return <SpeechMode deeplKey={deeplKey} onBack={goHome} />;
    case 'camera':
      return <CameraMode deeplKey={deeplKey} onBack={goHome} />;
    default:
      return <Home onNavigate={navigate} />;
  }
}
