/**
 * Enhanced Tenant Configuration Model
 * Provides granular control over features, limits, and pricing per tenant
 */

export type BusinessType = 'jewellery' | 'restaurant' | 'medical' | 'retail' | 'manufacturing' | 'services';
export type AccessLevel = 'free' | 'small' | 'advanced' | 'enterprise';
export type TenantStatus = 'trial' | 'active' | 'suspended' | 'expired' | 'cancelled';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type SupportPlan = 'basic' | 'priority' | '24x7';

/**
 * Module configuration for all business types
 */
export interface ModuleConfiguration {
  // Core Modules (All Business Types)
  invoicing: boolean;
  estimates: boolean;
  customers: boolean;
  reports: boolean;

  // Jewellery Specific
  jewelleryInventory: boolean;
  customOrders: boolean;
  oldGoldPurchase: boolean;
  goldRateSync: boolean;
  hallmarkTracking: boolean;
  schemeManagement: boolean;
  repairTracking: boolean;

  // Restaurant Specific
  menuManagement: boolean;
  kotSystem: boolean;
  tableManagement: boolean;
  onlineOrdering: boolean;
  tableReservations: boolean;
  deliveryManagement: boolean;
  recipeCostManagement: boolean;
  kitchenDisplay: boolean;

  // Medical Shop Specific
  medicineInventory: boolean;
  prescriptionManagement: boolean;
  batchTracking: boolean;
  expiryManagement: boolean;
  purchaseOrders: boolean;
  scheduleHCompliance: boolean;
  drugInteractionWarnings: boolean;
  insuranceClaims: boolean;

  // Retail Specific
  retailPOS: boolean;
  barcodeScanning: boolean;
  loyaltyProgram: boolean;
  promotions: boolean;
  customerCredit: boolean;
  multiPayment: boolean;
  weighingScale: boolean;

  // Manufacturing (from previous plan)
  manufacturing: boolean;
  inventory: boolean;
  bom: boolean;
  productionPlanning: boolean;
  shopFloor: boolean;
  qualityControl: boolean;

  // Advanced Features (All Types)
  multiLocation: boolean;
  mobileApp: boolean;
  whatsappIntegration: boolean;
  emailAutomation: boolean;
  smsNotifications: boolean;
  apiAccess: boolean;
  customFields: boolean;
  advancedReports: boolean;
  dataExport: boolean;
  backupRestore: boolean;
  automatedBackup: boolean;
}

/**
 * Usage limits per tenant
 */
export interface TenantLimits {
  maxUsers: number;
  maxProducts: number;
  maxMenuItems: number;
  maxMedicines: number;
  maxInvoicesPerMonth: number;
  maxBranches: number;
  maxStorageGB: number;
  maxAPICallsPerDay: number;
  maxSMSPerMonth: number;
  maxWhatsAppPerMonth: number;
  maxEmailsPerMonth: number;
}

/**
 * Current usage tracking
 */
export interface TenantUsage {
  currentUsers: number;
  currentProducts: number;
  currentInvoicesThisMonth: number;
  currentBranches: number;
  currentStorageGB: number;
  currentAPICallsToday: number;
  currentSMSThisMonth: number;
  currentWhatsAppThisMonth: number;
  currentEmailsThisMonth: number;

  // Last reset dates
  lastMonthlyReset: string;
  lastDailyReset: string;
}

/**
 * Pricing configuration
 */
export interface TenantPricing {
  plan: AccessLevel;
  monthlyFee: number;
  perUserFee: number;
  perTransactionFee: number;
  setupFee: number;

  // Renewal
  billingCycle: BillingCycle;
  renewalDate: string;
  nextBillingDate: string;

  // Payment
  autoRenewal: boolean;
  paymentMethod?: string;

  // Discounts
  discountPercent: number;
  discountReason?: string;
  discountValidUntil?: string;

  // Add-on pricing
  extraUserFee: number;
  extraBranchFee: number;
  extraStorageFee: number;  // per 10GB
  smsCostPerUnit: number;
  whatsappCostPerUnit: number;
  emailCostPerUnit: number;
}

/**
 * Custom feature configuration
 */
export interface CustomFeature {
  featureName: string;
  enabled: boolean;
  customConfig?: Record<string, any>;
  enabledBy?: string;
  enabledAt?: string;
  notes?: string;
}

/**
 * Branding customization
 */
export interface TenantBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  companyName?: string;
  customCSS?: string;
  emailHeaderImage?: string;
  invoiceTemplate?: string;
}

/**
 * Business-specific settings
 */
export interface JewellerySettings {
  defaultPurity: string;
  goldRateSource?: string;
  goldRateAPIKey?: string;
  autoUpdateGoldRate: boolean;
  makingChargesType: 'per_gram' | 'percentage' | 'fixed';
  defaultMakingCharges: number;
  enableHallmarking: boolean;
}

