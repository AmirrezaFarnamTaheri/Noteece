import { invoke } from '@tauri-apps/api/tauri';
import { getAllProjectsInSpace } from '../api';

jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAllProjectsInSpace should call get_all_projects_cmd', async () => {
    const mockProjects = [{ id: '1', title: 'Project 1' }];
    (invoke as jest.Mock).mockResolvedValue(mockProjects);

    const result = await getAllProjectsInSpace('space-1');

    expect(invoke).toHaveBeenCalledWith('get_projects_in_space_cmd', { spaceId: 'space-1' });
    expect(result).toEqual(mockProjects);
  });
});
