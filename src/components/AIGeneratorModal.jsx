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

  // Converte o arquivo para Base64 (necessário para o Gemini)
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]); // Pega apenas a string b64
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione uma foto primeiro!');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Chave da API do Gemini não configurada!');
      }

      setLoadingText('A IA está analisando a sua foto...');
      
      const base64Image = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;

      // 1. Chamar a API do Gemini 2.5 Flash para descrever a foto
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const geminiBody = {
        contents: [{
          parts: [
            { text: "Describe the exact person in this image in high detail (gender, hair color/style, clothing, expression, accessories). Reply ONLY with the concise physical description in English." },
            { inlineData: { mimeType, data: base64Image } }
          ]
        }]
      };

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API Error:', errorText);
        throw new Error('Falha ao comunicar com o Gemini. Veja o console.');
      }

      const geminiData = await geminiResponse.json();
      const description = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!description) {
        throw new Error('O Gemini não conseguiu descrever a imagem.');
      }

      setLoadingText('Desenhando a versão Anime (pode levar 10 seg)...');

      // 2. Chamar a API do Pollinations AI com o prompt combinado
      const finalPrompt = `${description}, highly detailed k-pop anime style, coloring book page style, pure black clean line art outlines, pure white background, no shading, 2d flat vector style`;
      const encodedPrompt = encodeURIComponent(finalPrompt);
      const seed = Math.floor(Math.random() * 1000000);
      
      // Monta a URL mágica que gera a imagem na hora
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&width=800&height=800`;

      // Pré-carrega a imagem para ter certeza que ela terminou de ser gerada antes de fechar o modal
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imageUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Falha ao gerar o desenho.'));
      });

      // Retorna a URL final da IA para o Canvas
      onImageGenerated(imageUrl);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao gerar a arte com IA.');
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
