export interface Mode {
  id: string;
  name: string;
  category: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string;
  due_date?: number;
  description?: string;
}
