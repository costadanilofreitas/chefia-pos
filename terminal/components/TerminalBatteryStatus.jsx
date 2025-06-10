import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBatteryFull, faBatteryThreeQuarters, faBatteryHalf, faBatteryQuarter, faBatteryEmpty } from '@fortawesome/free-solid-svg-icons';

const TerminalBatteryStatus = ({ level }) => {
  // Determinar o ícone com base no nível da bateria
  const getBatteryIcon = () => {
    if (level >= 75) return faBatteryFull;
    if (level >= 50) return faBatteryThreeQuarters;
    if (level >= 25) return faBatteryHalf;
    if (level > 10) return faBatteryQuarter;
    return faBatteryEmpty;
  };
  
  // Determinar a cor com base no nível da bateria
  const getBatteryColor = () => {
    if (level >= 50) return '#4CAF50'; // Verde
    if (level >= 20) return '#FF9800'; // Laranja
    return '#F44336'; // Vermelho
  };
  
  return (
    <div className="terminal-battery-status" style={{ color: getBatteryColor() }}>
      <FontAwesomeIcon icon={getBatteryIcon()} className="terminal-battery-icon" />
      <span className="terminal-battery-level">{level}%</span>
    </div>
  );
};

export default TerminalBatteryStatus;
