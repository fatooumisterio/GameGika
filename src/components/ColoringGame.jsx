import React, { useRef, useState, useEffect } from 'react';
import { Palette, RefreshCw, Undo, Download, PaintBucket, Brush, Stamp, Camera } from 'lucide-react';
import AIGeneratorModal from './AIGeneratorModal';
import './ColoringGame.css';

const COLORS = [
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16', 
  '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1', 
  '#a855f7', '#ec4899', '#ffffff'
];

const STAMPS = ['heart', 'star', 'music'];

// Placeholder K-pop Anime SVG data URI (A simple cute star/idol placeholder)
// The user should replace this with their actual SVGs.
const PLACEHOLDER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <style> path, circle { fill: none; stroke: black; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; } </style>
  <circle cx="200" cy="200" r="180" />
  <!-- Hair -->
  <path d="M 100,150 Q 150,50 200,80 Q 250,50 300,150 Q 280,250 250,200 Q 200,220 150,200 Q 120,250 100,150 Z" />
  <!-- Eyes -->
  <circle cx="160" cy="180" r="15" />
  <circle cx="240" cy="180" r="15" />
  <!-- Smile -->
  <path d="M 180,220 Q 200,240 220,220" />
  <!-- Star symbol for K-pop -->
  <path d="M 300,100 L 310,130 L 340,130 L 315,150 L 325,180 L 300,160 L 275,180 L 285,150 L 260,130 L 290,130 Z" />
  <text x="130" y="320" font-family="sans-serif" font-size="24" stroke="none" fill="black">K-POP IDOL (Exemplo)</text>
