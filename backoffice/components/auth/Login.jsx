import React, { useState } from 'react';
import tokens from '../../styles/tokens';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';

/**
 * Login component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onLogin - Login handler
 * @param {string} [props.className] - Additional CSS class names
 */
const Login = ({
  onLogin,
  className = '',
  ...rest
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle login form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call login handler
      onLogin({ email });
    } catch (err) {
      setError('Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const containerStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.background.default,
  };

  const logoStyles = {
    fontSize: tokens.typography.h2.fontSize,
    fontWeight: tokens.typography.h2.fontWeight,
    color: tokens.colors.primary.main,
    marginBottom: tokens.spacing.xl,
    textAlign: 'center',
  };

  const formStyles = {
    width: '100%',
    maxWidth: '400px',
  };

  const errorStyles = {
    color: tokens.colors.semantic.error,
    fontSize: tokens.typography.fontSize.sm,
    marginBottom: tokens.spacing.md,
    textAlign: 'center',
  };

  const footerStyles = {
    marginTop: tokens.spacing.lg,
    textAlign: 'center',
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.sm,
  };

  // Create class names
  const containerClass = `pos-login-container ${className}`;
  const formClass = 'pos-login-form';

  return (
    <div className={containerClass} style={containerStyles} {...rest}>
      <div style={logoStyles}>
        <span>POS Modern</span>
        <div style={{ fontSize: tokens.typography.fontSize.md, fontWeight: tokens.typography.fontWeightRegular }}>
          Backoffice
        </div>
      </div>
      
      <Card elevated>
        <form className={formClass} style={formStyles} onSubmit={handleSubmit}>
          {error && <div style={errorStyles}>{error}</div>}
          
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            fullWidth
            disabled={loading}
          />
          
          <Input
            type="password"
            label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            required
            fullWidth
            disabled={loading}
          />
          
          <div style={{ marginTop: tokens.spacing.lg }}>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Entrar
            </Button>
          </div>
        </form>
      </Card>
      
      <div style={footerStyles}>
        <p>© {new Date().getFullYear()} POS Modern. Todos os direitos reservados.</p>
      </div>
    </div>
  );
};

export default Login;
