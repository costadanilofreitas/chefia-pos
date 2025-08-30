/**
 * Kiosk Configuration File
 * This file contains all configuration options for the kiosk application
 */

export interface KioskTerminal {
  id: string;
  name: string;
  location: string;
  active: boolean;
}

export interface KioskConfig {
  // Terminal Configuration
  terminal: {
    id: string;
    name: string;
    location: string;
    validateSession: boolean;
    sessionTimeout: number; // in minutes
  };

  // UI Configuration
  ui: {
    // Theme
    darkMode: boolean;
    primaryColor: string;
    secondaryColor: string;

    // Welcome Screen
    welcomeScreen: {
      backgroundImage?: string; // URL or base64
      overlayOpacity: number; // 0-1
      title: string;
      subtitle: string;
      customMessage?: string;
      autoStartDelay: number; // in seconds
      showLogo: boolean;
      logoUrl?: string;
    };

    // Layout
    layout: {
      categoriesPosition: "left" | "top" | "right";
      showSearchBar: boolean;
      showCartButton: boolean;
      productGridColumns: number;
      headerBanner?: {
        enabled: boolean;
        text: string;
        backgroundColor?: string;
        textColor?: string;
        icon?: string;
      };
    };

    // Animations
    animations: {
      enabled: boolean;
      duration: "fast" | "normal" | "slow";
    };
  };

  // Features
  features: {
    enableHapticFeedback: boolean;
    enableSoundEffects: boolean;
    enableOfflineMode: boolean;
    enablePWA: boolean;
    enableFullscreen: boolean;
    fullscreenShortcut: string; // e.g., 'F11', 'Ctrl+Shift+F'
  };

  // Business Rules
  business: {
    currency: string;
    taxRate: number;
    minimumOrderValue: number;
    maximumOrderItems: number;
    allowGuestCheckout: boolean;
    requirePhoneNumber: boolean;
    requireCustomerName: boolean;
  };

  // Payment Options
  payment: {
    enableCreditCard: boolean;
    enableDebitCard: boolean;
    enablePix: boolean;
    enableCash: boolean;
    enableVoucher: boolean;
  };

  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    offlineFallback: boolean;
  };
}

// Default configuration
export const defaultKioskConfig: KioskConfig = {
  terminal: {
    id: (import.meta.env["VITE_TERMINAL_ID"] as string) || "kiosk-001",
    name: (import.meta.env["VITE_TERMINAL_NAME"] as string) || "Kiosk Terminal 1",
    location: (import.meta.env["VITE_TERMINAL_LOCATION"] as string) || "Main Entrance",
    validateSession: true,
    sessionTimeout: 5, // 5 minutes
  },

  ui: {
    darkMode: false, // Controlled by admin, not user
    primaryColor: "#ef4444", // red-500
    secondaryColor: "#3b82f6", // blue-500

    welcomeScreen: {
      // backgroundImage: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1920&h=1080&fit=crop', // Restaurant interior
      backgroundImage:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&h=1080&fit=crop", // Modern restaurant
      // backgroundImage: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=1920&h=1080&fit=crop', // Food display
      // backgroundImage: undefined, // Set to custom image URL or leave undefined for gradient
      overlayOpacity: 0.5,
      title: "Chefia Gourmet",
      subtitle: "Sabor e Qualidade",
      customMessage: "Faça seu pedido de forma rápida e prática",
      autoStartDelay: 60, // 60 seconds
      showLogo: true,
      logoUrl: undefined,
    },

    layout: {
      categoriesPosition: "left", // As requested
      showSearchBar: true,
      showCartButton: true,
      productGridColumns: 3,
      headerBanner: {
        enabled: true,
        text: "🔥 Ofertas do Dia - Até 30% OFF",
        backgroundColor: "#ef4444", // red-500
        textColor: "#ffffff",
        icon: "🎉"
        // Outras opções de exemplo:
        // text: "📍 Retirada grátis no balcão",
        // backgroundColor: "#10b981", // green-500
        // text: "⏰ Horário especial até 22h",
        // backgroundColor: "#3b82f6", // blue-500
        // text: "🍕 Promoção Pizza em Dobro às Terças",
        // backgroundColor: "#f59e0b", // amber-500
      }
    },

    animations: {
      enabled: true,
      duration: "normal",
    },
  },

  features: {
    enableHapticFeedback: true,
    enableSoundEffects: false,
    enableOfflineMode: true,
    enablePWA: true,
    enableFullscreen: true,
    fullscreenShortcut: "F11",
  },

  business: {
    currency: "BRL",
    taxRate: 0.1, // 10%
    minimumOrderValue: 10.0,
    maximumOrderItems: 50,
    allowGuestCheckout: true,
    requirePhoneNumber: false,
    requireCustomerName: true,
  },

  payment: {
    enableCreditCard: true,
    enableDebitCard: true,
    enablePix: true,
    enableCash: true,
    enableVoucher: false,
  },

  api: {
    baseUrl: (import.meta.env["VITE_API_URL"] as string) || "http://localhost:8001/api/v1",
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    offlineFallback: true,
  },
};

