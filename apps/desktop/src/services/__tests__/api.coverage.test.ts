import { invoke } from '@tauri-apps/api/tauri';
import * as api from '../api';

// Mock Tauri invoke
const mockInvoke = invoke as jest.Mock;

describe('API Service', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('getAnalyticsData calls correct command', async () => {
    await api.getAnalyticsData();
    expect(mockInvoke).toHaveBeenCalledWith('get_analytics_data_cmd', {});
  });

  it('getFormTemplatesForSpace calls correct command', async () => {
    await api.getFormTemplatesForSpace('s1');
    expect(mockInvoke).toHaveBeenCalledWith('get_form_templates_for_space_cmd', { spaceId: 's1' });
  });

  it('createFormTemplate calls correct command', async () => {
    await api.createFormTemplate('s1', 'Template', []);
    expect(mockInvoke).toHaveBeenCalledWith('create_form_template_cmd', {
      spaceId: 's1',
      name: 'Template',
      fields: [],
    });
  });

  it('updateFormTemplate calls correct command', async () => {
    await api.updateFormTemplate('t1', 'Template', []);
    expect(mockInvoke).toHaveBeenCalledWith('update_form_template_cmd', { id: 't1', name: 'Template', fields: [] });
  });

  it('deleteFormTemplate calls correct command', async () => {
    await api.deleteFormTemplate('t1');
    expect(mockInvoke).toHaveBeenCalledWith('delete_form_template_cmd', { id: 't1' });
  });

  it('getProjectRisks calls correct command', async () => {
    await api.getProjectRisks('p1');
    expect(mockInvoke).toHaveBeenCalledWith('get_project_risks_cmd', { projectId: 'p1' });
  });

  it('createProjectRisk calls correct command', async () => {
    await api.createProjectRisk('p1', 'Desc', 'High', 'Low');
    expect(mockInvoke).toHaveBeenCalledWith('create_project_risk_cmd', {
      projectId: 'p1',
      description: 'Desc',
      likelihood: 'High',
      impact: 'Low',
    });
  });

  it('getProjectMilestones calls correct command', async () => {
    await api.getProjectMilestones('p1');
    expect(mockInvoke).toHaveBeenCalledWith('get_project_milestones_cmd', { projectId: 'p1' });
  });

  it('getAllTasksInSpace calls correct command', async () => {
    await api.getAllTasksInSpace('s1');
    expect(mockInvoke).toHaveBeenCalledWith('get_all_tasks_in_space_cmd', { spaceId: 's1' });
  });

  it('getAllNotesInSpace calls correct command', async () => {
    await api.getAllNotesInSpace('s1');
    expect(mockInvoke).toHaveBeenCalledWith('get_all_notes_in_space_cmd', { spaceId: 's1' });
  });

  it('getAllProjectsInSpace calls correct command', async () => {
    await api.getAllProjectsInSpace('s1');
    expect(mockInvoke).toHaveBeenCalledWith('get_projects_in_space_cmd', { spaceId: 's1' });
  });

  it('getOrCreateDailyNote calls correct command', async () => {
    await api.getOrCreateDailyNote('s1');
    expect(mockInvoke).toHaveBeenCalledWith('get_or_create_daily_note_cmd', { spaceId: 's1' });
  });

  it('getAllSpaces calls correct command', async () => {
    await api.getAllSpaces();
    expect(mockInvoke).toHaveBeenCalledWith('get_all_spaces_cmd');
  });

  it('getAllTagsInSpace calls correct command', async () => {
    await api.getAllTagsInSpace('s1');
    expect(mockInvoke).toHaveBeenCalledWith('get_all_tags_in_space_cmd', { spaceId: 's1' });
  });

  it('getUpcomingTasks calls correct command', async () => {
    await api.getUpcomingTasks('s1', 5);
    expect(mockInvoke).toHaveBeenCalledWith('get_upcoming_tasks_cmd', { spaceId: 's1', limit: 5 });
  });

  it('getRecentNotes calls correct command', async () => {
    await api.getRecentNotes('s1', 5);
    expect(mockInvoke).toHaveBeenCalledWith('get_recent_notes_cmd', { spaceId: 's1', limit: 5 });
  });

  it('updateTask calls correct command', async () => {
    // Partial mock of Task to avoid needing full object
    const task = { id: 't1', title: 'Test' } as unknown as import('@noteece/types').Task;
    await api.updateTask(task);
    expect(mockInvoke).toHaveBeenCalledWith('update_task_cmd', { task });
  });

  it('startTimeEntry calls correct command', async () => {
    await api.startTimeEntry('s1', 't1', 'p1', 'n1', 'desc');
    expect(mockInvoke).toHaveBeenCalledWith('start_time_entry_cmd', {
      spaceId: 's1',
      taskId: 't1',
      projectId: 'p1',
      noteId: 'n1',
      description: 'desc',
    });
  });

  it('stopTimeEntry calls correct command', async () => {
    await api.stopTimeEntry('e1');
    expect(mockInvoke).toHaveBeenCalledWith('stop_time_entry_cmd', { entryId: 'e1' });
  });

  it('getTaskTimeEntries calls correct command', async () => {
    await api.getTaskTimeEntries('t1');
    expect(mockInvoke).toHaveBeenCalledWith('get_task_time_entries_cmd', { taskId: 't1' });
  });

  it('getProjectTimeEntries calls correct command', async () => {
    await api.getProjectTimeEntries('p1');
    expect(mockInvoke).toHaveBeenCalledWith('get_project_time_entries_cmd', { projectId: 'p1' });
  });

  it('getRunningEntries calls correct command', async () => {
    await api.getRunningEntries('s1');
    expect(mockInvoke).toHaveBeenCalledWith('get_running_entries_cmd', { spaceId: 's1' });
  });

  it('getRecentTimeEntries calls correct command', async () => {
    await api.getRecentTimeEntries('s1', 10);
    expect(mockInvoke).toHaveBeenCalledWith('get_recent_time_entries_cmd', { spaceId: 's1', limit: 10 });
  });

  it('getTaskTimeStats calls correct command', async () => {
    await api.getTaskTimeStats('t1');
    expect(mockInvoke).toHaveBeenCalledWith('get_task_time_stats_cmd', { taskId: 't1' });
  });

  it('getProjectTimeStats calls correct command', async () => {
    await api.getProjectTimeStats('p1');
    expect(mockInvoke).toHaveBeenCalledWith('get_project_time_stats_cmd', { projectId: 'p1' });
  });

  it('deleteTimeEntry calls correct command', async () => {
    await api.deleteTimeEntry('e1');
    expect(mockInvoke).toHaveBeenCalledWith('delete_time_entry_cmd', { entryId: 'e1' });
  });

  it('createManualTimeEntry calls correct command', async () => {
    await api.createManualTimeEntry('s1', 't1', 'p1', 'n1', 'desc', 1000, 60);
    expect(mockInvoke).toHaveBeenCalledWith('create_manual_time_entry_cmd', {
      spaceId: 's1',
      taskId: 't1',
      projectId: 'p1',
      noteId: 'n1',
      description: 'desc',
      started_at: 1000,
      duration_seconds: 60,
    });
  });
});
