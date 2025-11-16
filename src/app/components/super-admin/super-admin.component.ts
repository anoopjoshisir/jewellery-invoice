import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService } from '../../core/services/tenant.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Tenant } from '../../core/models/tenant.model';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  templateUrl: './super-admin.component.html',
  styleUrls: ['./super-admin.component.scss']
})
export class SuperAdminComponent implements OnInit {
  tenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  isLoading = false;
  selectedTab: 'all' | 'active' | 'trial' | 'suspended' | 'expired' = 'all';
  searchTerm = '';

  // Statistics
  totalTenants = 0;
  activeTenants = 0;
  trialTenants = 0;
  suspendedTenants = 0;
  totalUsers = 0;
  totalRevenue = 0;

  // Plan distribution
  planStats = {
    free: 0,
    basic: 0,
    premium: 0,
    enterprise: 0
  };

  constructor(
    private tenantService: TenantService,
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Check if user is super admin
    const user = this.authService.currentUser;
    if (!user?.isSuperAdmin) {
      this.notification.error('Access denied. Super Admin only.');
      this.router.navigate(['/dashboard']);
      return;
    }

    await this.loadTenants();
  }

  async loadTenants() {
    try {
      this.isLoading = true;
      this.tenants = await this.tenantService.getAllTenants();
      this.calculateStatistics();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading tenants:', error);
      this.notification.error('Failed to load tenants');
    } finally {
      this.isLoading = false;
    }
  }

  calculateStatistics() {
    this.totalTenants = this.tenants.length;
    this.activeTenants = this.tenants.filter(t => t.status === 'active').length;
    this.trialTenants = this.tenants.filter(t => t.status === 'trial').length;
    this.suspendedTenants = this.tenants.filter(t => t.status === 'suspended').length;
    this.totalUsers = this.tenants.reduce((sum, t) => sum + (t.currentUserCount || 0), 0);

    // Calculate plan distribution
    this.planStats = {
      free: this.tenants.filter(t => t.plan === 'free').length,
      basic: this.tenants.filter(t => t.plan === 'basic').length,
      premium: this.tenants.filter(t => t.plan === 'premium').length,
      enterprise: this.tenants.filter(t => t.plan === 'enterprise').length
    };

    // Calculate revenue (dummy calculation based on plans)
    const planPrices: any = { free: 0, basic: 999, premium: 2999, enterprise: 9999 };
    this.totalRevenue = this.tenants.reduce((sum, t) => {
      return sum + (planPrices[t.plan] || 0);
    }, 0);
  }

  applyFilters() {
    let filtered = [...this.tenants];

    // Filter by status tab
    if (this.selectedTab !== 'all') {
      filtered = filtered.filter(t => t.status === this.selectedTab);
    }

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(term) ||
        t.tenantCode.toLowerCase().includes(term) ||
        t.email?.toLowerCase().includes(term)
      );
    }

    this.filteredTenants = filtered;
  }

  onTabChange(tab: typeof this.selectedTab) {
    this.selectedTab = tab;
    this.applyFilters();
  }

  onSearchChange() {
    this.applyFilters();
  }

  async suspendTenant(tenant: Tenant) {
    if (!tenant.id) return;

    const reason = prompt('Enter reason for suspension:');
    if (!reason) return;

    if (!confirm(`Are you sure you want to suspend "${tenant.name}"?`)) {
      return;
    }

    try {
      await this.tenantService.suspend(tenant.id, reason);
      this.notification.success(`${tenant.name} has been suspended`);
      await this.loadTenants();
    } catch (error) {
      console.error('Error suspending tenant:', error);
      this.notification.error('Failed to suspend tenant');
    }
  }

  async activateTenant(tenant: Tenant) {
    if (!tenant.id) return;

    if (!confirm(`Activate "${tenant.name}"?`)) {
      return;
    }

    try {
      await this.tenantService.activate(tenant.id);
      this.notification.success(`${tenant.name} has been activated`);
      await this.loadTenants();
    } catch (error) {
      console.error('Error activating tenant:', error);
      this.notification.error('Failed to activate tenant');
    }
  }

  async upgradePlan(tenant: Tenant) {
    if (!tenant.id) return;

    const plans = ['free', 'basic', 'premium', 'enterprise'];
    const currentIndex = plans.indexOf(tenant.plan);
    const nextPlan = plans[currentIndex + 1];

    if (!nextPlan) {
      this.notification.info('Already on the highest plan');
      return;
    }

    if (!confirm(`Upgrade "${tenant.name}" to ${nextPlan} plan?`)) {
      return;
    }

    try {
      await this.tenantService.upgradePlan(tenant.id, nextPlan as any);
      this.notification.success(`Upgraded to ${nextPlan} plan`);
      await this.loadTenants();
    } catch (error) {
      console.error('Error upgrading plan:', error);
      this.notification.error('Failed to upgrade plan');
    }
  }

  async viewTenantDetails(tenant: Tenant) {
    if (!tenant.id) return;

    try {
      const stats = await this.tenantService.getTenantStats(tenant.id);
      const message = `
Tenant: ${tenant.name}
Code: ${tenant.tenantCode}
Status: ${tenant.status}
Plan: ${tenant.plan}

Users: ${stats.totalUsers}/${stats.maxUsers}
Invoices: ${stats.totalInvoices}/${stats.maxInvoices}
Storage: ${stats.storageUsed}MB/${stats.storageLimit}MB

Days until expiry: ${stats.daysUntilExpiry}
      `.trim();

      alert(message);
    } catch (error) {
      console.error('Error loading tenant stats:', error);
      this.notification.error('Failed to load tenant details');
    }
  }

  getStatusBadgeClass(status: string): string {
    const classes: any = {
      'active': 'status-active',
      'trial': 'status-trial',
      'suspended': 'status-suspended',
      'expired': 'status-expired'
    };
    return classes[status] || '';
  }

  getPlanBadgeClass(plan: string): string {
    const classes: any = {
      'free': 'plan-free',
      'basic': 'plan-basic',
      'premium': 'plan-premium',
      'enterprise': 'plan-enterprise'
    };
    return classes[plan] || '';
  }

  getDaysUntilExpiry(endDate?: string): number {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  }
}
