import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TenantConfigurationService } from '../../core/services/tenant-configuration.service';
import { AuditLogService } from '../../core/services/audit-log.service';
import { FeatureTemplateService } from '../../core/services/feature-template.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { TenantConfiguration, BusinessType, AccessLevel } from '../../core/models/tenant-configuration.model';
import { AuditLog } from '../../core/models/audit-log.model';

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  expiredTenants: number;

  totalUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;

  byBusinessType: {
    jewellery: number;
    restaurant: number;
    medical: number;
    retail: number;
    manufacturing: number;
    services: number;
  };

  byAccessLevel: {
    free: number;
    small: number;
    advanced: number;
    enterprise: number;
  };

  recentActivity: AuditLog[];
  expiringTenants: TenantConfiguration[];
  overLimitTenants: TenantConfiguration[];
}

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss']
})
export class SuperAdminDashboardComponent implements OnInit {
  tenants: TenantConfiguration[] = [];
  stats: DashboardStats = {
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    suspendedTenants: 0,
    expiredTenants: 0,
    totalUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    byBusinessType: { jewellery: 0, restaurant: 0, medical: 0, retail: 0, manufacturing: 0, services: 0 },
    byAccessLevel: { free: 0, small: 0, advanced: 0, enterprise: 0 },
    recentActivity: [],
    expiringTenants: [],
    overLimitTenants: [],
  };

  isLoading = false;
  selectedView: 'overview' | 'tenants' | 'activity' | 'analytics' = 'overview';

  constructor(
    private tenantConfigService: TenantConfigurationService,
    private auditLogService: AuditLogService,
    private featureTemplateService: FeatureTemplateService,
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

    await this.loadDashboard();
  }

  async loadDashboard() {
    try {
      this.isLoading = true;

      // Load all tenant configurations
      this.tenants = await this.tenantConfigService.getAll();

      // Calculate statistics
      this.calculateStatistics();

      // Load recent activity
      this.stats.recentActivity = await this.auditLogService.getRecentLogs(10);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.notification.error('Failed to load dashboard data');
    } finally {
      this.isLoading = false;
    }
  }

  calculateStatistics() {
    this.stats.totalTenants = this.tenants.length;
    this.stats.activeTenants = this.tenants.filter(t => t.status === 'active').length;
    this.stats.trialTenants = this.tenants.filter(t => t.status === 'trial').length;
    this.stats.suspendedTenants = this.tenants.filter(t => t.status === 'suspended').length;
    this.stats.expiredTenants = this.tenants.filter(t => t.status === 'expired').length;

    // Total users across all tenants
    this.stats.totalUsers = this.tenants.reduce((sum, t) =>
      sum + (t.usage?.currentUsers || 0), 0
    );

    // Revenue calculation
    this.stats.monthlyRevenue = this.tenants
      .filter(t => t.status === 'active')
      .reduce((sum, t) => sum + (t.pricing.monthlyFee || 0), 0);

    this.stats.totalRevenue = this.stats.monthlyRevenue; // Simplified

    // By business type
    this.stats.byBusinessType = {
      jewellery: this.tenants.filter(t => t.businessType === 'jewellery').length,
      restaurant: this.tenants.filter(t => t.businessType === 'restaurant').length,
      medical: this.tenants.filter(t => t.businessType === 'medical').length,
      retail: this.tenants.filter(t => t.businessType === 'retail').length,
      manufacturing: this.tenants.filter(t => t.businessType === 'manufacturing').length,
      services: this.tenants.filter(t => t.businessType === 'services').length,
    };

    // By access level
    this.stats.byAccessLevel = {
      free: this.tenants.filter(t => t.accessLevel === 'free').length,
      small: this.tenants.filter(t => t.accessLevel === 'small').length,
      advanced: this.tenants.filter(t => t.accessLevel === 'advanced').length,
      enterprise: this.tenants.filter(t => t.accessLevel === 'enterprise').length,
    };

    // Find expiring tenants (within 7 days)
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.stats.expiringTenants = this.tenants.filter(t => {
      if (!t.pricing.nextBillingDate) return false;
      const billingDate = new Date(t.pricing.nextBillingDate);
      return billingDate <= sevenDaysLater && billingDate > now;
    });

    // Find tenants over limit (80% usage)
    this.stats.overLimitTenants = this.tenants.filter(t => {
      if (!t.usage) return false;

      const userPercent = (t.usage.currentUsers / t.limits.maxUsers) * 100;
      const productPercent = (t.usage.currentProducts / t.limits.maxProducts) * 100;
      const invoicePercent = (t.usage.currentInvoicesThisMonth / t.limits.maxInvoicesPerMonth) * 100;

      return userPercent >= 80 || productPercent >= 80 || invoicePercent >= 80;
    });
  }