</svg>`;

function hexToRgba(hex) {
  let c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
      c= hex.substring(1).split('');
      if(c.length === 3) c= [c[0], c[0], c[1], c[1], c[2], c[2]];
      c= '0x'+c.join('');
      return [(c>>16)&255, (c>>8)&255, c&255, 255];
  }
  return [255, 255, 255, 255];
}

const ColoringGame = () => {
  const canvasRef = useRef(null);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [activeTool, setActiveTool] = useState('bucket'); // bucket, brush, stamp
  const [activeStamp, setActiveStamp] = useState('heart');
  const [brushSize, setBrushSize] = useState(10);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  const [currentOutlineSrc, setCurrentOutlineSrc] = useState(PLACEHOLDER_SVG);
  const [showAIModal, setShowAIModal] = useState(false);
  
  const [history, setHistory] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);
  
  const outlineImageRef = useRef(null);

  useEffect(() => {
    // Load the SVG outline once or when it changes
    const img = new Image();
    img.src = currentOutlineSrc;
    img.onload = () => {
      outlineImageRef.current = img;
      initCanvas();
    };
  }, [currentOutlineSrc]);

  const drawOutline = (ctx) => {
    if (outlineImageRef.current) {
      const canvas = ctx.canvas;
      ctx.drawImage(outlineImageRef.current, 0, 0, canvas.width, canvas.height);
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth - 32, container.clientHeight - 32, 800);
    
    canvas.width = size;
    canvas.height = size;
    setCanvasSize({ width: size, height: size });
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawOutline(ctx);
    setHistory([]);
  };

  useEffect(() => {
    const timer = setTimeout(initCanvas, 100);
    window.addEventListener('resize', initCanvas);
    return () => { clearTimeout(timer); window.removeEventListener('resize', initCanvas); };
  }, []);

  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    setHistory(prev => {
        const newHist = [...prev, canvas.toDataURL()];
        if(newHist.length > 10) newHist.shift(); // keep max 10 to save memory
        return newHist;
    });
  };

  const applyUndo = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const lastState = newHistory.pop();
    setHistory(newHistory);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  // --- FLOOD FILL ---
  const doFloodFill = (ctx, startX, startY, fillColorHex) => {
    const canvas = ctx.canvas;
    const w = canvas.width;
    const h = canvas.height;
    
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = new Uint32Array(imageData.data.buffer);
    
    const startPos = Math.floor(startY) * w + Math.floor(startX);
    const startColor = data[startPos];
    
    const [r, g, b, a] = hexToRgba(fillColorHex);
    const targetColor = (a << 24) | (b << 16) | (g << 8) | r;
    
    if (startColor === targetColor) return false;
    
    const sr = startColor & 0xff;
    const sg = (startColor >> 8) & 0xff;
    const sb = (startColor >> 16) & 0xff;
    if (sr < 50 && sg < 50 && sb < 50) return false; // Clicked on black line
    
    const pixelStack = [startPos];
    
    while (pixelStack.length) {
      const pos = pixelStack.pop();
      let currentX = pos % w;
      let currentY = Math.floor(pos / w);
      
      let leftPos = pos;
      while (currentX >= 0 && data[leftPos] === startColor) { leftPos--; currentX--; }
      leftPos++; currentX++;
      
      let rightPos = pos + 1;
      let rightX = currentX + 1;
      while (rightX < w && data[rightPos] === startColor) { rightPos++; rightX++; }
      rightPos--; rightX--;
      
      let reachAbove = false;
      let reachBelow = false;
      
      for (let p = leftPos; p <= rightPos; p++) {
        data[p] = targetColor;
        const yIndex = Math.floor(p / w);
        if (yIndex > 0) {
          const topPos = p - w;
          if (data[topPos] === startColor) {
            if (!reachAbove) { pixelStack.push(topPos); reachAbove = true; }
          } else if (reachAbove) reachAbove = false;
        }
        if (yIndex < h - 1) {
          const bottomPos = p + w;
          if (data[bottomPos] === startColor) {
            if (!reachBelow) { pixelStack.push(bottomPos); reachBelow = true; }
          } else if (reachBelow) reachBelow = false;
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return true;
  };

  // --- STAMPS ---
  const drawStamp = (ctx, x, y, type, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      const size = brushSize * 2;
      if (type === 'heart') {
          ctx.moveTo(x, y - size/4);
          ctx.bezierCurveTo(x, y - size, x - size, y - size, x - size, y - size/4);
          ctx.bezierCurveTo(x - size, y + size/2, x, y + size*0.8, x, y + size);
          ctx.bezierCurveTo(x, y + size*0.8, x + size, y + size/2, x + size, y - size/4);
          ctx.bezierCurveTo(x + size, y - size, x, y - size, x, y - size/4);
      } else if (type === 'star') {
          for (let i = 0; i < 5; i++) {
              ctx.lineTo(Math.cos((18+i*72)/180*Math.PI)*size + x, -Math.sin((18+i*72)/180*Math.PI)*size + y);
              ctx.lineTo(Math.cos((54+i*72)/180*Math.PI)*size/2 + x, -Math.sin((54+i*72)/180*Math.PI)*size/2 + y);
          }
      } else if (type === 'music') {
          ctx.arc(x - size/2, y + size/2, size/3, 0, Math.PI*2);
          ctx.arc(x + size/2, y + size/4, size/3, 0, Math.PI*2);
          ctx.fill();
          ctx.beginPath();
          ctx.lineWidth = size/4;
          ctx.moveTo(x - size/4, y + size/2);
          ctx.lineTo(x - size/4, y - size);
          ctx.lineTo(x + size*0.75, y - size*1.2);
          ctx.lineTo(x + size*0.75, y + size/4);
          ctx.stroke();
      }
      ctx.closePath();
      ctx.fill();
  }

  // --- EVENT HANDLERS ---
  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX; clientY = e.clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: Math.floor(x * scaleX), y: Math.floor(y * scaleY) };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    saveStateToHistory();
    const pos = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    
    if (activeTool === 'bucket') {
        const success = doFloodFill(ctx, pos.x, pos.y, activeColor);
        if(success) drawOutline(ctx);
    } else if (activeTool === 'stamp') {
        drawStamp(ctx, pos.x, pos.y, activeStamp, activeColor);
        drawOutline(ctx);
    } else if (activeTool === 'brush') {
        setIsDrawing(true);
        setLastPos(pos);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = activeColor;
        ctx.fill();
    }
  };

  const handlePointerMove = (e) => {
    e.preventDefault();
    if (!isDrawing || activeTool !== 'brush') return;
    const pos = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    setLastPos(pos);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (isDrawing && activeTool === 'brush') {
        setIsDrawing(false);
        const ctx = canvasRef.current.getContext('2d');
        drawOutline(ctx); // Redraw outline over brush strokes
    }
  };

  const handleDownload = () => {
      const link = document.createElement('a');
      link.download = 'kpop-anime-art.png';
      link.href = canvasRef.current.toDataURL();
      link.click();
  };

  return (
    <div className="game-container landscape-mode">
      {/* Sidebar Esquerda: Ferramentas */}
      <div className="sidebar left-sidebar">
        <div className="logo-vertical">GameGika</div>
        
        <div className="tools-group">
            <button className="icon-btn" onClick={() => setShowAIModal(true)} title="IA Foto para Anime" aria-label="Abrir IA">
              <Camera size={28} className="text-accent" />
            </button>
            <button className={`icon-btn ${activeTool === 'bucket' ? 'active' : ''}`} onClick={() => setActiveTool('bucket')}>
              <PaintBucket size={28} />
            </button>
            <button className={`icon-btn ${activeTool === 'brush' ? 'active' : ''}`} onClick={() => setActiveTool('brush')}>
              <Brush size={28} />
            </button>
            <button className={`icon-btn ${activeTool === 'stamp' ? 'active' : ''}`} onClick={() => setActiveTool('stamp')}>
              <Stamp size={28} />
            </button>
        </div>

        {activeTool === 'brush' && (
            <div className="slider-container">
                <label>Pincel</label>
                <input type="range" min="2" max="40" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} />
            </div>
        )}

        {activeTool === 'stamp' && (
            <div className="stamps-group">
                {STAMPS.map(stamp => (
                    <button key={stamp} className={`stamp-btn ${activeStamp === stamp ? 'active' : ''}`} onClick={() => setActiveStamp(stamp)}>
                        {stamp === 'heart' ? '❤️' : stamp === 'star' ? '⭐' : '🎵'}
                    </button>
                ))}
            </div>
        )}

        <div className="tools-group bottom">
            <button className="icon-btn" onClick={applyUndo} disabled={history.length === 0}><Undo size={24} /></button>
            <button className="icon-btn" onClick={initCanvas}><RefreshCw size={24} /></button>
            <button className="icon-btn" onClick={handleDownload}><Download size={24} /></button>
        </div>
      </div>

      {/* Centro: Canvas */}
      <div className="canvas-wrapper">
        <div style={{ position: 'relative', width: canvasSize.width || '100%', height: canvasSize.height || '100%' }}>
            <canvas 
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                style={{ position: 'absolute', top: 0, left: 0, width: canvasSize.width, height: canvasSize.height, display: canvasSize.width ? 'block' : 'none' }}
            />
            {canvasSize.width > 0 && (
                <img 
                  src={currentOutlineSrc}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    mixBlendMode: 'multiply'
                  }}
                  alt="Outline Overlay"
                />
            )}
        </div>
      </div>

      {/* Sidebar Direita / Inferior: Cores */}
      <div className="sidebar right-sidebar">
        <div className="colors-grid">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`color-btn ${activeColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setActiveColor(color)}
            />
          ))}
        </div>
      </div>

      {/* Modal de IA */}
      {showAIModal && (
        <AIGeneratorModal 
          onClose={() => setShowAIModal(false)}
          onImageGenerated={(newSrc) => {
             setCurrentOutlineSrc(newSrc);
             setShowAIModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ColoringGame;
