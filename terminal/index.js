import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import TerminalRouter from './TerminalRouter';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(
  <React.StrictMode>
    <TerminalRouter />
  </React.StrictMode>,
  document.getElementById('root')
);

// Registrar service worker para suporte offline
serviceWorker.register();