  changeView(view: typeof this.selectedView) {
    this.selectedView = view;
  }

  async navigateToTenantConfig(tenant: TenantConfiguration) {
    this.router.navigate(['/super-admin/tenant-config', tenant.id]);
  }

  async navigateToTemplates() {
    this.router.navigate(['/super-admin/templates']);
  }

  async navigateToAuditLogs() {
    this.router.navigate(['/super-admin/audit-logs']);
  }

  async navigateToUsageMonitoring() {
    this.router.navigate(['/super-admin/usage-monitoring']);
  }

  async quickSuspend(tenant: TenantConfiguration) {
    if (!tenant.id) return;

    const reason = prompt('Enter reason for suspension:');
    if (!reason) return;

    if (!confirm(`Suspend "${tenant.tenantId}"?`)) return;

    try {
      await this.tenantConfigService.suspend(tenant.id, reason);
      this.notification.success('Tenant suspended successfully');
      await this.loadDashboard();
    } catch (error) {
      console.error('Error suspending tenant:', error);
      this.notification.error('Failed to suspend tenant');
    }
  }

  async quickResume(tenant: TenantConfiguration) {
    if (!tenant.id) return;

    if (!confirm(`Resume "${tenant.tenantId}"?`)) return;

    try {
      await this.tenantConfigService.resume(tenant.id);
      this.notification.success('Tenant resumed successfully');
      await this.loadDashboard();
    } catch (error) {
      console.error('Error resuming tenant:', error);
      this.notification.error('Failed to resume tenant');
    }
  }

  async quickUpgrade(tenant: TenantConfiguration) {
    if (!tenant.id) return;

    const levels: AccessLevel[] = ['free', 'small', 'advanced', 'enterprise'];
    const currentIndex = levels.indexOf(tenant.accessLevel);
    const nextLevel = levels[currentIndex + 1];

    if (!nextLevel) {
      this.notification.info('Already on highest plan');
      return;
    }

    if (!confirm(`Upgrade "${tenant.tenantId}" to ${nextLevel}?`)) return;

    try {
      await this.tenantConfigService.upgradePlan(tenant.id, nextLevel);
      this.notification.success(`Upgraded to ${nextLevel} plan`);
      await this.loadDashboard();
    } catch (error) {
      console.error('Error upgrading plan:', error);
      this.notification.error('Failed to upgrade plan');
    }
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'active': 'badge-success',
      'trial': 'badge-info',
      'suspended': 'badge-warning',
      'expired': 'badge-danger',
      'cancelled': 'badge-secondary',
    };
    return classes[status] || 'badge-secondary';
  }

  getAccessLevelBadgeClass(level: string): string {
    const classes: Record<string, string> = {
      'free': 'badge-secondary',
      'small': 'badge-info',
      'advanced': 'badge-primary',
      'enterprise': 'badge-success',
    };
    return classes[level] || 'badge-secondary';
  }

  getBusinessTypeIcon(type: BusinessType): string {
    const icons: Record<BusinessType, string> = {
      'jewellery': '💎',
      'restaurant': '🍽️',
      'medical': '💊',
      'retail': '🏪',
      'manufacturing': '🏭',
      'services': '🔧',
    };
    return icons[type] || '📦';
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getDaysUntil(date?: string): number {
    if (!date) return 0;
    const target = new Date(date);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getUsagePercentage(current: number, max: number): number {
    if (max === -1) return 0; // Unlimited
    if (max === 0) return 100;
    return Math.min((current / max) * 100, 100);
  }

  getUsageClass(percentage: number): string {
    if (percentage >= 90) return 'usage-critical';
    if (percentage >= 80) return 'usage-warning';
    if (percentage >= 60) return 'usage-moderate';
    return 'usage-good';
  }
}
