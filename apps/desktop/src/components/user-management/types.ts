/**
 * User Management Types
 */

export interface SpaceUser {
  user_id: string;
  email: string;
  role: string;
  status: 'active' | 'invited' | 'suspended';
  permissions: string[];
  last_active: number | null;
  joined_at: number;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

export interface UserInvitation {
  id: string;
  space_id: string;
  email: string;
  role: string;
  permissions: string[];
  invited_by: string;
  invited_at: number;
  expires_at: number;
  status: string;
  token: string;
}

export const roleColors: Record<string, string> = {
  owner: 'purple',
  admin: 'red',
  editor: 'blue',
  viewer: 'gray',
};

export const statusColors: Record<string, string> = {
  active: 'green',
  invited: 'yellow',
  suspended: 'red',
};

// All available permissions in the system
export const allPermissions = [
  'note.read',
  'note.write',
  'note.delete',
  'task.read',
  'task.write',
  'task.delete',
  'project.read',
  'project.write',
  'project.delete',
  'space.settings',
  'space.users',
  'space.billing',
  'sync.read',
  'sync.write',
  'backup.create',
  'backup.restore',
];