export interface RestaurantSettings {
  enableKOT: boolean;
  enableTableReservations: boolean;
  serviceChargePercent: number;
  packagingChargeType: 'fixed' | 'percent';
  packagingChargeValue: number;
  defaultTaxRate: number;
  kotPrinterIP?: string;
  billPrinterIP?: string;
  enableOnlineOrdering: boolean;
  defaultPrepTimeMinutes: number;
  tableTurnoverTargetMinutes: number;
}

export interface MedicalSettings {
  requirePrescriptionForScheduleH: boolean;
  prescriptionValidityDays: number;
  expiryAlertDays: number[];  // [90, 60, 30]
  pharmacistName: string;
  pharmacistRegNo: string;
  drugLicenseNo: string;
  gstinNumber: string;
  enableBatchTracking: boolean;
  enableBarcode: boolean;
}

export interface RetailSettings {
  enableBarcode: boolean;
  enableLoyalty: boolean;
  loyaltyPointsPerRupee: number;
  loyaltyRedemptionValue: number;
  enableCustomerCredit: boolean;
  defaultCreditDays: number;
  enableDayClosing: boolean;
  thermalPrinterIP?: string;
  weighingScalePort?: string;
}

/**
 * Complete Tenant Configuration
 */
export interface TenantConfiguration {
  id?: string;
  tenantId: string;

  // Basic Information
  businessType: BusinessType;
  accessLevel: AccessLevel;

  // Module Access
  modules: ModuleConfiguration;

  // Limits
  limits: TenantLimits;

  // Current Usage
  usage?: TenantUsage;

  // Pricing
  pricing: TenantPricing;

  // Status
  status: TenantStatus;
  trialStartDate?: string;
  trialEndDate?: string;
  activatedDate?: string;
  suspendedDate?: string;
  suspensionReason?: string;
  expiryDate?: string;

  // Custom Features (Granular overrides)
  customFeatures?: CustomFeature[];

  // Branding
  branding?: TenantBranding;

  // Business-Specific Settings
  jewellerySettings?: JewellerySettings;
  restaurantSettings?: RestaurantSettings;
  medicalSettings?: MedicalSettings;
  retailSettings?: RetailSettings;

  // Support
  supportPlan: SupportPlan;
  supportContact?: string;
  accountManager?: string;
  accountManagerEmail?: string;

  // Notifications
  notificationEmail?: string;
  billingEmail?: string;
  technicalEmail?: string;

  // Compliance
  dataRetentionDays?: number;
  enableAuditLog: boolean;
  enableDataBackup: boolean;

  // Audit Trail
  createdAt: string;
  createdBy: string;
  createdByName: string;
  activatedBy?: string;
  activatedByName?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  lastModifiedByName?: string;

  // Notes
  internalNotes?: string;
}

/**
 * Default configurations for each access level
 */
export const DEFAULT_LIMITS: Record<AccessLevel, TenantLimits> = {
  free: {
    maxUsers: 1,
    maxProducts: 50,
    maxMenuItems: 20,
    maxMedicines: 50,
    maxInvoicesPerMonth: 20,
    maxBranches: 1,
    maxStorageGB: 0.1,  // 100MB
    maxAPICallsPerDay: 0,
    maxSMSPerMonth: 0,
    maxWhatsAppPerMonth: 0,
    maxEmailsPerMonth: 10,
  },
  small: {
    maxUsers: 3,
    maxProducts: 500,
    maxMenuItems: 100,
    maxMedicines: 500,
    maxInvoicesPerMonth: 100,
    maxBranches: 1,
    maxStorageGB: 1,
    maxAPICallsPerDay: 0,
    maxSMSPerMonth: 0,
    maxWhatsAppPerMonth: 0,
    maxEmailsPerMonth: 100,
  },
  advanced: {
    maxUsers: 10,
    maxProducts: 5000,
    maxMenuItems: 500,
    maxMedicines: 5000,
    maxInvoicesPerMonth: 1000,
    maxBranches: 3,
    maxStorageGB: 10,
    maxAPICallsPerDay: 1000,
    maxSMSPerMonth: 500,
    maxWhatsAppPerMonth: 500,
    maxEmailsPerMonth: 1000,
  },
  enterprise: {
    maxUsers: -1,  // Unlimited
    maxProducts: -1,
    maxMenuItems: -1,
    maxMedicines: -1,
    maxInvoicesPerMonth: -1,
    maxBranches: -1,
    maxStorageGB: 100,
    maxAPICallsPerDay: 10000,
    maxSMSPerMonth: 5000,
    maxWhatsAppPerMonth: 5000,
    maxEmailsPerMonth: 10000,
  },
};

/**
 * Default module configurations per business type and access level
 */
