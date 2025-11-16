import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TenantConfigurationService } from '../../core/services/tenant-configuration.service';
import { TenantConfiguration, BusinessType, AccessLevel } from '../../core/models/tenant-configuration.model';

interface UsageAlert {
  type: 'critical' | 'warning' | 'info';
  tenantId: string;
  tenantName: string;
  message: string;
  resourceType: string;
  usagePercent: number;
}

interface ResourceUsage {
  name: string;
  key: keyof TenantConfiguration['usage'];
  limitKey: keyof TenantConfiguration['limits'];
  total: number;
  limit: number;
  percent: number;
  status: 'good' | 'moderate' | 'warning' | 'critical';
}

interface TenantUsageRow {
  config: TenantConfiguration;
  tenantName: string;
  businessType: BusinessType;
  accessLevel: AccessLevel;
  resources: {
    users: { current: number; limit: number; percent: number; status: string };
    products: { current: number; limit: number; percent: number; status: string };
    invoices: { current: number; limit: number; percent: number; status: string };
    branches: { current: number; limit: number; percent: number; status: string };
    storage: { current: number; limit: number; percent: number; status: string };
    apiCalls: { current: number; limit: number; percent: number; status: string };
  };
  overallPercent: number;
  overallStatus: string;
}

interface OverviewStats {
  totalTenants: number;
  tenantsNearLimit: number; // >80%
  tenantsOverLimit: number; // >100%
  averageUsagePercent: number;
  totalResources: {
    users: ResourceUsage;
    products: ResourceUsage;
    invoices: ResourceUsage;
    branches: ResourceUsage;
    storage: ResourceUsage;
    apiCalls: ResourceUsage;
  };
}

@Component({
  selector: 'app-usage-monitoring',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usage-monitoring.component.html',
  styleUrls: ['./usage-monitoring.component.scss']
})
export class UsageMonitoringComponent implements OnInit {
  isLoading = false;

  // All tenant configurations
  allConfigs: TenantConfiguration[] = [];

  // Overview statistics
  stats: OverviewStats | null = null;

  // Per-tenant usage rows
  tenantUsageRows: TenantUsageRow[] = [];
  filteredRows: TenantUsageRow[] = [];

  // Alerts
  alerts: UsageAlert[] = [];

  // Filters
  filterBusinessType: BusinessType | 'all' = 'all';
  filterAccessLevel: AccessLevel | 'all' = 'all';
  filterAlertStatus: 'all' | 'critical' | 'warning' | 'good' = 'all';
  searchTerm = '';

  // Sorting
  sortColumn: string = 'overallPercent';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(private tenantConfigService: TenantConfigurationService) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.isLoading = true;

      // Load all tenant configurations
      this.allConfigs = await this.tenantConfigService.getAll();

      // Calculate statistics and prepare rows
      this.calculateStatistics();
      this.prepareTenantUsageRows();
      this.generateAlerts();
      this.applyFilters();

    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  calculateStatistics() {
    const activeConfigs = this.allConfigs.filter(c => c.status === 'active');

    // Initialize totals
    const totals = {
      users: { total: 0, limit: 0 },
      products: { total: 0, limit: 0 },
      invoices: { total: 0, limit: 0 },
      branches: { total: 0, limit: 0 },
      storage: { total: 0, limit: 0 },
      apiCalls: { total: 0, limit: 0 }
    };

    let totalUsagePercent = 0;
    let tenantsNearLimit = 0;
    let tenantsOverLimit = 0;

    // Aggregate usage across all tenants
    activeConfigs.forEach(config => {
      const usage = config.usage || {};
      const limits = config.limits;

      // Accumulate totals
      totals.users.total += usage.currentUsers || 0;
      totals.users.limit += limits.maxUsers === -1 ? 0 : limits.maxUsers;

      totals.products.total += usage.currentProducts || 0;
      totals.products.limit += limits.maxProducts === -1 ? 0 : limits.maxProducts;

      totals.invoices.total += usage.invoicesThisMonth || 0;
      totals.invoices.limit += limits.maxInvoicesPerMonth === -1 ? 0 : limits.maxInvoicesPerMonth;

      totals.branches.total += usage.currentBranches || 0;
      totals.branches.limit += limits.maxBranches === -1 ? 0 : limits.maxBranches;

      totals.storage.total += usage.storageUsedMB || 0;
      totals.storage.limit += limits.maxStorageMB === -1 ? 0 : limits.maxStorageMB;

      totals.apiCalls.total += usage.apiCallsThisMonth || 0;
      totals.apiCalls.limit += limits.maxApiCallsPerMonth === -1 ? 0 : limits.maxApiCallsPerMonth;

      // Calculate tenant's overall usage percentage
      const tenantPercent = this.calculateOverallUsagePercent(config);
      totalUsagePercent += tenantPercent;

      if (tenantPercent > 100) {
        tenantsOverLimit++;
      } else if (tenantPercent > 80) {
        tenantsNearLimit++;
      }
    });

    // Create resource usage objects
    const createResourceUsage = (
      name: string,
      key: keyof TenantConfiguration['usage'],
      limitKey: keyof TenantConfiguration['limits'],
      total: number,
      limit: number
    ): ResourceUsage => {
      const percent = limit > 0 ? Math.round((total / limit) * 100) : 0;
      let status: 'good' | 'moderate' | 'warning' | 'critical' = 'good';

      if (percent >= 100) status = 'critical';
      else if (percent >= 80) status = 'warning';
      else if (percent >= 60) status = 'moderate';

      return { name, key, limitKey, total, limit, percent, status };
    };

    this.stats = {
      totalTenants: activeConfigs.length,
      tenantsNearLimit,
      tenantsOverLimit,
      averageUsagePercent: activeConfigs.length > 0 ? Math.round(totalUsagePercent / activeConfigs.length) : 0,
      totalResources: {
        users: createResourceUsage('Users', 'currentUsers', 'maxUsers', totals.users.total, totals.users.limit),
        products: createResourceUsage('Products', 'currentProducts', 'maxProducts', totals.products.total, totals.products.limit),
        invoices: createResourceUsage('Invoices/Month', 'invoicesThisMonth', 'maxInvoicesPerMonth', totals.invoices.total, totals.invoices.limit),
        branches: createResourceUsage('Branches', 'currentBranches', 'maxBranches', totals.branches.total, totals.branches.limit),
        storage: createResourceUsage('Storage (MB)', 'storageUsedMB', 'maxStorageMB', totals.storage.total, totals.storage.limit),
        apiCalls: createResourceUsage('API Calls/Month', 'apiCallsThisMonth', 'maxApiCallsPerMonth', totals.apiCalls.total, totals.apiCalls.limit)
      }
    };
  }

