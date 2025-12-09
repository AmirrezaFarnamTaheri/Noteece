export interface Mode {
  id: string;
  name: string;
  category: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'inbox' | 'next' | 'in_progress' | 'waiting' | 'done' | 'cancelled';
  priority?: number; // 1-4
  due_at?: number;
  description?: string;
}
