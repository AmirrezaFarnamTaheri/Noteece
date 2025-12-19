export interface DashboardStats {
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