  prepareTenantUsageRows() {
    this.tenantUsageRows = this.allConfigs
      .filter(c => c.status === 'active')
      .map(config => {
        const usage = config.usage || {};
        const limits = config.limits;

        const calculateResource = (current: number, limit: number) => {
          if (limit === -1) {
            return { current, limit: -1, percent: 0, status: 'good' };
          }
          const percent = Math.round((current / limit) * 100);
          let status = 'good';
          if (percent >= 100) status = 'critical';
          else if (percent >= 80) status = 'warning';
          else if (percent >= 60) status = 'moderate';

          return { current, limit, percent, status };
        };

        const resources = {
          users: calculateResource(usage.currentUsers || 0, limits.maxUsers),
          products: calculateResource(usage.currentProducts || 0, limits.maxProducts),
          invoices: calculateResource(usage.invoicesThisMonth || 0, limits.maxInvoicesPerMonth),
          branches: calculateResource(usage.currentBranches || 0, limits.maxBranches),
          storage: calculateResource(usage.storageUsedMB || 0, limits.maxStorageMB),
          apiCalls: calculateResource(usage.apiCallsThisMonth || 0, limits.maxApiCallsPerMonth)
        };

        // Calculate overall usage percentage
        const overallPercent = this.calculateOverallUsagePercent(config);
        let overallStatus = 'good';
        if (overallPercent >= 100) overallStatus = 'critical';
        else if (overallPercent >= 80) overallStatus = 'warning';
        else if (overallPercent >= 60) overallStatus = 'moderate';

        return {
          config,
          tenantName: config.tenantName || config.tenantId,
          businessType: config.businessType,
          accessLevel: config.accessLevel,
          resources,
          overallPercent,
          overallStatus
        };
      });
  }

  calculateOverallUsagePercent(config: TenantConfiguration): number {
    const usage = config.usage || {};
    const limits = config.limits;

    const percentages: number[] = [];

    // Calculate percentage for each resource (skip unlimited -1)
    if (limits.maxUsers > 0) {
      percentages.push((usage.currentUsers || 0) / limits.maxUsers * 100);
    }
    if (limits.maxProducts > 0) {
      percentages.push((usage.currentProducts || 0) / limits.maxProducts * 100);
    }
    if (limits.maxInvoicesPerMonth > 0) {
      percentages.push((usage.invoicesThisMonth || 0) / limits.maxInvoicesPerMonth * 100);
    }
    if (limits.maxBranches > 0) {
      percentages.push((usage.currentBranches || 0) / limits.maxBranches * 100);
    }
    if (limits.maxStorageMB > 0) {
      percentages.push((usage.storageUsedMB || 0) / limits.maxStorageMB * 100);
    }
    if (limits.maxApiCallsPerMonth > 0) {
      percentages.push((usage.apiCallsThisMonth || 0) / limits.maxApiCallsPerMonth * 100);
    }

    // Return average of all resource percentages
    return percentages.length > 0
      ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
      : 0;
  }

