export default function Home({ onNavigate }) {
  return (
    <div className="home">
      <h1 className="home-title">かんじヘルプ</h1>
      <p className="home-subtitle">かんじを　べんきょう　しよう！</p>

      <div className="home-buttons">
        <button className="home-btn speech-btn" onClick={() => onNavigate('speech')}>
          <span className="btn-emoji">🎤</span>
          <span className="btn-title">おはなしモード</span>
          <span className="btn-desc">にほんごで　はなして、かんじを　みよう！</span>
        </button>

        <button className="home-btn camera-btn" onClick={() => onNavigate('camera')}>
          <span className="btn-emoji">📷</span>
          <span className="btn-title">カメラモード</span>
          <span className="btn-desc">カメラで　かんじを　よもう！</span>
        </button>
      </div>
    </div>
  );
}
