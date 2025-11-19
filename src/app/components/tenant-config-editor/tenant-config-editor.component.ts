import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TenantConfigurationService } from '../../core/services/tenant-configuration.service';
import { FeatureTemplateService } from '../../core/services/feature-template.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  TenantConfiguration,
  ModuleConfiguration,
  BusinessType,
  AccessLevel,
  TenantLimits,
  CustomFeature,
} from '../../core/models/tenant-configuration.model';
import { FeatureTemplate } from '../../core/models/feature-template.model';

@Component({
  selector: 'app-tenant-config-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tenant-config-editor.component.html',
  styleUrls: ['./tenant-config-editor.component.scss']
})
export class TenantConfigEditorComponent implements OnInit {
  tenantId: string | null = null;
  config: TenantConfiguration | null = null;
  templates: FeatureTemplate[] = [];

  isLoading = false;
  isSaving = false;

  selectedTab: 'modules' | 'limits' | 'pricing' | 'settings' | 'custom' = 'modules';

  // Feature groups for organized display
  featureGroups = [
    {
      name: 'Core Features',
      features: ['invoicing', 'estimates', 'customers', 'reports'] as (keyof ModuleConfiguration)[]
    },
    {
      name: 'Jewellery Features',
      features: ['jewelleryInventory', 'customOrders', 'oldGoldPurchase', 'goldRateSync', 'hallmarkTracking', 'schemeManagement', 'repairTracking'] as (keyof ModuleConfiguration)[]
    },
    {
      name: 'Restaurant Features',
      features: ['menuManagement', 'kotSystem', 'tableManagement', 'onlineOrdering', 'tableReservations', 'deliveryManagement', 'recipeCostManagement', 'kitchenDisplay'] as (keyof ModuleConfiguration)[]
    },
    {
      name: 'Medical Features',
      features: ['medicineInventory', 'prescriptionManagement', 'batchTracking', 'expiryManagement', 'purchaseOrders', 'scheduleHCompliance', 'drugInteractionWarnings', 'insuranceClaims'] as (keyof ModuleConfiguration)[]
    },
    {
      name: 'Retail Features',
      features: ['retailPOS', 'barcodeScanning', 'loyaltyProgram', 'promotions', 'customerCredit', 'multiPayment', 'weighingScale'] as (keyof ModuleConfiguration)[]
    },
    {
      name: 'Manufacturing Features',
      features: ['manufacturing', 'inventory', 'bom', 'productionPlanning', 'shopFloor', 'qualityControl'] as (keyof ModuleConfiguration)[]
    },
    {
      name: 'Advanced Features',
      features: ['multiLocation', 'mobileApp', 'whatsappIntegration', 'emailAutomation', 'smsNotifications', 'apiAccess', 'customFields', 'advancedReports', 'dataExport', 'backupRestore', 'automatedBackup'] as (keyof ModuleConfiguration)[]
    }
  ];

  // Custom feature form
  newCustomFeature = {
    featureName: '',
    enabled: true,
    notes: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tenantConfigService: TenantConfigurationService,
    private templateService: FeatureTemplateService,
    private authService: AuthService,
    private notification: NotificationService
  ) {}

  async ngOnInit() {
    // Check if user is super admin
    const user = this.authService.user$.getValue();
    if (!user?.isSuperAdmin) {
      this.notification.error('Access denied. Super Admin only.');
      this.router.navigate(['/dashboard']);
      return;
    }

    this.tenantId = this.route.snapshot.paramMap.get('id');
    if (!this.tenantId) {
      this.notification.error('Tenant ID is required');
      this.router.navigate(['/super-admin/dashboard']);
      return;
    }

    await this.loadConfig();
    await this.loadTemplates();
  }

