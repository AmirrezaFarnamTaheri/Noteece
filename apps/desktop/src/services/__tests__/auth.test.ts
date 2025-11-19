import { AuthService } from '../auth';
import { invoke } from '@tauri-apps/api/tauri';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate user successfully', async () => {
    const mockResponse = { token: 'test-token', user: { id: '1', username: 'test' } };
    (invoke as jest.Mock).mockResolvedValue(mockResponse);

    const result = await AuthService.login('testuser', 'password');

    expect(invoke).toHaveBeenCalledWith('authenticate_user', {
      username: 'testuser',
      password: 'password',
    });
    expect(result).toEqual(mockResponse);
  });

  it('should create user successfully', async () => {
    const mockUser = { id: '1', username: 'newuser' };
    (invoke as jest.Mock).mockResolvedValue(mockUser);

    const result = await AuthService.register('newuser', 'new@example.com', 'password');

    expect(invoke).toHaveBeenCalledWith('create_user', {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password',
    });
    expect(result).toEqual(mockUser);
  });

  it('should logout user', async () => {
    (invoke as jest.Mock).mockResolvedValue(undefined);

    await AuthService.logout('test-token');

    expect(invoke).toHaveBeenCalledWith('logout_user', { token: 'test-token' });
  });
});
