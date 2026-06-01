import React, { useState } from 'react';
import ColoringGame from './components/ColoringGame';
import SplashScreen from './components/SplashScreen';
import './index.css';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="app-container">
      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      ) : (
        <ColoringGame />
      )}
    </div>
  );
}

export default App;
