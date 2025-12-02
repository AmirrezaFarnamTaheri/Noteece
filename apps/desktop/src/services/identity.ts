import { invoke } from '@tauri-apps/api/tauri';
import { logger } from '../utils/logger';

/**
 * A service for managing the user's unique identity.
 */
class IdentityService {
  private userId: string | null = null;

  /**
   * Retrieves the unique user ID for this vault.
   * If the ID has not been fetched yet, it will be retrieved from the Rust core
   * and cached for the duration of the session.
   * @returns A promise that resolves to the user ID.
   */
  public async getUserId(): Promise<string> {
    if (this.userId) {
      return this.userId;
    }

    try {
      const userId: string = await invoke('get_or_create_user_id_cmd');
      this.userId = userId;
      return userId;
    } catch (error) {
      logger.error('Failed to get or create user ID:', error as Error);
      // Fallback to a temporary, non-persistent ID in case of an error.
      // This is a safety net and should not be relied upon.
      return `temp_user_${Date.now()}`;
    }
  }
}

export const identityService = new IdentityService();