  generateAlerts() {
    this.alerts = [];

    this.allConfigs
      .filter(c => c.status === 'active')
      .forEach(config => {
        const usage = config.usage || {};
        const limits = config.limits;
        const tenantName = config.tenantName || config.tenantId;

        // Check each resource
        const checkResource = (
          resourceName: string,
          current: number,
          limit: number,
          resourceType: string
        ) => {
          if (limit === -1) return; // Skip unlimited

          const percent = Math.round((current / limit) * 100);

          if (percent >= 100) {
            this.alerts.push({
              type: 'critical',
              tenantId: config.tenantId,
              tenantName,
              message: `${resourceName} limit exceeded: ${current}/${limit} (${percent}%)`,
              resourceType,
              usagePercent: percent
            });
          } else if (percent >= 90) {
            this.alerts.push({
              type: 'warning',
              tenantId: config.tenantId,
              tenantName,
              message: `${resourceName} near limit: ${current}/${limit} (${percent}%)`,
              resourceType,
              usagePercent: percent
            });
          } else if (percent >= 75) {
            this.alerts.push({
              type: 'info',
              tenantId: config.tenantId,
              tenantName,
              message: `${resourceName} approaching limit: ${current}/${limit} (${percent}%)`,
              resourceType,
              usagePercent: percent
            });
          }
        };

        checkResource('Users', usage.currentUsers || 0, limits.maxUsers, 'users');
        checkResource('Products', usage.currentProducts || 0, limits.maxProducts, 'products');
        checkResource('Invoices', usage.invoicesThisMonth || 0, limits.maxInvoicesPerMonth, 'invoices');
        checkResource('Branches', usage.currentBranches || 0, limits.maxBranches, 'branches');
        checkResource('Storage', usage.storageUsedMB || 0, limits.maxStorageMB, 'storage');
        checkResource('API Calls', usage.apiCallsThisMonth || 0, limits.maxApiCallsPerMonth, 'apiCalls');
      });

    // Sort alerts by severity and percentage
    this.alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.type] !== severityOrder[b.type]) {
        return severityOrder[a.type] - severityOrder[b.type];
      }
      return b.usagePercent - a.usagePercent;
    });
  }

  applyFilters() {
    let filtered = [...this.tenantUsageRows];

    // Filter by business type
    if (this.filterBusinessType !== 'all') {
      filtered = filtered.filter(row => row.businessType === this.filterBusinessType);
    }

    // Filter by access level
    if (this.filterAccessLevel !== 'all') {
      filtered = filtered.filter(row => row.accessLevel === this.filterAccessLevel);
    }

    // Filter by alert status
    if (this.filterAlertStatus !== 'all') {
      filtered = filtered.filter(row => row.overallStatus === this.filterAlertStatus);
    }

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        row.tenantName.toLowerCase().includes(term) ||
        row.config.tenantId.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    this.filteredRows = this.sortRows(filtered);
  }

  sortRows(rows: TenantUsageRow[]): TenantUsageRow[] {
    return rows.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortColumn) {
        case 'tenantName':
          aValue = a.tenantName;
          bValue = b.tenantName;
          break;
        case 'businessType':
          aValue = a.businessType;
          bValue = b.businessType;
          break;
        case 'accessLevel':
          aValue = a.accessLevel;
          bValue = b.accessLevel;
          break;
        case 'overallPercent':
          aValue = a.overallPercent;
          bValue = b.overallPercent;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }

  async increaseLimits(row: TenantUsageRow, resourceType: string) {
    const currentLimit = (row.resources as any)[resourceType].limit;

    if (currentLimit === -1) {
      alert('This resource is already unlimited.');
      return;
    }

    const newLimitStr = prompt(
      `Current limit for ${resourceType}: ${currentLimit}\nEnter new limit (or -1 for unlimited):`,
      String(currentLimit * 2)
    );

    if (!newLimitStr) return;

    const newLimit = parseInt(newLimitStr, 10);
    if (isNaN(newLimit)) {
      alert('Invalid number');
      return;
    }

    try {
      const limitKey = this.getResourceLimitKey(resourceType);
      await this.tenantConfigService.update(row.config.id!, {
        limits: {
          ...row.config.limits,
          [limitKey]: newLimit
        }
      });

      alert('Limit updated successfully');
      await this.loadData();
    } catch (error) {
      console.error('Error updating limit:', error);
      alert('Failed to update limit');
    }
  }

  getResourceLimitKey(resourceType: string): string {
    const mapping: Record<string, string> = {
      users: 'maxUsers',
      products: 'maxProducts',
      invoices: 'maxInvoicesPerMonth',
      branches: 'maxBranches',
      storage: 'maxStorageMB',
      apiCalls: 'maxApiCallsPerMonth'
    };
    return mapping[resourceType] || '';
  }

  getResourceStatusClass(status: string): string {
    return `status-${status}`;
  }

  getAlertClass(type: string): string {
    return `alert-${type}`;
  }

  formatNumber(num: number): string {
    if (num === -1) return 'Unlimited';
    return num.toLocaleString('en-IN');
  }

  async refresh() {
    await this.loadData();
  }
}
