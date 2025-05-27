import React, { useState } from 'react';
import tokens from '../../styles/tokens';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

/**
 * ConfigurationPanel component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {Object} props.restaurant - Current restaurant information
 * @param {string} [props.className] - Additional CSS class names
 */
const ConfigurationPanel = ({
  restaurant,
  className = '',
  ...rest
}) => {
  // Mock initial configuration data
  const [config, setConfig] = useState({
    name: restaurant?.name || '',
    address: restaurant?.address || '',
    phone: restaurant?.phone || '',
    email: restaurant?.email || '',
    taxId: restaurant?.taxId || '',
    theme: restaurant?.theme || 'default',
    currency: restaurant?.currency || 'BRL',
    timezone: restaurant?.timezone || 'America/Sao_Paulo',
    orderNumberPrefix: restaurant?.orderNumberPrefix || '',
    autoAcceptOrders: restaurant?.autoAcceptOrders || false,
    notificationEmail: restaurant?.notificationEmail || '',
    logoUrl: restaurant?.logoUrl || '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig({
      ...config,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess(false);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError('Falha ao salvar as configurações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const configPanelStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg,
  };

  const sectionTitleStyles = {
    fontSize: tokens.typography.h5.fontSize,
    fontWeight: tokens.typography.h5.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing.md,
  };

  const formStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  };

  const formSectionStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: tokens.spacing.md,
  };

  const checkboxContainerStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  };

  const checkboxLabelStyles = {
    fontSize: tokens.typography.fontSize.md,
    color: tokens.colors.text.primary,
  };

  const successMessageStyles = {
    backgroundColor: tokens.colors.semantic.successLight,
    color: tokens.colors.semantic.successDark,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    marginBottom: tokens.spacing.md,
  };

  const errorMessageStyles = {
    backgroundColor: tokens.colors.semantic.errorLight,
    color: tokens.colors.semantic.errorDark,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    marginBottom: tokens.spacing.md,
  };

  // Theme options
  const themeOptions = [
    { value: 'default', label: 'Padrão' },
    { value: 'dark', label: 'Escuro' },
    { value: 'light', label: 'Claro' },
    { value: 'custom', label: 'Personalizado' },
  ];

  // Currency options
  const currencyOptions = [
    { value: 'BRL', label: 'Real Brasileiro (R$)' },
    { value: 'USD', label: 'Dólar Americano ($)' },
    { value: 'EUR', label: 'Euro (€)' },
  ];

  // Timezone options
  const timezoneOptions = [
    { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
    { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
    { value: 'America/Belem', label: 'Belém (GMT-3)' },
    { value: 'America/Bahia', label: 'Salvador (GMT-3)' },
    { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  ];

  // Create class names
  const configPanelClass = `pos-config-panel ${className}`;

  return (
    <div className={configPanelClass} style={configPanelStyles} {...rest}>
      <div style={sectionTitleStyles}>Configurações do Restaurante</div>
      
      <Card>
        <form style={formStyles} onSubmit={handleSubmit}>
          {success && (
            <div style={successMessageStyles}>
              Configurações salvas com sucesso!
            </div>
          )}
          
          {error && (
            <div style={errorMessageStyles}>
              {error}
            </div>
          )}
          
          <div style={sectionTitleStyles}>Informações Básicas</div>
          <div style={formSectionStyles}>
            <Input
              label="Nome do Restaurante"
              name="name"
              value={config.name}
              onChange={handleChange}
              required
              fullWidth
              disabled={loading}
            />
            
            <Input
              label="Endereço"
              name="address"
              value={config.address}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
            
            <Input
              label="Telefone"
              name="phone"
              value={config.phone}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
            
            <Input
              label="Email"
              type="email"
              name="email"
              value={config.email}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
            
            <Input
              label="CNPJ"
              name="taxId"
              value={config.taxId}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
            
            <Input
              label="URL do Logo"
              name="logoUrl"
              value={config.logoUrl}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
          </div>
          
          <div style={sectionTitleStyles}>Configurações de Sistema</div>
          <div style={formSectionStyles}>
            <Select
              label="Tema"
              name="theme"
              value={config.theme}
              onChange={handleChange}
              options={themeOptions}
              fullWidth
              disabled={loading}
            />
            
            <Select
              label="Moeda"
              name="currency"
              value={config.currency}
              onChange={handleChange}
              options={currencyOptions}
              fullWidth
              disabled={loading}
            />
            
            <Select
              label="Fuso Horário"
              name="timezone"
              value={config.timezone}
              onChange={handleChange}
              options={timezoneOptions}
              fullWidth
              disabled={loading}
            />
            
            <Input
              label="Prefixo do Número do Pedido"
              name="orderNumberPrefix"
              value={config.orderNumberPrefix}
              onChange={handleChange}
              placeholder="Ex: REST-"
              fullWidth
              disabled={loading}
            />
            
            <Input
              label="Email para Notificações"
              type="email"
              name="notificationEmail"
              value={config.notificationEmail}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
          </div>
          
          <div style={checkboxContainerStyles}>
            <input
              type="checkbox"
              id="autoAcceptOrders"
              name="autoAcceptOrders"
              checked={config.autoAcceptOrders}
              onChange={handleChange}
              disabled={loading}
            />
            <label htmlFor="autoAcceptOrders" style={checkboxLabelStyles}>
              Aceitar pedidos automaticamente
            </label>
          </div>
          
          <div style={{ marginTop: tokens.spacing.md }}>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
            >
              Salvar Configurações
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ConfigurationPanel;
