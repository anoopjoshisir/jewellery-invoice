import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FeatureTemplateService } from '../../core/services/feature-template.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  FeatureTemplate,
  PREDEFINED_TEMPLATES,
} from '../../core/models/feature-template.model';
import {
  BusinessType,
  AccessLevel,
  ModuleConfiguration,
  TenantLimits,
  DEFAULT_LIMITS,
} from '../../core/models/tenant-configuration.model';

@Component({
  selector: 'app-template-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './template-manager.component.html',
  styleUrls: ['./template-manager.component.scss']
})
export class TemplateManagerComponent implements OnInit {
  templates: FeatureTemplate[] = [];
  filteredTemplates: FeatureTemplate[] = [];

  isLoading = false;
  isSaving = false;

  // Filters
  filterBusinessType: BusinessType | 'all' = 'all';
  filterAccessLevel: AccessLevel | 'all' = 'all';
  searchTerm = '';

  // Form mode
  mode: 'list' | 'create' | 'edit' | 'preview' = 'list';
  selectedTemplate: FeatureTemplate | null = null;

  // Template form
  templateForm: Partial<FeatureTemplate> = this.getEmptyForm();

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

  constructor(
    private templateService: FeatureTemplateService,
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

    await this.loadTemplates();
  }

  async loadTemplates() {
    try {
      this.isLoading = true;
      this.templates = await this.templateService.getAll();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading templates:', error);
      this.notification.error('Failed to load templates');
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    let filtered = [...this.templates];

    // Filter by business type
    if (this.filterBusinessType !== 'all') {
      filtered = filtered.filter(t => t.businessType === this.filterBusinessType);
    }

    // Filter by access level
    if (this.filterAccessLevel !== 'all') {
      filtered = filtered.filter(t => t.accessLevel === this.filterAccessLevel);
    }

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.templateName.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term)
      );
    }

    // Sort by display order
    filtered.sort((a, b) => a.displayOrder - b.displayOrder);

    this.filteredTemplates = filtered;
  }

  onFilterChange() {
    this.applyFilters();
  }

  createNew() {
    this.mode = 'create';
    this.templateForm = this.getEmptyForm();
  }

  editTemplate(template: FeatureTemplate) {
    this.mode = 'edit';
    this.selectedTemplate = template;
    this.templateForm = { ...template };
  }

  previewTemplate(template: FeatureTemplate) {
    this.mode = 'preview';
    this.selectedTemplate = template;
  }

  cancelForm() {
    this.mode = 'list';
    this.selectedTemplate = null;
    this.templateForm = this.getEmptyForm();
  }

  async saveTemplate() {
    // Validation
    if (!this.templateForm.templateName?.trim()) {
      this.notification.error('Template name is required');
      return;
    }
    if (!this.templateForm.description?.trim()) {
      this.notification.error('Description is required');
      return;
    }
    if (!this.templateForm.businessType) {
      this.notification.error('Business type is required');
      return;
    }
    if (!this.templateForm.accessLevel) {
      this.notification.error('Access level is required');
      return;
    }

    try {
      this.isSaving = true;

      const user = this.authService.user$.getValue();
      if (!user) throw new Error('User not authenticated');

      const now = new Date().toISOString();

      if (this.mode === 'create') {
        // Create new template
        const newTemplate: Omit<FeatureTemplate, 'id'> = {
          templateName: this.templateForm.templateName!,
          description: this.templateForm.description!,
          businessType: this.templateForm.businessType!,
          accessLevel: this.templateForm.accessLevel!,
          modules: this.templateForm.modules || {},
          limits: this.templateForm.limits || DEFAULT_LIMITS[this.templateForm.accessLevel!],
          pricing: {
            plan: this.templateForm.accessLevel!,
            monthlyFee: this.templateForm.pricing?.monthlyFee || 0,
            perUserFee: this.templateForm.pricing?.perUserFee || 0,
            perTransactionFee: this.templateForm.pricing?.perTransactionFee || 0,
            setupFee: this.templateForm.pricing?.setupFee || 0,
            billingCycle: this.templateForm.pricing?.billingCycle || 'monthly',
            autoRenewal: this.templateForm.pricing?.autoRenewal !== false,
            discountPercent: this.templateForm.pricing?.discountPercent || 0,
            extraUserFee: this.templateForm.pricing?.extraUserFee || 200,
            extraBranchFee: this.templateForm.pricing?.extraBranchFee || 500,
            extraStorageFee: this.templateForm.pricing?.extraStorageFee || 300,
            smsCostPerUnit: this.templateForm.pricing?.smsCostPerUnit || 0.10,
            whatsappCostPerUnit: this.templateForm.pricing?.whatsappCostPerUnit || 0.25,
            emailCostPerUnit: this.templateForm.pricing?.emailCostPerUnit || 0,
          },
          supportPlan: this.templateForm.supportPlan || 'basic',
          displayOrder: this.templateForm.displayOrder || 999,
          isPopular: this.templateForm.isPopular || false,
          isRecommended: this.templateForm.isRecommended || false,
          isDefault: this.templateForm.isDefault || false,
          highlights: this.templateForm.highlights || [],
          limitations: this.templateForm.limitations || [],
          isActive: this.templateForm.isActive !== false,
          isVisible: this.templateForm.isVisible !== false,
          createdAt: now,
          createdBy: user.uid,
          createdByName: user.name || user.email || 'Unknown',
        };

        await this.templateService.create(newTemplate);
        this.notification.success('Template created successfully');
      } else if (this.mode === 'edit' && this.selectedTemplate?.id) {
        // Update existing template
        const updates: Partial<FeatureTemplate> = {
          templateName: this.templateForm.templateName,
          description: this.templateForm.description,
          businessType: this.templateForm.businessType,
          accessLevel: this.templateForm.accessLevel,
          modules: this.templateForm.modules,
          limits: this.templateForm.limits,
          pricing: this.templateForm.pricing,
          supportPlan: this.templateForm.supportPlan,
          displayOrder: this.templateForm.displayOrder,
          isPopular: this.templateForm.isPopular,
          isRecommended: this.templateForm.isRecommended,
          isDefault: this.templateForm.isDefault,
          highlights: this.templateForm.highlights,
          limitations: this.templateForm.limitations,
          isActive: this.templateForm.isActive,
          isVisible: this.templateForm.isVisible,
        };

        await this.templateService.update(this.selectedTemplate.id, updates);
        this.notification.success('Template updated successfully');
      }

      await this.loadTemplates();
      this.cancelForm();
    } catch (error) {
      console.error('Error saving template:', error);
      this.notification.error('Failed to save template');
    } finally {
      this.isSaving = false;
    }
  }

  async deleteTemplate(template: FeatureTemplate) {
    if (!template.id) return;

    if (!confirm(`Delete template "${template.templateName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await this.templateService.delete(template.id);
      this.notification.success('Template deleted successfully');
      await this.loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      this.notification.error('Failed to delete template');
    }
  }

  async cloneTemplate(template: FeatureTemplate) {
    if (!template.id) return;

    const newName = prompt('Enter name for cloned template:', `${template.templateName} (Copy)`);
    if (!newName) return;

    try {
      await this.templateService.clone(template.id, newName);
      this.notification.success('Template cloned successfully');
      await this.loadTemplates();
    } catch (error) {
      console.error('Error cloning template:', error);
      this.notification.error('Failed to clone template');
    }
  }

  async setAsDefault(template: FeatureTemplate) {
    if (!template.id) return;

    if (!confirm(`Set "${template.templateName}" as default for ${template.businessType}?`)) {
      return;
    }

    try {
      await this.templateService.setAsDefault(template.id);
      this.notification.success('Set as default successfully');
      await this.loadTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
      this.notification.error('Failed to set as default');
    }
  }

  async initializeDefaults() {
    if (!confirm('Initialize default templates? This will create 8 predefined templates.')) {
      return;
    }

    try {
      this.isLoading = true;
      await this.templateService.initializeDefaultTemplates();
      this.notification.success('Default templates initialized successfully');
      await this.loadTemplates();
    } catch (error) {
      console.error('Error initializing defaults:', error);
      this.notification.error('Failed to initialize default templates');
    } finally {
      this.isLoading = false;
    }
  }

  toggleFeature(feature: keyof ModuleConfiguration) {
    if (!this.templateForm.modules) {
      this.templateForm.modules = {};
    }
    this.templateForm.modules[feature] = !this.templateForm.modules[feature];
  }

  addHighlight() {
    const highlight = prompt('Enter highlight:');
    if (highlight?.trim()) {
      if (!this.templateForm.highlights) {
        this.templateForm.highlights = [];
      }
      this.templateForm.highlights.push(highlight.trim());
    }
  }

  removeHighlight(index: number) {
    if (this.templateForm.highlights) {
      this.templateForm.highlights.splice(index, 1);
    }
  }

  addLimitation() {
    const limitation = prompt('Enter limitation:');
    if (limitation?.trim()) {
      if (!this.templateForm.limitations) {
        this.templateForm.limitations = [];
      }
      this.templateForm.limitations.push(limitation.trim());
    }
  }

  removeLimitation(index: number) {
    if (this.templateForm.limitations) {
      this.templateForm.limitations.splice(index, 1);
    }
  }

  getEmptyForm(): Partial<FeatureTemplate> {
    return {
      templateName: '',
      description: '',
      businessType: 'jewellery',
      accessLevel: 'small',
      modules: {},
      limits: DEFAULT_LIMITS.small,
      pricing: {
        plan: 'small',
        monthlyFee: 999,
        perUserFee: 200,
        perTransactionFee: 0,
        setupFee: 0,
        billingCycle: 'monthly',
        autoRenewal: true,
        discountPercent: 0,
        extraUserFee: 200,
        extraBranchFee: 500,
        extraStorageFee: 300,
        smsCostPerUnit: 0.10,
        whatsappCostPerUnit: 0.25,
        emailCostPerUnit: 0,
      },
      supportPlan: 'basic',
      displayOrder: 999,
      isPopular: false,
      isRecommended: false,
      isDefault: false,
      highlights: [],
      limitations: [],
      isActive: true,
      isVisible: true,
    };
  }

  getFeatureLabel(feature: string): string {
    return feature
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
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
}
