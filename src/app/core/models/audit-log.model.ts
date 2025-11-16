/**
 * Audit Log Model
 * Tracks all system activities for compliance and monitoring
 */

export type AuditAction =
  // Tenant Management
  | 'tenant_created'
  | 'tenant_activated'
  | 'tenant_suspended'
  | 'tenant_resumed'
  | 'tenant_deleted'
  | 'tenant_expired'

  // Configuration Changes
  | 'config_updated'
  | 'feature_enabled'
  | 'feature_disabled'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'limits_increased'
  | 'limits_decreased'

  // User Management
  | 'user_added'
  | 'user_removed'
  | 'user_role_changed'
  | 'permissions_updated'

  // Billing
  | 'payment_received'
  | 'payment_failed'
  | 'invoice_generated'
  | 'discount_applied'
  | 'trial_extended'

  // Support
  | 'support_plan_changed'
  | 'support_ticket_created'
  | 'support_ticket_resolved'

  // Security
  | 'login_success'
  | 'login_failed'
  | 'password_reset'
  | 'api_key_generated'
  | 'api_key_revoked'

  // Data
  | 'data_exported'
  | 'data_imported'
  | 'backup_created'
  | 'backup_restored'

  // Template Management
  | 'template_created'
  | 'template_updated'
  | 'template_deleted'
  | 'template_applied'

  // Other
  | 'settings_updated'
  | 'branding_updated'
  | 'custom_feature_added'
  | 'custom_feature_removed';

export type AuditModule =
  | 'tenant'
  | 'user'
  | 'billing'
  | 'support'
  | 'security'
  | 'configuration'
  | 'template'
  | 'data'
  | 'system';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLog {
  id?: string;

  // Timestamp
  timestamp: string;
  date: string;  // YYYY-MM-DD for easier querying

  // Actor (Who performed the action)
  userId: string;
  userName: string;
  userEmail?: string;
  userRole: string;
  isSuperAdmin: boolean;

  // Action (What was done)
  action: AuditAction;
  module: AuditModule;
  severity: AuditSeverity;
  description: string;

  // Target (What was affected)
  tenantId?: string;
  tenantName?: string;
  targetUserId?: string;
  targetUserName?: string;
  resourceType?: string;  // 'config', 'template', 'user', etc.
  resourceId?: string;

  // Changes (What changed)
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];

  // Full context (for debugging)
  oldValue?: any;
  newValue?: any;

  // Request Context
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;

  // Result
  success: boolean;
  errorMessage?: string;

  // Additional metadata
  metadata?: Record<string, any>;

  // Tags for filtering
  tags?: string[];

  // Compliance
  requiresReview?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface AuditLogFilter {
  // Time range
  startDate?: string;
  endDate?: string;

  // Actor filters
  userId?: string;
  isSuperAdmin?: boolean;

  // Action filters
  actions?: AuditAction[];
  modules?: AuditModule[];
  severity?: AuditSeverity[];

  // Target filters
  tenantId?: string;
  resourceType?: string;

  // Other filters
  success?: boolean;
  requiresReview?: boolean;

  // Search
  searchTerm?: string;

  // Pagination
  limit?: number;
  offset?: number;
}

export interface AuditLogSummary {
  totalLogs: number;

  // By action
  byAction: {
    action: AuditAction;
    count: number;
  }[];

  // By module
  byModule: {
    module: AuditModule;
    count: number;
  }[];

  // By severity
  bySeverity: {
    severity: AuditSeverity;
    count: number;
  }[];

  // By user
  byUser: {
    userId: string;
    userName: string;
    count: number;
  }[];

  // By tenant
  byTenant: {
    tenantId: string;
    tenantName: string;
    count: number;
  }[];

  // Failed actions
  failedActions: number;

  // Requiring review
  requiresReview: number;
}

/**
 * Helper function to create audit log entries
 */
export function createAuditLog(params: {
  userId: string;
  userName: string;
  userEmail?: string;
  userRole: string;
  isSuperAdmin: boolean;
  action: AuditAction;
  module: AuditModule;
  description: string;
  tenantId?: string;
  tenantName?: string;
  oldValue?: any;
  newValue?: any;
  changes?: { field: string; oldValue: any; newValue: any; }[];
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}): Omit<AuditLog, 'id'> {
  const now = new Date();

  // Determine severity based on action
  let severity: AuditSeverity = 'low';
  if (params.action.includes('deleted') || params.action.includes('suspended')) {
    severity = 'high';
  } else if (params.action.includes('failed') || params.action.includes('revoked')) {
    severity = 'medium';
  } else if (params.action.includes('activated') || params.action.includes('upgraded')) {
    severity = 'low';
  }

  return {
    timestamp: now.toISOString(),
    date: now.toISOString().split('T')[0],
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    isSuperAdmin: params.isSuperAdmin,
    action: params.action,
    module: params.module,
    severity,
    description: params.description,
    tenantId: params.tenantId,
    tenantName: params.tenantName,
    oldValue: params.oldValue,
    newValue: params.newValue,
    changes: params.changes,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: params.metadata,
    tags: params.tags,
    success: true,
    requiresReview: severity === 'high' || severity === 'critical',
  };
}

/**
 * Audit log retention policy
 */
export const AUDIT_LOG_RETENTION = {
  free: 30,        // 30 days
  small: 90,       // 90 days
  advanced: 365,   // 1 year
  enterprise: -1,  // Unlimited
};
