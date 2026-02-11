import { useState } from 'react'
import Home from './pages/Home'
import SpeechMode from './pages/SpeechMode'
import CameraMode from './pages/CameraMode'

export default function App() {
  const [page, setPage] = useState('home');
  const [deeplKey] = useState(
    () => import.meta.env.VITE_DEEPL_API_KEY || localStorage.getItem('deepl_key') || ''
  );

  switch (page) {
    case 'speech':
      return <SpeechMode deeplKey={deeplKey} onBack={() => setPage('home')} />;
    case 'camera':
      return <CameraMode deeplKey={deeplKey} onBack={() => setPage('home')} />;
    default:
      return <Home onNavigate={setPage} />;
  }
}
