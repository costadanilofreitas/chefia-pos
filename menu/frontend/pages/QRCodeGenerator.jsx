import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode, faDownload, faCopy, faRedo } from '@fortawesome/free-solid-svg-icons';

const QRCodeGenerator = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState('');
  const [qrConfig, setQrConfig] = useState({
    restaurant_id: restaurantId,
    menu_id: '',
    name: 'Menu QR Code',
    description: 'Escaneie para ver nosso cardápio',
    foreground_color: '#000000',
    background_color: '#FFFFFF',
    error_correction_level: 'M',
    size: 300
  });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuUrl, setMenuUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch available menus for the restaurant
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/menu/?restaurant_id=${restaurantId}&active=true`);
        if (!response.ok) {
          throw new Error('Failed to fetch menus');
        }
        const data = await response.json();
        setMenus(data);
        if (data.length > 0) {
          setSelectedMenu(data[0].id);
          setQrConfig(prev => ({ ...prev, menu_id: data[0].id }));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchMenus();
    }
  }, [restaurantId]);

  // Update QR config when menu selection changes
  useEffect(() => {
    if (selectedMenu) {
      setQrConfig(prev => ({ ...prev, menu_id: selectedMenu }));
      
      // Generate the menu URL that the QR code will point to
      const baseUrl = window.location.origin;
      const menuUrl = `${baseUrl}/menu/r/${restaurantId}/m/${selectedMenu}`;
      setMenuUrl(menuUrl);
    }
  }, [selectedMenu, restaurantId]);

  // Generate QR code
  const generateQRCode = async () => {
    if (!qrConfig.menu_id) {
      setError('Por favor, selecione um menu');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, create or update the QR code configuration
      const configResponse = await fetch('/api/menu/qrcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(qrConfig)
      });

      if (!configResponse.ok) {
        throw new Error('Falha ao salvar configuração do QR code');
      }

      const configData = await configResponse.json();
      
      // Then, get the QR code image
      const imageUrl = `/api/menu/qrcode/${configData.id}/image`;
      setQrCodeUrl(imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQrConfig(prev => ({ ...prev, [name]: value }));
  };

  // Handle menu selection
  const handleMenuChange = (e) => {
    setSelectedMenu(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    generateQRCode();
  };

  // Download QR code
  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${qrConfig.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy menu URL to clipboard
  const copyMenuUrl = () => {
    if (!menuUrl) return;

    navigator.clipboard.writeText(menuUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        setError('Falha ao copiar URL: ' + err.message);
      });
  };

  return (
    <div className="qrcode-generator-page">
      <Header 
        title="Gerador de QR Code" 
        showBackButton={true}
      />

      <div className="qrcode-container">
        <div className="qrcode-form-section">
          <form onSubmit={handleSubmit} className="qrcode-form">
            <div className="form-group">
              <label htmlFor="menu-select" className="form-label">Menu</label>
              <select 
                id="menu-select"
                className="form-control"
                value={selectedMenu}
                onChange={handleMenuChange}
                disabled={loading || menus.length === 0}
              >
                {menus.length === 0 && (
                  <option value="">Nenhum menu disponível</option>
                )}
                {menus.map(menu => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="name" className="form-label">Nome do QR Code</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-control"
                value={qrConfig.name}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">Descrição</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                value={qrConfig.description}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="foreground_color" className="form-label">Cor do QR Code</label>
                <div className="color-input-container">
                  <input
                    type="color"
                    id="foreground_color"
                    name="foreground_color"
                    className="color-input"
                    value={qrConfig.foreground_color}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <input
                    type="text"
                    className="color-text"
                    value={qrConfig.foreground_color}
                    onChange={handleInputChange}
                    name="foreground_color"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="background_color" className="form-label">Cor de Fundo</label>
                <div className="color-input-container">
                  <input
                    type="color"
                    id="background_color"
                    name="background_color"
                    className="color-input"
                    value={qrConfig.background_color}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <input
                    type="text"
                    className="color-text"
                    value={qrConfig.background_color}
                    onChange={handleInputChange}
                    name="background_color"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="error_correction_level" className="form-label">Nível de Correção</label>
                <select
                  id="error_correction_level"
                  name="error_correction_level"
                  className="form-control"
                  value={qrConfig.error_correction_level}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="L">Baixo (7%)</option>
                  <option value="M">Médio (15%)</option>
                  <option value="Q">Alto (25%)</option>
                  <option value="H">Muito Alto (30%)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="size" className="form-label">Tamanho (px)</label>
                <input
                  type="number"
                  id="size"
                  name="size"
                  className="form-control"
                  value={qrConfig.size}
                  onChange={handleInputChange}
                  min="100"
                  max="1000"
                  step="50"
                  disabled={loading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary generate-btn"
              disabled={loading || !selectedMenu}
            >
              {loading ? 'Gerando...' : 'Gerar QR Code'}
              <FontAwesomeIcon icon={faQrcode} className="btn-icon" />
            </button>
          </form>
        </div>

        <div className="qrcode-preview-section">
          <h3 className="preview-title">Visualização do QR Code</h3>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="qrcode-preview">
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="qrcode-image" 
              />
            ) : (
              <div className="qrcode-placeholder">
                <FontAwesomeIcon icon={faQrcode} className="placeholder-icon" />
                <p>Gere um QR Code para visualizá-lo aqui</p>
              </div>
            )}
          </div>
          
          {qrCodeUrl && (
            <div className="qrcode-actions">
              <button 
                className="btn btn-secondary"
                onClick={downloadQRCode}
              >
                <FontAwesomeIcon icon={faDownload} /> Baixar
              </button>
              
              <button 
                className="btn btn-outline"
                onClick={generateQRCode}
              >
                <FontAwesomeIcon icon={faRedo} /> Atualizar
              </button>
            </div>
          )}
          
          {menuUrl && (
            <div className="menu-url-container">
              <h4>URL do Menu:</h4>
              <div className="menu-url">
                <input 
                  type="text" 
                  value={menuUrl} 
                  readOnly 
                  className="menu-url-input"
                />
                <button 
                  className="copy-url-btn"
                  onClick={copyMenuUrl}
                >
                  <FontAwesomeIcon icon={faCopy} />
                  {copied ? ' Copiado!' : ' Copiar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