export const DEFAULT_MODULES: Record<BusinessType, Record<AccessLevel, Partial<ModuleConfiguration>>> = {
  jewellery: {
    free: {
      invoicing: true,
      estimates: false,
      customers: true,
      reports: false,
      jewelleryInventory: false,
    },
    small: {
      invoicing: true,
      estimates: true,
      customers: true,
      reports: true,
      jewelleryInventory: true,
      customOrders: false,
      oldGoldPurchase: false,
      goldRateSync: false,
    },
    advanced: {
      invoicing: true,
      estimates: true,
      customers: true,
      reports: true,
      jewelleryInventory: true,
      customOrders: true,
      oldGoldPurchase: true,
      goldRateSync: true,
      hallmarkTracking: true,
      schemeManagement: true,
      barcodeScanning: true,
      whatsappIntegration: true,
      advancedReports: true,
    },
    enterprise: {
      invoicing: true,
      estimates: true,
      customers: true,
      reports: true,
      jewelleryInventory: true,
      customOrders: true,
      oldGoldPurchase: true,
      goldRateSync: true,
      hallmarkTracking: true,
      schemeManagement: true,
      repairTracking: true,
      barcodeScanning: true,
      multiLocation: true,
      mobileApp: true,
      whatsappIntegration: true,
      emailAutomation: true,
      apiAccess: true,
      customFields: true,
      advancedReports: true,
    },
  },
  restaurant: {
    free: {
      menuManagement: true,
      kotSystem: false,
      tableManagement: false,
    },
    small: {
      menuManagement: true,
      kotSystem: true,
      tableManagement: true,
      invoicing: true,
      customers: true,
      reports: true,
    },
    advanced: {
      menuManagement: true,
      kotSystem: true,
      tableManagement: true,
      kitchenDisplay: true,
      tableReservations: true,
      deliveryManagement: true,
      recipeCostManagement: true,
      onlineOrdering: true,
      invoicing: true,
      customers: true,
      reports: true,
      advancedReports: true,
      whatsappIntegration: true,
    },
    enterprise: {
      menuManagement: true,
      kotSystem: true,
      tableManagement: true,
      kitchenDisplay: true,
      tableReservations: true,
      deliveryManagement: true,
      recipeCostManagement: true,
      onlineOrdering: true,
      multiLocation: true,
      mobileApp: true,
      whatsappIntegration: true,
      emailAutomation: true,
      apiAccess: true,
      customFields: true,
      advancedReports: true,
    },
  },
  medical: {
    free: {
      medicineInventory: true,
      invoicing: true,
      customers: true,
    },
    small: {
      medicineInventory: true,
      invoicing: true,
      customers: true,
      reports: true,
      expiryManagement: true,
      scheduleHCompliance: true,
    },
    advanced: {
      medicineInventory: true,
      batchTracking: true,
      prescriptionManagement: true,
      expiryManagement: true,
      scheduleHCompliance: true,
      purchaseOrders: true,
      barcodeScanning: true,
      drugInteractionWarnings: true,
      invoicing: true,
      customers: true,
      reports: true,
      advancedReports: true,
      whatsappIntegration: true,
    },
    enterprise: {
      medicineInventory: true,
      batchTracking: true,
      prescriptionManagement: true,
      expiryManagement: true,
      scheduleHCompliance: true,
      purchaseOrders: true,
      barcodeScanning: true,
      drugInteractionWarnings: true,
      insuranceClaims: true,
      multiLocation: true,
      mobileApp: true,
      whatsappIntegration: true,
      emailAutomation: true,
      apiAccess: true,
      advancedReports: true,
    },
  },
  retail: {
    free: {
      retailPOS: true,
      customers: true,
      invoicing: true,
    },
    small: {
      retailPOS: true,
      customers: true,
      invoicing: true,
      reports: true,
      inventory: true,
    },
    advanced: {
      retailPOS: true,
      barcodeScanning: true,
      loyaltyProgram: true,
      promotions: true,
      customerCredit: true,
      multiPayment: true,
      inventory: true,
      customers: true,
      invoicing: true,
      reports: true,
      advancedReports: true,
      whatsappIntegration: true,
      smsNotifications: true,
    },
    enterprise: {
      retailPOS: true,
      barcodeScanning: true,
      loyaltyProgram: true,
      promotions: true,
      customerCredit: true,
      multiPayment: true,
      weighingScale: true,
      inventory: true,
      multiLocation: true,
      mobileApp: true,
      whatsappIntegration: true,
      emailAutomation: true,
      smsNotifications: true,
      apiAccess: true,
      customFields: true,
      advancedReports: true,
    },
  },
  manufacturing: {
    free: { invoicing: true },
    small: { invoicing: true, inventory: true, reports: true },
    advanced: {
      invoicing: true,
      inventory: true,
      bom: true,
      productionPlanning: true,
      reports: true,
      advancedReports: true,
    },
    enterprise: {
      invoicing: true,
      inventory: true,
      bom: true,
      productionPlanning: true,
      shopFloor: true,
      qualityControl: true,
      multiLocation: true,
      mobileApp: true,
      apiAccess: true,
      advancedReports: true,
    },
  },
  services: {
    free: { invoicing: true, customers: true },
    small: { invoicing: true, estimates: true, customers: true, reports: true },
    advanced: {
      invoicing: true,
      estimates: true,
      customers: true,
      reports: true,
      advancedReports: true,
      whatsappIntegration: true,
    },
    enterprise: {
      invoicing: true,
      estimates: true,
      customers: true,
      reports: true,
      advancedReports: true,
      whatsappIntegration: true,
      emailAutomation: true,
      apiAccess: true,
    },
  },
};
