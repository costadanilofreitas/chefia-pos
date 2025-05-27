import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

const ThemeToggle = ({ isDark, onToggle }) => {
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label="Alternar tema">
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
    </button>
  );
};

export default ThemeToggle;
