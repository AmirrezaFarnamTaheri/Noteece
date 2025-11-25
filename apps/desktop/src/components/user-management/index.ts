/**
 * User Management Components
 * 
 * This module provides components for managing users, roles, and permissions
 * in a collaborative space.
 */

export * from './types';
export { UserTable } from './UserTable';
export { InviteUserModal } from './InviteUserModal';
export { EditUserModal } from './EditUserModal';

// Re-export the main component as default
export { default } from './UserManagementRefactored';

