/**
 * Connection Indicator Component
 * Shows online/offline status with visual feedback
 */

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface ConnectionIndicatorProps {
  isOnline: boolean;
  isConnected?: boolean;
  showLabel?: boolean;
  showPulse?: boolean;
  className?: string;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  isOnline,
  isConnected = false,
  showLabel = true,
  showPulse = true,
  className = ''
}) => {
  const status = isOnline ? 'online' : 'offline';
  const Icon = isOnline ? Wifi : WifiOff;
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLabel ? (
        <StatusBadge
          status={status}
          icon={<Icon className="h-4 w-4" />}
        />
      ) : (
        <Icon className={`h-4 w-4 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
      )}
      
      {showPulse && isConnected && (
        <div className="relative">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
        </div>
      )}
    </div>
  );
};

// Mini version for headers
export const ConnectionDot: React.FC<{ isOnline: boolean }> = ({ isOnline }) => (
  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
);