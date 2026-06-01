import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
  const [stage, setStage] = useState('entering');

  useEffect(() => {
    // Stage 1: Entra (1.5s)
    const t1 = setTimeout(() => {
      setStage('exiting');
    }, 2500);

    // Stage 2: Sai e finaliza (0.5s dps)
    const t2 = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <div className={`splash-container ${stage}`}>
      <div className="splash-content">
        <h1 className="splash-title">Gigika Caneli</h1>
        <p className="splash-subtitle">apresenta</p>
      </div>
    </div>
  );
};

export default SplashScreen;
