import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuditLogService } from '../../core/services/audit-log.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  AuditLog,
  AuditLogFilter,
  AuditLogSummary,
  AuditAction,
  AuditModule,
  AuditSeverity,
} from '../../core/models/audit-log.model';

@Component({
  selector: 'app-audit-log-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './audit-log-viewer.component.html',
  styleUrls: ['./audit-log-viewer.component.scss']
})
export class AuditLogViewerComponent implements OnInit {
  logs: AuditLog[] = [];
  summary: AuditLogSummary | null = null;

  isLoading = false;
  isExporting = false;

  // Filters
  filter: AuditLogFilter = {
    limit: 50,
    offset: 0,
  };

  // Filter UI state
  filterPanel = {
    startDate: '',
    endDate: '',
    userId: '',
    tenantId: '',
    selectedActions: [] as AuditAction[],
    selectedModules: [] as AuditModule[],
    selectedSeverity: [] as AuditSeverity[],
    isSuperAdmin: undefined as boolean | undefined,
    success: undefined as boolean | undefined,
    requiresReview: undefined as boolean | undefined,
    searchTerm: '',
  };

  // Available options for filters
  availableActions: AuditAction[] = [
    'tenant_created', 'tenant_activated', 'tenant_suspended', 'tenant_resumed', 'tenant_deleted', 'tenant_expired',
    'config_updated', 'feature_enabled', 'feature_disabled', 'plan_upgraded', 'plan_downgraded',
    'limits_increased', 'limits_decreased',
    'user_added', 'user_removed', 'user_role_changed', 'permissions_updated',
    'payment_received', 'payment_failed', 'invoice_generated', 'discount_applied', 'trial_extended',
    'support_plan_changed', 'support_ticket_created', 'support_ticket_resolved',
    'login_success', 'login_failed', 'password_reset', 'api_key_generated', 'api_key_revoked',
    'data_exported', 'data_imported', 'backup_created', 'backup_restored',
    'template_created', 'template_updated', 'template_deleted', 'template_applied',
    'settings_updated', 'branding_updated', 'custom_feature_added', 'custom_feature_removed',
  ];

  availableModules: AuditModule[] = [
    'tenant', 'user', 'billing', 'support', 'security', 'configuration', 'template', 'data', 'system'
  ];

  availableSeverity: AuditSeverity[] = ['low', 'medium', 'high', 'critical'];

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalLogs = 0;
  pageSizeOptions = [25, 50, 100, 200];

  // Sort
  sortColumn: string = 'timestamp';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Expanded rows (for detail view)
  expandedRows = new Set<string>();

  // Filter panel visibility
  showFilters = true;

  constructor(
    private auditLogService: AuditLogService,
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Check if user is super admin
    const user = this.authService.user$.getValue();
    if (!user?.isSuperAdmin) {
      this.notification.error('Access denied. Super Admin only.');
      this.router.navigate(['/dashboard']);
      return;
    }

    // Set default date range (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.filterPanel.startDate = weekAgo.toISOString().split('T')[0];
    this.filterPanel.endDate = now.toISOString().split('T')[0];

    await this.loadLogs();
    await this.loadSummary();
  }

