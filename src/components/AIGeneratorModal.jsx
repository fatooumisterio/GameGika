import React, { useState } from 'react';
import { Camera, Upload, X, Loader2, Sparkles } from 'lucide-react';
import './AIGeneratorModal.css';

const AIGeneratorModal = ({ onClose, onImageGenerated }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const handleGenerate = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione uma foto primeiro!');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // =========================================================================
      // ⚠️ INTEGRAÇÃO DE API AQUI (OPÇÃO 3)
      // =========================================================================
      // Neste bloco você fará a chamada real para o seu backend ou API de IA
      // (ex: Replicate, OpenAI DALL-E, Google Vertex AI)
      // 
      // Exemplo de código real (usando Replicate para Image-to-Image ControlNet):
      // const formData = new FormData();
      // formData.append('image', selectedFile);
      // const response = await fetch('https://seu-backend.com/api/generate-anime', {
      //   method: 'POST',
      //   body: formData
      // });
      // const data = await response.json();
      // const finalImageUrl = data.outputUrl; // A URL do desenho vetorizado em P&B
      // =========================================================================

      // SIMULAÇÃO DE TEMPO DE RESPOSTA DA IA (Placeholder)
      await new Promise((resolve) => setTimeout(resolve, 3500));

      // Simulando o retorno de uma imagem P&B (Aqui estamos apenas passando a foto
      // original com um alerta, mas o código real retornaria a imagem gerada).
      alert("Aviso: Como esta é uma simulação, vamos usar a foto original como se fosse o desenho para colorir. Conecte sua API real no código para funcionar a Inteligência Artificial!");
      onImageGenerated(previewUrl); 
      
    } catch (err) {
      setError('Falha ao conectar com a API de IA. Tente novamente.');
    } finally {
      setIsGenerating(false);
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
            <><Loader2 className="spin" size={20} /> Transformando com IA...</>
          ) : (
            <><Upload size={20} /> Gerar Desenho</>
          )}
        </button>
      </div>
    </div>
  );
};

export default AIGeneratorModal;
