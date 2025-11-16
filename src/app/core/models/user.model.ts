import { Permission } from './role.model';

/**
 * Enhanced User model with multi-tenant support
 */
export interface User {
  uid: string;
  name?: string;
  email: string;
  displayName?: string;
  photoURL?: string;

  // Multi-Tenant Related
  tenants?: TenantMembership[];  // Tenants user belongs to
  currentTenantId?: string;  // Currently active tenant

  // Legacy support (deprecated)
  companies?: string[];  // @deprecated Use tenants instead
  isAdmin?: boolean;  // @deprecated Use isSuperAdmin instead

  // Global Roles
  isSuperAdmin?: boolean;  // Has access to all tenants
  isSystemUser?: boolean;  // Internal system user

  // Profile
  phone?: string;
  address?: string;
  timezone?: string;
  language?: string;

  // Settings
  preferences?: {
    theme?: 'light' | 'dark';
    emailNotifications?: boolean;
    smsNotifications?: boolean;
  };

  // Audit
  createdAt?: string;
  lastLoginAt?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

/**
 * Tenant membership with role information
 */
export interface TenantMembership {
  tenantId: string;
  tenantName?: string;
  roleId?: string;
  roleName?: string;
  permissions?: Permission[];
  joinedAt: string;
  status: 'active' | 'invited' | 'suspended';
}
