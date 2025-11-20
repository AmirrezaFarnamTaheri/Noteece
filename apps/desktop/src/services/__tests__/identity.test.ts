import { identityService } from '../identity';
import { invoke } from '@tauri-apps/api/tauri';

// Mock Tauri invoke
const mockInvoke = invoke as jest.Mock;

describe('IdentityService', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    // Reset private instance variable by creating a new instance or by reloading the module if possible,
    // but since it's a singleton exported instance, we might need to access the private field via casting
    // or just rely on `getUserId` logic.
    // However, the singleton `identityService` retains state across tests.
    // We need to reset the private `userId` field.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (identityService as any).userId = null;
  });

  it('fetches user ID from backend when not cached', async () => {
    mockInvoke.mockResolvedValue('test-user-id');
    const userId = await identityService.getUserId();
    expect(userId).toBe('test-user-id');
    expect(mockInvoke).toHaveBeenCalledWith('get_or_create_user_id_cmd');
  });

  it('returns cached user ID on subsequent calls', async () => {
    mockInvoke.mockResolvedValue('test-user-id');
    await identityService.getUserId(); // Cache it

    mockInvoke.mockReset(); // Reset mock to ensure it's not called again

    const userId = await identityService.getUserId();
    expect(userId).toBe('test-user-id');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('handles errors by returning a temp ID', async () => {
    mockInvoke.mockRejectedValue(new Error('Failed to fetch'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const userId = await identityService.getUserId();
    expect(userId).toMatch(/^temp_user_\d+$/);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
