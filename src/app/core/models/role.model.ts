/**
 * Permissions available in the system
 */
export enum Permission {
  // Invoice Permissions
  CREATE_INVOICE = 'create_invoice',
  VIEW_INVOICE = 'view_invoice',
  EDIT_INVOICE = 'edit_invoice',
  DELETE_INVOICE = 'delete_invoice',
  PRINT_INVOICE = 'print_invoice',

  // Estimate Permissions
  CREATE_ESTIMATE = 'create_estimate',
  VIEW_ESTIMATE = 'view_estimate',
  EDIT_ESTIMATE = 'edit_estimate',
  DELETE_ESTIMATE = 'delete_estimate',
  CONVERT_ESTIMATE = 'convert_estimate',

  // Customer Permissions
  CREATE_CUSTOMER = 'create_customer',
  VIEW_CUSTOMER = 'view_customer',
  EDIT_CUSTOMER = 'edit_customer',
  DELETE_CUSTOMER = 'delete_customer',

  // Payment Permissions
  CREATE_PAYMENT = 'create_payment',
  VIEW_PAYMENT = 'view_payment',
  EDIT_PAYMENT = 'edit_payment',
  DELETE_PAYMENT = 'delete_payment',

  // Reports Permissions
  VIEW_REPORTS = 'view_reports',
  EXPORT_REPORTS = 'export_reports',

  // Settings Permissions
  MANAGE_COMPANY = 'manage_company',
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',

  // Super Admin Permissions
  SUPER_ADMIN = 'super_admin',
  MANAGE_TENANTS = 'manage_tenants',
  VIEW_ALL_TENANTS = 'view_all_tenants',
  SUSPEND_TENANT = 'suspend_tenant',
}

/**
 * Predefined roles in the system
 */
export interface Role {
  id?: string;
  tenantId: string;  // Role belongs to a specific tenant
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;  // Can't be deleted or modified
  createdAt: string;
  updatedAt?: string;
}

/**
 * User-Tenant-Role mapping
 */
export interface UserTenantRole {
  userId: string;
  tenantId: string;
  roleId: string;
  roleName?: string;
  assignedAt: string;
  assignedBy: string;
}

/**
 * Predefined system roles
 */
export const SystemRoles = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Full system access across all tenants',
    permissions: Object.values(Permission),
    isSystemRole: true
  },
  TENANT_ADMIN: {
    name: 'Tenant Admin',
    description: 'Full access within tenant',
    permissions: [
      Permission.CREATE_INVOICE,
      Permission.VIEW_INVOICE,
      Permission.EDIT_INVOICE,
      Permission.DELETE_INVOICE,
      Permission.PRINT_INVOICE,
      Permission.CREATE_ESTIMATE,
      Permission.VIEW_ESTIMATE,
      Permission.EDIT_ESTIMATE,
      Permission.DELETE_ESTIMATE,
      Permission.CONVERT_ESTIMATE,
      Permission.CREATE_CUSTOMER,
      Permission.VIEW_CUSTOMER,
      Permission.EDIT_CUSTOMER,
      Permission.DELETE_CUSTOMER,
      Permission.CREATE_PAYMENT,
      Permission.VIEW_PAYMENT,
      Permission.EDIT_PAYMENT,
      Permission.DELETE_PAYMENT,
      Permission.VIEW_REPORTS,
      Permission.EXPORT_REPORTS,
      Permission.MANAGE_COMPANY,
      Permission.MANAGE_USERS,
      Permission.MANAGE_ROLES
    ],
    isSystemRole: true
  },
  MANAGER: {
    name: 'Manager',
    description: 'Can manage invoices, estimates, and customers',
    permissions: [
      Permission.CREATE_INVOICE,
      Permission.VIEW_INVOICE,
      Permission.EDIT_INVOICE,
      Permission.PRINT_INVOICE,
      Permission.CREATE_ESTIMATE,
      Permission.VIEW_ESTIMATE,
      Permission.EDIT_ESTIMATE,
      Permission.CONVERT_ESTIMATE,
      Permission.CREATE_CUSTOMER,
      Permission.VIEW_CUSTOMER,
      Permission.EDIT_CUSTOMER,
      Permission.CREATE_PAYMENT,
      Permission.VIEW_PAYMENT,
      Permission.EDIT_PAYMENT,
      Permission.VIEW_REPORTS
    ],
    isSystemRole: true
  },
  ACCOUNTANT: {
    name: 'Accountant',
    description: 'View and manage financial data',
    permissions: [
      Permission.VIEW_INVOICE,
      Permission.PRINT_INVOICE,
      Permission.VIEW_ESTIMATE,
      Permission.VIEW_CUSTOMER,
      Permission.VIEW_PAYMENT,
      Permission.CREATE_PAYMENT,
      Permission.VIEW_REPORTS,
      Permission.EXPORT_REPORTS
    ],
    isSystemRole: true
  },
  SALES_PERSON: {
    name: 'Sales Person',
    description: 'Create and manage estimates and invoices',
    permissions: [
      Permission.CREATE_INVOICE,
      Permission.VIEW_INVOICE,
      Permission.PRINT_INVOICE,
      Permission.CREATE_ESTIMATE,
      Permission.VIEW_ESTIMATE,
      Permission.EDIT_ESTIMATE,
      Permission.VIEW_CUSTOMER,
      Permission.CREATE_CUSTOMER,
      Permission.VIEW_PAYMENT
    ],
    isSystemRole: true
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      Permission.VIEW_INVOICE,
      Permission.VIEW_ESTIMATE,
      Permission.VIEW_CUSTOMER,
      Permission.VIEW_PAYMENT
    ],
    isSystemRole: true
  }
};
