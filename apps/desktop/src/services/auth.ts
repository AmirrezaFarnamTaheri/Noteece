/**
 * Frontend Authentication Service
 * Handles authentication with the Tauri backend
 */

import { invoke } from '@tauri-apps/api/tauri';
import { Store } from 'tauri-plugin-store-api';
import { logger } from '@/utils/logger';
import { identityService } from './identity';

// Use Tauri's secure store instead of localStorage
const secureStore = new Store('.auth.dat');

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
    // Initialize from storage if available
    void this.loadSessionFromStorage();
  }

  /**
   * Register a new user
   */
  async register(username: string, email: string, password: string): Promise<User> {
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
      await this.saveSessionToStorage(session);

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
      await this.clearSessionStorage();
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
    } catch {
      this.clearSessionStorage();
      return null;
    }
  }

  /**
   * Get current user ID
   */
  async getCurrentUserId(): Promise<string> {
    return identityService.getUserId();
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
   * Note: This is now async internally, but returns sync for compatibility where possible
   * Use await getStoredToken() if consistent state is needed
   */
  getToken(): string | null {
    return this.session?.token || null;
  }

  /**
   * Get current session object
   */
  getSession(): Session | null {
    return this.session;
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
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
        // Clear both storage and in-memory state for consistency
        this.session = null;
        this.currentUser = null;
        await this.clearSessionStorage();
        return false;
      }
    } catch {
      // Clear both storage and in-memory state for consistency on error
      this.session = null;
      this.currentUser = null;
      await this.clearSessionStorage();
      return false;
    }
  }

  // Private helper methods

  private async loadSessionFromStorage(): Promise<void> {
    try {
      const token = await secureStore.get<string>(SESSION_TOKEN_KEY);
      const sessionData = await secureStore.get<Session>(SESSION_DATA_KEY);

      if (token && sessionData) {
        this.session = sessionData;
      }
    } catch (error) {
      logger.error('Failed to load session from storage:', error as Error);
      await this.clearSessionStorage();
    }
  }

  private async saveSessionToStorage(session: Session): Promise<void> {
    try {
      await secureStore.set(SESSION_TOKEN_KEY, session.token);
      await secureStore.set(SESSION_DATA_KEY, session);
      await secureStore.save();
    } catch (error) {
      logger.error('Failed to save session to storage:', error as Error);
    }
  }

  private async clearSessionStorage(): Promise<void> {
    try {
      await secureStore.delete(SESSION_TOKEN_KEY);
      await secureStore.delete(SESSION_DATA_KEY);
      await secureStore.save();
    } catch (error) {
      logger.error('Failed to clear session storage:', error as Error);
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
