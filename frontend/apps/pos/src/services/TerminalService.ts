/**
 * Terminal Service
 * Manages terminal sessions and configurations
 */

interface TerminalConfig {
  id?: string;
  terminal_id?: string;
  name?: string;
  terminal_name?: string;
  enabled?: boolean;
  maxOperators?: number;
  printer_configs?: Array<{
    name: string;
    type: string;
    model: string;
    connection_type: string;
    connection_params: Record<string, unknown>;
  }>;
  default_printer?: string;
  allow_discounts?: boolean;
  max_discount_percent?: number;
  allow_price_override?: boolean;
  allow_returns?: boolean;
  default_payment_method?: string;
  tax_included?: boolean;
  currency_symbol?: string;
  decimal_places?: number;
}

interface TerminalSession {
  terminalId: string;
  operatorId: string | null;
  operatorName: string | null;
  loginTime: Date | null;
  token: string | null;
}

class TerminalService {
  private static readonly STORAGE_PREFIX = "pos_terminal_";
  private static readonly CONFIG_CACHE: Map<string, TerminalConfig> = new Map();
  private static AVAILABLE_TERMINALS_CACHE: string[] | null = null;

  /**
   * Get session key for a specific terminal
   */
  private static getSessionKey(terminalId: string): string {
    return `${this.STORAGE_PREFIX}session_${terminalId}`;
  }

  /**
   * Get list of available terminals by importing config modules
   * This is very fast because Vite statically analyzes the glob at build time
   */
  static getAvailableTerminals(): string[] {
    if (this.AVAILABLE_TERMINALS_CACHE) {
      return this.AVAILABLE_TERMINALS_CACHE;
    }

    const possibleTerminals: string[] = [];

    // Import all config files statically
    // Vite will handle this with glob import at build time - very fast!
    const modules = import.meta.glob("../config/pos/*.json", { eager: false });

    for (const path in modules) {
      // Extract terminal ID from path (e.g., "../config/pos/1.json" -> "1")
      const regex = /\/(\d+)\.json$/;
      const match = regex.exec(path);
      if (match) {
        possibleTerminals.push(match[1]);
      }
    }

    // Sort terminals numerically
    possibleTerminals.sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numA - numB;
    });

    // Cache and return results
    // If no terminals found, return empty array - system should block access
    this.AVAILABLE_TERMINALS_CACHE = possibleTerminals;
    return this.AVAILABLE_TERMINALS_CACHE;
  }

  /**
   * Check if terminal is configured - FAST synchronous check
   */
  static isTerminalConfigured(terminalId: string): boolean {
    const availableTerminals = this.getAvailableTerminals();
    return availableTerminals.includes(terminalId);
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
      } catch {
        // Error parsing session
        return null;
      }
    }

    return null;
  }

  /**
   * Save session for a specific terminal
   */
  static saveSession(
    terminalId: string,
    session: Partial<TerminalSession>
  ): void {
    const key = this.getSessionKey(terminalId);
    const fullSession: TerminalSession = {
      terminalId,
      operatorId: session.operatorId || null,
      operatorName: session.operatorName || null,
      loginTime: session.loginTime || new Date(),
      token: session.token || null,
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
      if (key?.startsWith(this.STORAGE_PREFIX + "session_")) {
        const terminalId = key.replace(this.STORAGE_PREFIX + "session_", "");
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
  static isOperatorLoggedInElsewhere(
    operatorId: string,
    currentTerminalId: string
  ): string | null {
    const sessions = this.getAllSessions();

    for (const [terminalId, session] of sessions.entries()) {
      if (
        terminalId !== currentTerminalId &&
        session.operatorId === operatorId
      ) {
        return terminalId;
      }
    }

    return null;
  }

  /**
   * Get terminal configuration
   */
  static async getTerminalConfig(
    terminalId: string
  ): Promise<TerminalConfig | null> {
    // Check cache first
    if (this.CONFIG_CACHE.has(terminalId)) {
      return this.CONFIG_CACHE.get(terminalId) || null;
    }

    try {
      // Dynamic import of the config file
      const configModule = await import(`../config/pos/${terminalId}.json`);
      const config = configModule.default || configModule;
      this.CONFIG_CACHE.set(terminalId, config);
      return config;
    } catch {
      // Error loading config - terminal doesn't exist
      // NO DEFAULT CONFIG - if terminal doesn't exist, it should be blocked
      return null;
    }
  }
}

export default TerminalService;
export type { TerminalConfig, TerminalSession };
