import { Injectable } from '@angular/core';
import { Firestore, collection, doc, addDoc, getDocs, query, where, orderBy, limit, Timestamp } from '@angular/fire/firestore';
import { AuditLog, AuditLogFilter, AuditLogSummary, AuditAction, AuditModule, createAuditLog } from '../models/audit-log.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private collectionName = 'auditLogs';

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  /**
   * Create an audit log entry
   */
  async log(params: {
    action: AuditAction;
    module: AuditModule;
    description: string;
    tenantId?: string;
    tenantName?: string;
    targetUserId?: string;
    targetUserName?: string;
    resourceType?: string;
    resourceId?: string;
    oldValue?: any;
    newValue?: any;
    changes?: { field: string; oldValue: any; newValue: any; }[];
    metadata?: Record<string, any>;
    tags?: string[];
    success?: boolean;
    errorMessage?: string;
  }): Promise<string> {
    const user = this.authService.user$.getValue();

    if (!user) {
      console.warn('Audit log attempted without authenticated user');
      // Still log it but with anonymous user
      const logEntry = createAuditLog({
        userId: 'system',
        userName: 'System',
        userRole: 'system',
        isSuperAdmin: false,
        ...params,
      });

      if (params.success === false) {
        logEntry.success = false;
        logEntry.errorMessage = params.errorMessage;
      }

      const colRef = collection(this.firestore, this.collectionName);
      const docRef = await addDoc(colRef, logEntry);
      return docRef.id;
    }

    const logEntry = createAuditLog({
      userId: user.uid,
      userName: user.name || user.email || 'Unknown',
      userEmail: user.email,
      userRole: user.isSuperAdmin ? 'Super Admin' : 'User',
      isSuperAdmin: user.isSuperAdmin || false,
      ...params,
    });

    if (params.success === false) {
      logEntry.success = false;
      logEntry.errorMessage = params.errorMessage;
    }

    const colRef = collection(this.firestore, this.collectionName);
    const docRef = await addDoc(colRef, logEntry);

    return docRef.id;
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filter?: AuditLogFilter): Promise<AuditLog[]> {
    const colRef = collection(this.firestore, this.collectionName);
    let q = query(colRef, orderBy('timestamp', 'desc'));

    // Apply filters
    if (filter) {
      if (filter.startDate) {
        q = query(q, where('timestamp', '>=', filter.startDate));
      }
      if (filter.endDate) {
        q = query(q, where('timestamp', '<=', filter.endDate));
      }
      if (filter.userId) {
        q = query(q, where('userId', '==', filter.userId));
      }
      if (filter.tenantId) {
        q = query(q, where('tenantId', '==', filter.tenantId));
      }
      if (filter.actions && filter.actions.length > 0) {
        q = query(q, where('action', 'in', filter.actions));
      }
      if (filter.modules && filter.modules.length > 0) {
        q = query(q, where('module', 'in', filter.modules));
      }
      if (filter.isSuperAdmin !== undefined) {
        q = query(q, where('isSuperAdmin', '==', filter.isSuperAdmin));
      }
      if (filter.success !== undefined) {
        q = query(q, where('success', '==', filter.success));
      }
      if (filter.requiresReview !== undefined) {
        q = query(q, where('requiresReview', '==', filter.requiresReview));
      }
      if (filter.limit) {
        q = query(q, limit(filter.limit));
      }
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog));
  }

  /**
   * Get logs for a specific tenant
   */
  async getTenantLogs(tenantId: string, limitCount: number = 100): Promise<AuditLog[]> {
    return this.getLogs({
      tenantId,
      limit: limitCount,
    });
  }

  /**
   * Get logs for a specific user
   */
  async getUserLogs(userId: string, limitCount: number = 100): Promise<AuditLog[]> {
    return this.getLogs({
      userId,
      limit: limitCount,
    });
  }

  /**
   * Get recent logs
   */
  async getRecentLogs(limitCount: number = 50): Promise<AuditLog[]> {
    return this.getLogs({ limit: limitCount });
  }

  /**
   * Get failed actions
   */
  async getFailedActions(limitCount: number = 50): Promise<AuditLog[]> {
    return this.getLogs({
      success: false,
      limit: limitCount,
    });
  }

  /**
   * Get logs requiring review
   */
  async getLogsRequiringReview(): Promise<AuditLog[]> {
    return this.getLogs({
      requiresReview: true,
      limit: 100,
    });
  }

  /**
   * Get audit log summary
   */
  async getSummary(filter?: AuditLogFilter): Promise<AuditLogSummary> {
    const logs = await this.getLogs(filter);

    // Count by action
    const actionCounts = new Map<AuditAction, number>();
    logs.forEach(log => {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    });

    // Count by module
    const moduleCounts = new Map<AuditModule, number>();
    logs.forEach(log => {
      moduleCounts.set(log.module, (moduleCounts.get(log.module) || 0) + 1);
    });

    // Count by severity
    const severityCounts = new Map<string, number>();
    logs.forEach(log => {
      severityCounts.set(log.severity, (severityCounts.get(log.severity) || 0) + 1);
    });

    // Count by user
    const userCounts = new Map<string, { userName: string; count: number }>();
    logs.forEach(log => {
      const existing = userCounts.get(log.userId);
      if (existing) {
        existing.count++;
      } else {
        userCounts.set(log.userId, { userName: log.userName, count: 1 });
      }
    });

    // Count by tenant
    const tenantCounts = new Map<string, { tenantName: string; count: number }>();
    logs.forEach(log => {
      if (log.tenantId && log.tenantName) {
        const existing = tenantCounts.get(log.tenantId);
        if (existing) {
          existing.count++;
        } else {
          tenantCounts.set(log.tenantId, { tenantName: log.tenantName, count: 1 });
        }
      }
    });

    // Failed actions
    const failedActions = logs.filter(log => !log.success).length;

    // Requiring review
    const requiresReview = logs.filter(log => log.requiresReview).length;

    return {
      totalLogs: logs.length,
      byAction: Array.from(actionCounts.entries()).map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count),
      byModule: Array.from(moduleCounts.entries()).map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count),
      bySeverity: Array.from(severityCounts.entries()).map(([severity, count]) => ({
        severity: severity as any,
        count
      })).sort((a, b) => b.count - a.count),
      byUser: Array.from(userCounts.entries()).map(([userId, data]) => ({
        userId,
        userName: data.userName,
        count: data.count
      })).sort((a, b) => b.count - a.count),
      byTenant: Array.from(tenantCounts.entries()).map(([tenantId, data]) => ({
        tenantId,
        tenantName: data.tenantName,
        count: data.count
      })).sort((a, b) => b.count - a.count),
      failedActions,
      requiresReview,
    };
  }

  /**
   * Mark log as reviewed
   */
  async markAsReviewed(logId: string, notes?: string): Promise<void> {
    const user = this.authService.user$.getValue();
    if (!user) throw new Error('User not authenticated');

    const docRef = doc(this.firestore, this.collectionName, logId);
    await updateDoc(docRef, {
      requiresReview: false,
      reviewedBy: user.uid,
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes,
    });
  }

  /**
   * Search logs
   */
  async searchLogs(searchTerm: string, limitCount: number = 50): Promise<AuditLog[]> {
    // Get all recent logs and filter in memory
    // For production, consider using Algolia or similar for better search
    const logs = await this.getLogs({ limit: 1000 });

    const lowerSearchTerm = searchTerm.toLowerCase();

    return logs.filter(log =>
      log.description.toLowerCase().includes(lowerSearchTerm) ||
      log.userName.toLowerCase().includes(lowerSearchTerm) ||
      log.tenantName?.toLowerCase().includes(lowerSearchTerm) ||
      log.action.toLowerCase().includes(lowerSearchTerm)
    ).slice(0, limitCount);
  }

  /**
   * Delete old logs based on retention policy
   */
  async deleteOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    const logs = await this.getLogs({
      endDate: cutoffISO,
    });

    // Delete in batches
    for (const log of logs) {
      if (log.id) {
        const docRef = doc(this.firestore, this.collectionName, log.id);
        await deleteDoc(docRef);
      }
    }

    return logs.length;
  }
}

// Add missing import
import { deleteDoc, updateDoc } from '@angular/fire/firestore';
