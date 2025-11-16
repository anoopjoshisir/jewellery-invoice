import { Injectable } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, Timestamp } from '@angular/fire/firestore';
import {
  TenantConfiguration,
  TenantUsage,
  ModuleConfiguration,
  CustomFeature,
  BusinessType,
  AccessLevel,
  DEFAULT_LIMITS,
  DEFAULT_MODULES,
  TenantPricing,
} from '../models/tenant-configuration.model';
import { AuditLogService } from './audit-log.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TenantConfigurationService {
  private collectionName = 'tenantConfigurations';

  constructor(
    private firestore: Firestore,
    private auditLogService: AuditLogService,
    private authService: AuthService
  ) {}

  /**
   * Create a new tenant configuration
   */
  async createConfiguration(config: Omit<TenantConfiguration, 'id' | 'createdAt' | 'usage'>): Promise<string> {
    const user = this.authService.user$.getValue();
    if (!user) throw new Error('User not authenticated');

    const now = new Date().toISOString();

    // Initialize usage
    const usage: TenantUsage = {
      currentUsers: 1,  // Creator
      currentProducts: 0,
      currentInvoicesThisMonth: 0,
      currentBranches: 1,
      currentStorageGB: 0,
      currentAPICallsToday: 0,
      currentSMSThisMonth: 0,
      currentWhatsAppThisMonth: 0,
      currentEmailsThisMonth: 0,
      lastMonthlyReset: now,
      lastDailyReset: now,
    };

    const newConfig: Omit<TenantConfiguration, 'id'> = {
      ...config,
      usage,
      createdAt: now,
      createdBy: user.uid,
      createdByName: user.name || user.email || 'Unknown',
    };

    const colRef = collection(this.firestore, this.collectionName);
    const docRef = await addDoc(colRef, newConfig);

    // Audit log
    await this.auditLogService.log({
      action: 'tenant_created',
      module: 'tenant',
      description: `Created configuration for tenant: ${config.tenantId}`,
      tenantId: config.tenantId,
      newValue: newConfig,
    });

    return docRef.id;
  }

  /**
   * Get configuration by ID
   */
  async getById(id: string): Promise<TenantConfiguration | null> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as TenantConfiguration;
    }
    return null;
  }

  /**
   * Get configuration by tenant ID
   */
  async getByTenantId(tenantId: string): Promise<TenantConfiguration | null> {
    const colRef = collection(this.firestore, this.collectionName);
    const q = query(colRef, where('tenantId', '==', tenantId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as TenantConfiguration;
    }
    return null;
  }

  /**
   * Get all configurations
   */
  async getAll(): Promise<TenantConfiguration[]> {
    const colRef = collection(this.firestore, this.collectionName);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TenantConfiguration));
  }

  /**
   * Get configurations by business type
   */
  async getByBusinessType(businessType: BusinessType): Promise<TenantConfiguration[]> {
    const colRef = collection(this.firestore, this.collectionName);
    const q = query(colRef, where('businessType', '==', businessType), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TenantConfiguration));
  }

  /**
   * Get configurations by status
   */
  async getByStatus(status: string): Promise<TenantConfiguration[]> {
    const colRef = collection(this.firestore, this.collectionName);
    const q = query(colRef, where('status', '==', status), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TenantConfiguration));
  }

  /**
   * Update configuration
   */
  async update(id: string, updates: Partial<TenantConfiguration>): Promise<void> {
    const user = this.authService.user$.getValue();
    if (!user) throw new Error('User not authenticated');

    // Get old value for audit
    const oldConfig = await this.getById(id);

    const docRef = doc(this.firestore, this.collectionName, id);
    await updateDoc(docRef, {
      ...updates,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: user.uid,
      lastModifiedByName: user.name || user.email || 'Unknown',
    });

    // Audit log
    await this.auditLogService.log({
      action: 'config_updated',
      module: 'configuration',
      description: `Updated configuration for tenant: ${oldConfig?.tenantId}`,
      tenantId: oldConfig?.tenantId,
      oldValue: oldConfig,
      newValue: updates,
    });
  }

  /**
   * Enable a feature
   */
  async enableFeature(id: string, featureName: keyof ModuleConfiguration): Promise<void> {
    const config = await this.getById(id);
    if (!config) throw new Error('Configuration not found');

    const modules = { ...config.modules, [featureName]: true };
    await this.update(id, { modules });

    // Audit log
    await this.auditLogService.log({
      action: 'feature_enabled',
      module: 'configuration',
      description: `Enabled feature: ${featureName} for tenant: ${config.tenantId}`,
      tenantId: config.tenantId,
      metadata: { featureName },
    });
  }

  /**
   * Disable a feature
   */
  async disableFeature(id: string, featureName: keyof ModuleConfiguration): Promise<void> {
    const config = await this.getById(id);
    if (!config) throw new Error('Configuration not found');

    const modules = { ...config.modules, [featureName]: false };
    await this.update(id, { modules });

    // Audit log
    await this.auditLogService.log({
      action: 'feature_disabled',
      module: 'configuration',
      description: `Disabled feature: ${featureName} for tenant: ${config.tenantId}`,
      tenantId: config.tenantId,
      metadata: { featureName },
    });
  }

  /**
   * Add custom feature
   */
  async addCustomFeature(id: string, customFeature: CustomFeature): Promise<void> {
    const user = this.authService.user$.getValue();
    if (!user) throw new Error('User not authenticated');

    const config = await this.getById(id);
    if (!config) throw new Error('Configuration not found');

    const customFeatures = [...(config.customFeatures || []), {
      ...customFeature,
      enabledBy: user.uid,
      enabledAt: new Date().toISOString(),
    }];

    await this.update(id, { customFeatures });

    // Audit log
    await this.auditLogService.log({
      action: 'custom_feature_added',
      module: 'configuration',
      description: `Added custom feature: ${customFeature.featureName} for tenant: ${config.tenantId}`,
      tenantId: config.tenantId,
      metadata: { customFeature },
    });
  }

  /**
   * Remove custom feature
   */
  async removeCustomFeature(id: string, featureName: string): Promise<void> {
    const config = await this.getById(id);
    if (!config) throw new Error('Configuration not found');

    const customFeatures = (config.customFeatures || []).filter(f => f.featureName !== featureName);
    await this.update(id, { customFeatures });

    // Audit log
    await this.auditLogService.log({
      action: 'custom_feature_removed',
      module: 'configuration',
      description: `Removed custom feature: ${featureName} for tenant: ${config.tenantId}`,
      tenantId: config.tenantId,
      metadata: { featureName },
    });
  }

  /**
   * Upgrade plan
   */
  async upgradePlan(id: string, newPlan: AccessLevel): Promise<void> {
    const config = await this.getById(id);
    if (!config) throw new Error('Configuration not found');

    const oldPlan = config.accessLevel;

    // Update access level
    const pricing: TenantPricing = {
      ...config.pricing,
      plan: newPlan,
    };

    // Update limits based on new plan
    const limits = DEFAULT_LIMITS[newPlan];

    // Update modules based on business type and new plan
    const defaultModules = DEFAULT_MODULES[config.businessType][newPlan];
    const modules = { ...config.modules, ...defaultModules };

    await this.update(id, {
      accessLevel: newPlan,
      pricing,
      limits,
      modules,
    });

    // Audit log
    await this.auditLogService.log({
      action: 'plan_upgraded',
      module: 'billing',
      description: `Upgraded plan from ${oldPlan} to ${newPlan} for tenant: ${config.tenantId}`,
      tenantId: config.tenantId,
      oldValue: oldPlan,
      newValue: newPlan,
    });
  }

  /**
   * Suspend tenant
   */
  async suspend(id: string, reason: string): Promise<void> {
    const config = await this.getById(id);
    if (!config) throw new Error('Configuration not found');

    await this.update(id, {
      status: 'suspended',
      suspendedDate: new Date().toISOString(),
      suspensionReason: reason,
    });

    // Audit log
    await this.auditLogService.log({
      action: 'tenant_suspended',
      module: 'tenant',
      description: `Suspended tenant: ${config.tenantId}. Reason: ${reason}`,
      tenantId: config.tenantId,
      metadata: { reason },
    });
  }

  /**
   * Resume tenant
   */
  async resume(id: string): Promise<void> {
    const config = await this.getById(id);
    if (!config) throw new Error('Configuration not found');

    await this.update(id, {
      status: 'active',
      suspendedDate: undefined,
      suspensionReason: undefined,
    });

    // Audit log
    await this.auditLogService.log({
      action: 'tenant_resumed',
      module: 'tenant',
      description: `Resumed tenant: ${config.tenantId}`,
      tenantId: config.tenantId,
    });
  }

  /**
   * Check if feature is enabled for tenant
   */
  async isFeatureEnabled(tenantId: string, featureName: keyof ModuleConfiguration): Promise<boolean> {
    const config = await this.getByTenantId(tenantId);
    if (!config) return false;

    return config.modules[featureName] || false;
  }

  /**
   * Check if tenant has reached limit
   */
  async hasReachedLimit(tenantId: string, limitType: keyof TenantUsage): Promise<boolean> {
    const config = await this.getByTenantId(tenantId);
    if (!config || !config.usage) return false;

    const limitKey = limitType.replace('current', 'max') as keyof typeof config.limits;
    const limit = config.limits[limitKey];
    const usage = config.usage[limitType];

    // -1 means unlimited
    if (limit === -1) return false;

    return usage >= limit;
  }

  /**
   * Increment usage
   */
  async incrementUsage(tenantId: string, usageType: keyof TenantUsage, amount: number = 1): Promise<void> {
    const config = await this.getByTenantId(tenantId);
    if (!config || !config.usage || !config.id) return;

    const usage = { ...config.usage };
    (usage[usageType] as number) += amount;

    await this.update(config.id, { usage });
  }

  /**
   * Reset monthly usage
   */
  async resetMonthlyUsage(tenantId: string): Promise<void> {
    const config = await this.getByTenantId(tenantId);
    if (!config || !config.usage || !config.id) return;

    const usage: TenantUsage = {
      ...config.usage,
      currentInvoicesThisMonth: 0,
      currentSMSThisMonth: 0,
      currentWhatsAppThisMonth: 0,
      currentEmailsThisMonth: 0,
      lastMonthlyReset: new Date().toISOString(),
    };

    await this.update(config.id, { usage });
  }

  /**
   * Reset daily usage
   */
  async resetDailyUsage(tenantId: string): Promise<void> {
    const config = await this.getByTenantId(tenantId);
    if (!config || !config.usage || !config.id) return;

    const usage: TenantUsage = {
      ...config.usage,
      currentAPICallsToday: 0,
      lastDailyReset: new Date().toISOString(),
    };

    await this.update(config.id, { usage });
  }

  /**
   * Delete configuration
   */
  async delete(id: string): Promise<void> {
    const config = await this.getById(id);
    if (!config) throw new Error('Configuration not found');

    const docRef = doc(this.firestore, this.collectionName, id);
    await deleteDoc(docRef);

    // Audit log
    await this.auditLogService.log({
      action: 'tenant_deleted',
      module: 'tenant',
      description: `Deleted configuration for tenant: ${config.tenantId}`,
      tenantId: config.tenantId,
      oldValue: config,
    });
  }

  /**
   * Get usage summary for tenant
   */
  async getUsageSummary(tenantId: string): Promise<{
    usage: TenantUsage;
    limits: typeof DEFAULT_LIMITS[AccessLevel];
    percentages: Record<string, number>;
  } | null> {
    const config = await this.getByTenantId(tenantId);
    if (!config || !config.usage) return null;

    const percentages: Record<string, number> = {};

    // Calculate percentage for each limit
    Object.keys(config.usage).forEach(key => {
      if (key.startsWith('current')) {
        const limitKey = key.replace('current', 'max') as keyof typeof config.limits;
        const limit = config.limits[limitKey];
        const usage = config.usage![key as keyof TenantUsage] as number;

        if (limit === -1) {
          percentages[key] = 0;  // Unlimited
        } else {
          percentages[key] = (usage / limit) * 100;
        }
      }
    });

    return {
      usage: config.usage,
      limits: config.limits,
      percentages,
    };
  }
}
