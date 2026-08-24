export interface DashboardStats {
  total_notes: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  total_projects: number;
  active_habits: number;
  streak_days: number;
  health: {
    metrics_count: number;
    latest_metric: string | null;
  };
  music: {
    track_count: number;
    playlist_count: number;
  };
  social: {
    posts_count: number;
    platforms_count: number;
  };
  tasks: {
    pending_count: number;
    completed_count: number;
  };
  quote: Quote | null;
}

export interface Quote {
  text: string;
  author: string;
}
