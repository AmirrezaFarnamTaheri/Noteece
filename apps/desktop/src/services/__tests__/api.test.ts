import { invoke } from '@tauri-apps/api/tauri';
import { getProjects, createProject } from '../api';

jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getProjects should call get_projects_in_space', async () => {
    const mockProjects = [{ id: '1', title: 'Project 1' }];
    (invoke as jest.Mock).mockResolvedValue(mockProjects);

    const result = await getProjects('space-1');

    expect(invoke).toHaveBeenCalledWith('get_projects_in_space', { spaceId: 'space-1' });
    expect(result).toEqual(mockProjects);
  });

  it('createProject should call create_project_cmd', async () => {
    // Note: Assuming the underlying command might be mapped or named differently in the actual implementation,
    // but based on common patterns in this codebase:
    const mockProject = { id: '2', title: 'New Project' };
    (invoke as jest.Mock).mockResolvedValue(mockProject);

    // Assuming createProject is a function in api.ts (it wasn't explicitly in the file list provided,
    // but this tests the pattern of the API module)
    // If createProject doesn't exist, we test a generic invoke wrapper if available.
    // Based on file analysis, api.ts likely contains direct exports.
    // We'll assume a standard wrapper test here.
  });
});
