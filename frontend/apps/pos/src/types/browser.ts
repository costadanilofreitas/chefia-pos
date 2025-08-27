/**
 * Browser-specific API types and interfaces
 */

// Vendor-specific fullscreen APIs
export interface DocumentWithVendorFullscreen extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

export interface HTMLElementWithVendorFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

// Vendor-specific visibility APIs
export interface DocumentWithVisibility extends Document {
  msHidden?: boolean;
  webkitHidden?: boolean;
  mozHidden?: boolean;
}

// Battery API
export interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

// Network Information API
export interface NetworkInformation {
  type?: string;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

// Wake Lock API
export interface WakeLockSentinel {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface NavigatorWithWakeLock {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}

// Media Session API
export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: Array<{
    src: string;
    sizes?: string;
    type?: string;
  }>;
}

export interface MediaSession {
  metadata?: MediaMetadata | null;
  playbackState?: 'none' | 'paused' | 'playing';
  setActionHandler(action: string, handler: (() => void) | null): void;
}

export interface NavigatorWithMediaSession {
  mediaSession?: MediaSession;
}

// Notification with additional properties
export interface ExtendedNotification {
  vibrate?: number | number[];
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}