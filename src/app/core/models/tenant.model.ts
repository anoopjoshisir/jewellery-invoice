/**
 * Tenant (Company) with advanced multi-tenancy features
 */
export interface Tenant {
  id?: string;

  // Basic Information
  name: string;
  slogan?: string;
  address: string;
  mobile: string;
  email: string;
  gstin: string;
  logoUrl?: string;

  // Multi-Tenant Specific Fields
  tenantCode: string;  // Unique tenant identifier (e.g., "SJSM-001")
  status: 'active' | 'suspended' | 'trial' | 'expired';
  plan: 'free' | 'basic' | 'premium' | 'enterprise';

  // Subscription & Billing
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  maxUsers: number;  // User limit based on plan
  maxInvoicesPerMonth: number;
  currentUserCount?: number;
  currentInvoiceCount?: number;

  // Customization Settings
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    customCSS?: string;
  };

  // Field Visibility Settings
  hideItemFields?: string[];
  hideInvoiceFields?: string[];
  hidePrintItemFields?: string[];
  hidePrintInvoiceFields?: string[];

  // Features Enabled (based on plan)
  features: {
    estimates: boolean;
    multiCurrency: boolean;
    advancedReports: boolean;
    api: boolean;
    whatsappIntegration: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    customFields: boolean;
  };

  // Preferences
  preferences?: {
    dateFormat?: string;
    timeZone?: string;
    currency?: string;
    language?: string;
    invoicePrefix?: string;
    estimatePrefix?: string;
  };

  // Audit Trail
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;

  // Contact Information
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;

  // Storage & Limits
  storageUsedMB?: number;
  storageLimit MB?: number;
}

/**
 * Legacy Company interface (for backward compatibility)
 * @deprecated Use Tenant instead
 */
export interface Company extends Tenant {}