  async loadConfig() {
    if (!this.tenantId) return;

    try {
      this.isLoading = true;
      this.config = await this.tenantConfigService.getById(this.tenantId);

      if (!this.config) {
        this.notification.error('Tenant configuration not found');
        this.router.navigate(['/super-admin/dashboard']);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      this.notification.error('Failed to load tenant configuration');
    } finally {
      this.isLoading = false;
    }
  }

  async loadTemplates() {
    try {
      this.templates = await this.templateService.getAll();
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  async applyTemplate(templateId: string) {
    if (!this.config || !this.tenantId) return;

    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    if (!confirm(`Apply template "${template.templateName}"? This will override current module settings.`)) {
      return;
    }

    try {
      this.isSaving = true;

      // Update modules, limits, and pricing from template
      await this.tenantConfigService.update(this.tenantId, {
        accessLevel: template.accessLevel,
        modules: { ...this.config.modules, ...template.modules },
        limits: template.limits,
        pricing: {
          ...this.config.pricing,
          ...template.pricing,
          renewalDate: this.config.pricing.renewalDate,
          nextBillingDate: this.config.pricing.nextBillingDate,
        }
      });

      this.notification.success('Template applied successfully');
      await this.loadConfig();
    } catch (error) {
      console.error('Error applying template:', error);
      this.notification.error('Failed to apply template');
    } finally {
      this.isSaving = false;
    }
  }

  async toggleFeature(feature: keyof ModuleConfiguration) {
    if (!this.config || !this.tenantId) return;

    const currentValue = this.config.modules[feature];

    try {
      if (currentValue) {
        await this.tenantConfigService.disableFeature(this.tenantId, feature);
      } else {
        await this.tenantConfigService.enableFeature(this.tenantId, feature);
      }

      // Update local config
      this.config.modules[feature] = !currentValue;
      this.notification.success(`Feature ${currentValue ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('Error toggling feature:', error);
      this.notification.error('Failed to toggle feature');
    }
  }

  async saveConfig() {
    if (!this.config || !this.tenantId) return;

    try {
      this.isSaving = true;
      await this.tenantConfigService.update(this.tenantId, this.config);
      this.notification.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      this.notification.error('Failed to save configuration');
    } finally {
      this.isSaving = false;
    }
  }

  async addCustomFeature() {
    if (!this.config || !this.tenantId) return;
    if (!this.newCustomFeature.featureName.trim()) {
      this.notification.error('Feature name is required');
      return;
    }

    try {
      await this.tenantConfigService.addCustomFeature(this.tenantId, {
        featureName: this.newCustomFeature.featureName,
        enabled: this.newCustomFeature.enabled,
        notes: this.newCustomFeature.notes
      });

      this.notification.success('Custom feature added');
      this.newCustomFeature = { featureName: '', enabled: true, notes: '' };
      await this.loadConfig();
    } catch (error) {
      console.error('Error adding custom feature:', error);
      this.notification.error('Failed to add custom feature');
    }
  }

  async removeCustomFeature(featureName: string) {
    if (!this.config || !this.tenantId) return;

    if (!confirm(`Remove custom feature "${featureName}"?`)) return;

    try {
      await this.tenantConfigService.removeCustomFeature(this.tenantId, featureName);
      this.notification.success('Custom feature removed');
      await this.loadConfig();
    } catch (error) {
      console.error('Error removing custom feature:', error);
      this.notification.error('Failed to remove custom feature');
    }
  }

  async suspendTenant() {
    if (!this.config || !this.tenantId) return;

    const reason = prompt('Enter reason for suspension:');
    if (!reason) return;

    if (!confirm('Suspend this tenant?')) return;

    try {
      await this.tenantConfigService.suspend(this.tenantId, reason);
      this.notification.success('Tenant suspended');
      await this.loadConfig();
    } catch (error) {
      console.error('Error suspending tenant:', error);
      this.notification.error('Failed to suspend tenant');
    }
  }

  async resumeTenant() {
    if (!this.config || !this.tenantId) return;

    if (!confirm('Resume this tenant?')) return;

    try {
      await this.tenantConfigService.resume(this.tenantId);
      this.notification.success('Tenant resumed');
      await this.loadConfig();
    } catch (error) {
      console.error('Error resuming tenant:', error);
      this.notification.error('Failed to resume tenant');
    }
  }

  async upgradePlan() {
    if (!this.config || !this.tenantId) return;

    const levels: AccessLevel[] = ['free', 'small', 'advanced', 'enterprise'];
    const currentIndex = levels.indexOf(this.config.accessLevel);
    const nextLevel = levels[currentIndex + 1];

    if (!nextLevel) {
      this.notification.info('Already on highest plan');
      return;
    }

    if (!confirm(`Upgrade to ${nextLevel} plan?`)) return;

    try {
      await this.tenantConfigService.upgradePlan(this.tenantId, nextLevel);
      this.notification.success(`Upgraded to ${nextLevel}`);
      await this.loadConfig();
    } catch (error) {
      console.error('Error upgrading plan:', error);
      this.notification.error('Failed to upgrade plan');
    }
  }

  changeTab(tab: typeof this.selectedTab) {
    this.selectedTab = tab;
  }

  getFeatureLabel(feature: string): string {
    // Convert camelCase to Title Case
    return feature
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
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