// Load configuration from terminal config or localStorage or use defaults
export const loadKioskConfig = (): KioskConfig => {
  try {
    // First try to load from terminal configuration
    const terminalConfig = localStorage.getItem("kiosk-terminal-config");
    if (terminalConfig) {
      const parsed = JSON.parse(terminalConfig);
      // Map terminal config to KioskConfig format
      const config: KioskConfig = {
        terminal: {
          id: parsed.terminalId?.toString() || defaultKioskConfig.terminal.id,
          name: parsed.terminalName || defaultKioskConfig.terminal.name,
          location: parsed.location || defaultKioskConfig.terminal.location,
          validateSession: defaultKioskConfig.terminal.validateSession,
          sessionTimeout: defaultKioskConfig.terminal.sessionTimeout
        },
        ui: {
          ...defaultKioskConfig.ui,
          ...parsed.ui,
          welcomeScreen: {
            ...defaultKioskConfig.ui.welcomeScreen,
            ...parsed.ui?.welcomeScreen
          },
          layout: {
            ...defaultKioskConfig.ui.layout,
            ...parsed.ui?.layout
          }
        },
        features: {
          ...defaultKioskConfig.features,
          ...parsed.features
        },
        business: {
          ...defaultKioskConfig.business,
          ...parsed.business
        },
        payment: {
          ...defaultKioskConfig.payment,
          ...parsed.payment
        },
        api: {
          ...defaultKioskConfig.api,
          ...parsed.api
        }
      };
      return config;
    }
    
    // Fallback to old localStorage config
    const saved = localStorage.getItem("kiosk-config");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all properties exist
      return { ...defaultKioskConfig, ...parsed };
    }
  } catch {
    // Invalid config, use defaults
  }
  return defaultKioskConfig;
};

// Save configuration to localStorage
export const saveKioskConfig = (config: Partial<KioskConfig>): void => {
  const current = loadKioskConfig();
  const updated = { ...current, ...config };
  localStorage.setItem("kiosk-config", JSON.stringify(updated));
};

// Get terminal-specific session key
export const getTerminalSessionKey = (terminalId: string): string => {
  return `kiosk-session-${terminalId}`;
};

// Validate terminal session
export const validateTerminalSession = (terminalId: string): boolean => {
  const sessionKey = getTerminalSessionKey(terminalId);
  const session = sessionStorage.getItem(sessionKey);

  if (!session) return false;

  try {
    const parsed = JSON.parse(session);
    const now = Date.now();
    const expires = parsed.expires || 0;

    if (now > expires) {
      sessionStorage.removeItem(sessionKey);
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

// Create terminal session
export const createTerminalSession = (
  terminalId: string,
  duration: number
): void => {
  const sessionKey = getTerminalSessionKey(terminalId);
  const session = {
    terminalId,
    createdAt: Date.now(),
    expires: Date.now() + duration * 60 * 1000, // Convert minutes to ms
  };
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
};

// Current configuration instance
export const kioskConfig = loadKioskConfig();
