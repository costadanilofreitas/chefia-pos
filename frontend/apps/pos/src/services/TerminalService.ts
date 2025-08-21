/**
 * Terminal Service
 * Manages terminal sessions and configurations
 */

interface TerminalConfig {
  id: string;
  name: string;
  enabled: boolean;
  maxOperators?: number;
}

interface TerminalSession {
  terminalId: string;
  operatorId: string | null;
  operatorName: string | null;
  loginTime: Date | null;
  token: string | null;
}

class TerminalService {
  private static STORAGE_PREFIX = 'pos_terminal_';
  private static CONFIG_CACHE: Map<string, TerminalConfig> = new Map();

  /**
   * Get session key for a specific terminal
   */
  private static getSessionKey(terminalId: string): string {
    return `${this.STORAGE_PREFIX}session_${terminalId}`;
  }

  /**
   * Check if terminal is configured
   */
  static async isTerminalConfigured(terminalId: string): Promise<boolean> {
    try {
      // Check cache first
      if (this.CONFIG_CACHE.has(terminalId)) {
        return this.CONFIG_CACHE.get(terminalId)?.enabled || false;
      }

      // Try to fetch configuration from backend
      const response = await fetch(`/config/pos/${terminalId}.json`);
      if (response.ok) {
        const config = await response.json();
        this.CONFIG_CACHE.set(terminalId, config);
        return config.enabled !== false;
      }
      
      // For development, allow terminals 1-5 by default
      if (process.env.NODE_ENV === 'development') {
        const terminalNum = parseInt(terminalId);
        return !isNaN(terminalNum) && terminalNum >= 1 && terminalNum <= 5;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking terminal configuration:', error);
      // In development, be permissive
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      return false;
    }
  }

  /**
   * Get session for a specific terminal
   */
  static getSession(terminalId: string): TerminalSession | null {
    const key = this.getSessionKey(terminalId);
    const sessionData = localStorage.getItem(key);
    
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        // Convert string date back to Date object
        if (session.loginTime) {
          session.loginTime = new Date(session.loginTime);
        }
        return session;
      } catch (error) {
        console.error('Error parsing terminal session:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Save session for a specific terminal
   */
  static saveSession(terminalId: string, session: Partial<TerminalSession>): void {
    const key = this.getSessionKey(terminalId);
    const fullSession: TerminalSession = {
      terminalId,
      operatorId: session.operatorId || null,
      operatorName: session.operatorName || null,
      loginTime: session.loginTime || new Date(),
      token: session.token || null
    };
    
    localStorage.setItem(key, JSON.stringify(fullSession));
  }

  /**
   * Clear session for a specific terminal
   */
  static clearSession(terminalId: string): void {
    const key = this.getSessionKey(terminalId);
    localStorage.removeItem(key);
  }

  /**
   * Get all active terminal sessions
   */
  static getAllSessions(): Map<string, TerminalSession> {
    const sessions = new Map<string, TerminalSession>();
    
    // Iterate through localStorage to find all terminal sessions
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX + 'session_')) {
        const terminalId = key.replace(this.STORAGE_PREFIX + 'session_', '');
        const session = this.getSession(terminalId);
        if (session) {
          sessions.set(terminalId, session);
        }
      }
    }
    
    return sessions;
  }

  /**
   * Check if another terminal has an active session for the same operator
   */
  static isOperatorLoggedInElsewhere(operatorId: string, currentTerminalId: string): string | null {
    const sessions = this.getAllSessions();
    
    for (const [terminalId, session] of sessions.entries()) {
      if (terminalId !== currentTerminalId && session.operatorId === operatorId) {
        return terminalId;
      }
    }
    
    return null;
  }

  /**
   * Get terminal configuration
   */
  static async getTerminalConfig(terminalId: string): Promise<TerminalConfig | null> {
    // Check cache first
    if (this.CONFIG_CACHE.has(terminalId)) {
      return this.CONFIG_CACHE.get(terminalId) || null;
    }

    try {
      const response = await fetch(`/config/pos/${terminalId}.json`);
      if (response.ok) {
        const config = await response.json();
        this.CONFIG_CACHE.set(terminalId, config);
        return config;
      }
    } catch (error) {
      console.error('Error loading terminal config:', error);
    }

    // Return default config for development
    if (process.env.NODE_ENV === 'development') {
      return {
        id: terminalId,
        name: `Terminal ${terminalId}`,
        enabled: true,
        maxOperators: 1
      };
    }

    return null;
  }
}

export default TerminalService;
export type { TerminalConfig, TerminalSession };