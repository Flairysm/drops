// Admin role and permission types
export interface AdminPermission {
  resource: 'users' | 'packs' | 'inventory' | 'transactions' | 'settings' | 'system';
  actions: ('read' | 'write' | 'delete' | 'export' | 'import')[];
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  roleId: string;
  role?: AdminRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Predefined roles
export const ADMIN_ROLES: Omit<AdminRole, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    isDefault: false,
    permissions: [
      { resource: 'users', actions: ['read', 'write', 'delete', 'export', 'import'] },
      { resource: 'packs', actions: ['read', 'write', 'delete', 'export', 'import'] },
      { resource: 'inventory', actions: ['read', 'write', 'delete', 'export', 'import'] },
      { resource: 'transactions', actions: ['read', 'write', 'delete', 'export', 'import'] },
      { resource: 'settings', actions: ['read', 'write', 'delete', 'export', 'import'] },
      { resource: 'system', actions: ['read', 'write', 'delete', 'export', 'import'] },
    ]
  },
  {
    name: 'Content Manager',
    description: 'Manage packs, inventory, and content',
    isDefault: false,
    permissions: [
      { resource: 'packs', actions: ['read', 'write', 'delete', 'export'] },
      { resource: 'inventory', actions: ['read', 'write', 'delete', 'export'] },
      { resource: 'users', actions: ['read'] },
      { resource: 'transactions', actions: ['read', 'export'] },
    ]
  },
  {
    name: 'User Manager',
    description: 'Manage users and transactions',
    isDefault: false,
    permissions: [
      { resource: 'users', actions: ['read', 'write', 'delete', 'export'] },
      { resource: 'transactions', actions: ['read', 'write', 'delete', 'export'] },
      { resource: 'packs', actions: ['read'] },
      { resource: 'inventory', actions: ['read'] },
    ]
  },
  {
    name: 'Viewer',
    description: 'Read-only access to all data',
    isDefault: true,
    permissions: [
      { resource: 'users', actions: ['read', 'export'] },
      { resource: 'packs', actions: ['read', 'export'] },
      { resource: 'inventory', actions: ['read', 'export'] },
      { resource: 'transactions', actions: ['read', 'export'] },
      { resource: 'settings', actions: ['read'] },
    ]
  }
];

// Permission checking utilities
export class PermissionChecker {
  static hasPermission(
    userRole: AdminRole,
    resource: AdminPermission['resource'],
    action: AdminPermission['actions'][0]
  ): boolean {
    const permission = userRole.permissions.find(p => p.resource === resource);
    return permission ? permission.actions.includes(action) : false;
  }

  static canRead(userRole: AdminRole, resource: AdminPermission['resource']): boolean {
    return this.hasPermission(userRole, resource, 'read');
  }

  static canWrite(userRole: AdminRole, resource: AdminPermission['resource']): boolean {
    return this.hasPermission(userRole, resource, 'write');
  }

  static canDelete(userRole: AdminRole, resource: AdminPermission['resource']): boolean {
    return this.hasPermission(userRole, resource, 'delete');
  }

  static canExport(userRole: AdminRole, resource: AdminPermission['resource']): boolean {
    return this.hasPermission(userRole, resource, 'export');
  }

  static canImport(userRole: AdminRole, resource: AdminPermission['resource']): boolean {
    return this.hasPermission(userRole, resource, 'import');
  }
}
