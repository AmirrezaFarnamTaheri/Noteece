export interface Project {
  id: string;
  space_id: string;
  title: string;
  goal_outcome?: string;
  status: string;
  confidence?: number;
  start_at?: number;
  target_end_at?: number;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  due_at?: number;
  status: string;
}

export interface ProjectRisk {
  id: string;
  project_id: string;
  description: string;
  impact: string;
  likelihood: string;
  mitigation: string;
  owner_person_id?: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  when_at: number;
  health: string;
  summary: string;
}
