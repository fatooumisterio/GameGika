import React, { useState } from 'react';
import { Camera, Upload, X, Loader2, Sparkles } from 'lucide-react';
import './AIGeneratorModal.css';

const AIGeneratorModal = ({ onClose, onImageGenerated }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError('');
    }
  };

  const processImageToLineArt = async (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Redimensionar para um tamanho razoável para o filtro
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.floor(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // 1. Converter para Tons de Cinza
        const grayscale = new Uint8ClampedArray(width * height);
        for (let i = 0; i < data.length; i += 4) {
          grayscale[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }
        
        // 2. Filtro de Sobel (Detecção de Bordas)
        const sobelData = new Uint8ClampedArray(data.length);
        const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const kernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            let pixelX = 0;
            let pixelY = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const pos = ((y + ky) * width + (x + kx));
                const val = grayscale[pos];
                const weightIdx = (ky + 1) * 3 + (kx + 1);
                pixelX += val * kernelX[weightIdx];
                pixelY += val * kernelY[weightIdx];
              }
            }
            
            const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
            const idx = (y * width + x) * 4;
            
            // Threshold: Define o que é linha preta e o que é fundo branco
            // Magnitudes maiores que 40 são consideradas "bordas" (linhas pretas)
            const isEdge = magnitude > 40;
            const color = isEdge ? 0 : 255;
            
            sobelData[idx] = color;     // R
            sobelData[idx + 1] = color; // G
            sobelData[idx + 2] = color; // B
            sobelData[idx + 3] = 255;   // Alpha
          }
        }
        
        ctx.putImageData(new ImageData(sobelData, width, height), 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione uma foto primeiro!');
      return;
    }

    setIsGenerating(true);
    setError('');
    setLoadingText('Mapeando contornos da foto...');

    try {
      // Usamos um pequeno atraso para a UI poder mostrar o Loading
      await new Promise(r => setTimeout(r, 500));
      
      const lineArtUrl = await processImageToLineArt(selectedFile);
      
      onImageGenerated(lineArtUrl);
      
    } catch (err) {
      console.error(err);
      setError('Erro ao processar a imagem.');
    } finally {
      setIsGenerating(false);
      setLoadingText('');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        
        <h2 className="modal-title">
          <Sparkles className="text-accent" /> Criar Anime com IA
        </h2>
        <p className="modal-desc">Faça upload de uma foto para transformar em um desenho de K-pop Anime para colorir!</p>

        <div className="upload-area">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="preview-image" />
          ) : (
            <div className="upload-placeholder">
              <Camera size={48} className="text-gray" />
              <span>Toque para escolher uma foto</span>
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            className="file-input" 
            onChange={handleFileChange}
            disabled={isGenerating}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button 
          className={`generate-btn ${isGenerating ? 'generating' : ''}`}
          onClick={handleGenerate}
          disabled={!selectedFile || isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="spin" size={20} /> {loadingText || 'Transformando com IA...'}</>
          ) : (
            <><Upload size={20} /> Gerar Desenho</>
          )}
        </button>
      </div>
    </div>
  );
};

export default AIGeneratorModal;
