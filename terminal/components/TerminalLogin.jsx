import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock } from '@fortawesome/free-solid-svg-icons';

const TerminalLogin = ({ onLogin }) => {
  const [waiterId, setWaiterId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!waiterId.trim()) {
      setError('Por favor, informe o ID do garçom');
      return;
    }
    
    if (!password.trim()) {
      setError('Por favor, informe a senha');
      return;
    }
    
    // Em um ambiente real, validaríamos a senha
    // Por enquanto, apenas simulamos o login
    onLogin(waiterId);
  };
  
  return (
    <div className="terminal-login">
      <h2 className="terminal-login-title">Login do Terminal</h2>
      
      {error && <div className="terminal-error">{error}</div>}
      
      <form className="terminal-login-form" onSubmit={handleSubmit}>
        <div className="terminal-login-field">
          <FontAwesomeIcon icon={faUser} className="terminal-login-icon" />
          <input
            type="text"
            className="terminal-login-input"
            placeholder="ID do Garçom"
            value={waiterId}
            onChange={(e) => setWaiterId(e.target.value)}
          />
        </div>
        
        <div className="terminal-login-field">
          <FontAwesomeIcon icon={faLock} className="terminal-login-icon" />
          <input
            type="password"
            className="terminal-login-input"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <button type="submit" className="terminal-login-button">
          Entrar
        </button>
      </form>
    </div>
  );
};

export default TerminalLogin;