  async loadLogs() {
    try {
      this.isLoading = true;

      // Build filter from UI state
      this.buildFilter();

      // Load logs
      this.logs = await this.auditLogService.getLogs(this.filter);
      this.totalLogs = this.logs.length;

      // If we got a full page, there might be more
      if (this.logs.length === this.filter.limit) {
        this.totalLogs = this.logs.length; // Approximate
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      this.notification.error('Failed to load audit logs');
    } finally {
      this.isLoading = false;
    }
  }

  async loadSummary() {
    try {
      // Build filter for summary (without pagination)
      const summaryFilter: AuditLogFilter = {
        startDate: this.filterPanel.startDate ? new Date(this.filterPanel.startDate).toISOString() : undefined,
        endDate: this.filterPanel.endDate ? new Date(this.filterPanel.endDate + 'T23:59:59').toISOString() : undefined,
        actions: this.filterPanel.selectedActions.length > 0 ? this.filterPanel.selectedActions : undefined,
        modules: this.filterPanel.selectedModules.length > 0 ? this.filterPanel.selectedModules : undefined,
        severity: this.filterPanel.selectedSeverity.length > 0 ? this.filterPanel.selectedSeverity : undefined,
        isSuperAdmin: this.filterPanel.isSuperAdmin,
        success: this.filterPanel.success,
        requiresReview: this.filterPanel.requiresReview,
      };

      this.summary = await this.auditLogService.getSummary(summaryFilter);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  }

  buildFilter() {
    this.filter = {
      startDate: this.filterPanel.startDate ? new Date(this.filterPanel.startDate).toISOString() : undefined,
      endDate: this.filterPanel.endDate ? new Date(this.filterPanel.endDate + 'T23:59:59').toISOString() : undefined,
      userId: this.filterPanel.userId || undefined,
      tenantId: this.filterPanel.tenantId || undefined,
      actions: this.filterPanel.selectedActions.length > 0 ? this.filterPanel.selectedActions : undefined,
      modules: this.filterPanel.selectedModules.length > 0 ? this.filterPanel.selectedModules : undefined,
      severity: this.filterPanel.selectedSeverity.length > 0 ? this.filterPanel.selectedSeverity : undefined,
      isSuperAdmin: this.filterPanel.isSuperAdmin,
      success: this.filterPanel.success,
      requiresReview: this.filterPanel.requiresReview,
      limit: this.pageSize,
      offset: (this.currentPage - 1) * this.pageSize,
    };
  }

  async applyFilters() {
    this.currentPage = 1; // Reset to first page
    await this.loadLogs();
    await this.loadSummary();
  }

  async clearFilters() {
    this.filterPanel = {
      startDate: '',
      endDate: '',
      userId: '',
      tenantId: '',
      selectedActions: [],
      selectedModules: [],
      selectedSeverity: [],
      isSuperAdmin: undefined,
      success: undefined,
      requiresReview: undefined,
      searchTerm: '',
    };

    // Set default date range
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.filterPanel.startDate = weekAgo.toISOString().split('T')[0];
    this.filterPanel.endDate = now.toISOString().split('T')[0];

    await this.applyFilters();
  }

  async search() {
    if (!this.filterPanel.searchTerm.trim()) {
      this.notification.warning('Please enter a search term');
      return;
    }

    try {
      this.isLoading = true;
      this.logs = await this.auditLogService.searchLogs(this.filterPanel.searchTerm, this.pageSize);
      this.totalLogs = this.logs.length;
    } catch (error) {
      console.error('Error searching logs:', error);
      this.notification.error('Failed to search logs');
    } finally {
      this.isLoading = false;
    }
  }

  toggleAction(action: AuditAction) {
    const index = this.filterPanel.selectedActions.indexOf(action);
    if (index > -1) {
      this.filterPanel.selectedActions.splice(index, 1);
    } else {
      this.filterPanel.selectedActions.push(action);
    }
  }

  toggleModule(module: AuditModule) {
    const index = this.filterPanel.selectedModules.indexOf(module);
    if (index > -1) {
      this.filterPanel.selectedModules.splice(index, 1);
    } else {
      this.filterPanel.selectedModules.push(module);
    }
  }

  toggleSeverity(severity: AuditSeverity) {
    const index = this.filterPanel.selectedSeverity.indexOf(severity);
    if (index > -1) {
      this.filterPanel.selectedSeverity.splice(index, 1);
    } else {
      this.filterPanel.selectedSeverity.push(severity);
    }
  }

  async changePage(page: number) {
    this.currentPage = page;
    await this.loadLogs();
  }

  async changePageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    await this.loadLogs();
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }

    // Sort logs in memory
    this.logs.sort((a, b) => {
      const aVal = (a as any)[column];
      const bVal = (b as any)[column];

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  toggleRow(logId: string) {
    if (this.expandedRows.has(logId)) {
      this.expandedRows.delete(logId);
    } else {
      this.expandedRows.add(logId);
    }
  }

  isRowExpanded(logId: string): boolean {
    return this.expandedRows.has(logId);
  }

  async markAsReviewed(log: AuditLog) {
    if (!log.id) return;

    const notes = prompt('Enter review notes (optional):');
    if (notes === null) return; // User cancelled

    try {
      await this.auditLogService.markAsReviewed(log.id, notes || undefined);
      this.notification.success('Log marked as reviewed');
      await this.loadLogs();
      await this.loadSummary();
    } catch (error) {
      console.error('Error marking log as reviewed:', error);
      this.notification.error('Failed to mark log as reviewed');
    }
  }

  async exportToCSV() {
    try {
      this.isExporting = true;

      // Get all logs matching filter (without pagination)
      const exportFilter = { ...this.filter };
      delete exportFilter.limit;
      delete exportFilter.offset;

      const allLogs = await this.auditLogService.getLogs(exportFilter);

      // Build CSV content
      const headers = [
        'Timestamp',
        'Date',
        'User',
        'User Email',
        'Is Super Admin',
        'Action',
        'Module',
        'Severity',
        'Description',
        'Tenant',
        'Success',
        'Error Message',
        'IP Address',
        'Requires Review',
      ];

      const rows = allLogs.map(log => [
        log.timestamp,
        log.date,
        log.userName,
        log.userEmail || '',
        log.isSuperAdmin ? 'Yes' : 'No',
        log.action,
        log.module,
        log.severity,
        log.description,
        log.tenantName || '',
        log.success ? 'Yes' : 'No',
        log.errorMessage || '',
        log.ipAddress || '',
        log.requiresReview ? 'Yes' : 'No',
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${new Date().toISOString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.notification.success(`Exported ${allLogs.length} logs to CSV`);
    } catch (error) {
      console.error('Error exporting logs:', error);
      this.notification.error('Failed to export logs');
    } finally {
      this.isExporting = false;
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalLogs / this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    const half = Math.floor(maxPages / 2);

    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + maxPages - 1);

    if (end - start < maxPages - 1) {
      start = Math.max(1, end - maxPages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  getSeverityClass(severity: string): string {
    const classes: Record<string, string> = {
      'low': 'severity-low',
      'medium': 'severity-medium',
      'high': 'severity-high',
      'critical': 'severity-critical',
    };
    return classes[severity] || 'severity-low';
  }

  formatDateTime(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getActionLabel(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getModuleLabel(module: string): string {
    return module.charAt(0).toUpperCase() + module.slice(1);
  }
}
