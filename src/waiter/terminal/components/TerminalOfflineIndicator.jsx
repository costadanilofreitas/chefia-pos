import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faWifiSlash } from '@fortawesome/free-solid-svg-icons';

const TerminalOfflineIndicator = () => {
  return (
    <div className="terminal-offline-indicator">
      <FontAwesomeIcon icon={faWifiSlash} />
      <span className="terminal-offline-text">Offline</span>
    </div>
  );
};

export default TerminalOfflineIndicator;
