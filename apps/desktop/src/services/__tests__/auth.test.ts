import { authService } from '../auth';
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

    const result = await authService.login('testuser', 'password');

    expect(invoke).toHaveBeenCalledWith('authenticate_user_cmd', {
      username: 'testuser',
      password: 'password',
    });
    expect(result).toEqual(mockResponse);
  });

  it('should create user successfully', async () => {
    const mockUser = { id: '1', username: 'newuser' };
    (invoke as jest.Mock).mockResolvedValue(mockUser);

    const result = await authService.register('newuser', 'new@example.com', 'password');

    expect(invoke).toHaveBeenCalledWith('create_user_cmd', {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password',
    });
    expect(result).toEqual(mockUser);
  });

  it('should logout user', async () => {
    (invoke as jest.Mock).mockResolvedValue();

    await authService.logout();

    expect(invoke).toHaveBeenCalledWith('logout_user_cmd', { token: undefined });
  });
});
