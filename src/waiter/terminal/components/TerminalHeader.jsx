import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

const TerminalHeader = ({ title, waiterId, onLogout }) => {
  return (
    <div className="terminal-header">
      <div className="terminal-header-title">{title}</div>
      
      {waiterId && (
        <div className="terminal-header-user">
          <FontAwesomeIcon icon={faUser} className="terminal-header-user-icon" />
          <span>Garçom: {waiterId}</span>
          <button className="terminal-logout-button" onClick={onLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} /> Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default TerminalHeader;
