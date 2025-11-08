/**
 * Frontend Authentication Service
 * Handles authentication with the Tauri backend
 */

import { invoke } from '@tauri-apps/api/core';

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: number;
  updated_at?: number;
  last_login_at?: number;
}

export interface AuthError {
  message: string;
  code: string;
}

const SESSION_TOKEN_KEY = 'noteece_session_token';
const SESSION_DATA_KEY = 'noteece_session_data';

class AuthService {
  private session: Session | null = null;
  private currentUser: User | null = null;

  constructor() {
    // Initialize from local storage if available
    this.loadSessionFromStorage();
  }

  /**
   * Register a new user
   */
  async register(
    username: string,
    email: string,
    password: string
  ): Promise<User> {
    try {
      const user = await invoke<User>('create_user_cmd', {
        username,
        email,
        password,
      });
      this.currentUser = user;
      return user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<Session> {
    try {
      const session = await invoke<Session>('authenticate_user_cmd', {
        username,
        password,
      });

      // Store session
      this.session = session;
      this.saveSessionToStorage(session);

      // Fetch current user info
      const user = await invoke<User>('get_current_user_cmd');
      this.currentUser = user;

      return session;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      if (this.session) {
        await invoke('logout_user_cmd', { token: this.session.token });
      }
      this.session = null;
      this.currentUser = null;
      this.clearSessionStorage();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<string | null> {
    try {
      const token = this.getToken();
      if (!token) {
        return null;
      }

      const userId = await invoke<string>('validate_session_cmd', { token });
      return userId;
    } catch (error) {
      this.clearSessionStorage();
      return null;
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUser?.id || null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.session !== null && this.currentUser !== null;
  }

  /**
   * Get session token
   */
  getToken(): string | null {
    if (this.session) {
      return this.session.token;
    }
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }

  /**
   * Change password
   */
  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      if (!this.currentUser) {
        throw new Error('Not authenticated');
      }

      await invoke('change_password_cmd', {
        user_id: this.currentUser.id,
        old_password: oldPassword,
        new_password: newPassword,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Refresh authentication (verify token is still valid)
   */
  async refreshAuth(): Promise<boolean> {
    try {
      const userId = await this.validateSession();
      if (userId) {
        const user = await invoke<User>('get_user_by_id_cmd', { user_id: userId });
        this.currentUser = user;
        return true;
      } else {
        this.clearSessionStorage();
        return false;
      }
    } catch (error) {
      this.clearSessionStorage();
      return false;
    }
  }

  // Private helper methods

  private loadSessionFromStorage(): void {
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      const sessionData = localStorage.getItem(SESSION_DATA_KEY);

      if (token && sessionData) {
        this.session = JSON.parse(sessionData);
      }
    } catch (error) {
      console.error('Failed to load session from storage:', error);
      this.clearSessionStorage();
    }
  }

  private saveSessionToStorage(session: Session): void {
    try {
      localStorage.setItem(SESSION_TOKEN_KEY, session.token);
      localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session to storage:', error);
    }
  }

  private clearSessionStorage(): void {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_DATA_KEY);
    } catch (error) {
      console.error('Failed to clear session storage:', error);
    }
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    if (typeof error === 'string') {
      return new Error(error);
    }
    return new Error('An unknown error occurred');
  }
}

// Singleton instance
export const authService = new AuthService();

// Export for use in components
export default authService;
