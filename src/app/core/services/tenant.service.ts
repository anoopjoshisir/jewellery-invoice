import { Injectable } from '@angular/core';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, increment, Timestamp } from 'firebase/firestore';
import { Tenant } from '../models/tenant.model';
import { FirebaseService } from './firebase.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private currentTenant$ = new BehaviorSubject<Tenant | null>(null);

  constructor(private fb: FirebaseService) {}

  /**
   * Get current tenant as observable
   */
  getCurrentTenant(): Observable<Tenant | null> {
    return this.currentTenant$.asObservable();
  }

  /**
   * Get current tenant value
   */
  getCurrentTenantValue(): Tenant | null {
    return this.currentTenant$.value;
  }

  /**
   * Set current tenant
   */
  setCurrentTenant(tenant: Tenant | null) {
    this.currentTenant$.next(tenant);
    if (tenant?.id) {
      localStorage.setItem('currentTenantId', tenant.id);
    }
  }

  /**
   * Create a new tenant (onboarding)
   */
  async createTenant(tenant: Partial<Tenant>): Promise<string> {
    try {
      const newTenant: Tenant = {
        name: tenant.name || '',
        address: tenant.address || '',
        mobile: tenant.mobile || '',
        email: tenant.email || '',
        gstin: tenant.gstin || '',
        tenantCode: await this.generateTenantCode(tenant.name || ''),
        status: 'trial',
        plan: 'free',
        maxUsers: this.getPlanLimits('free').maxUsers,
        maxInvoicesPerMonth: this.getPlanLimits('free').maxInvoices,
        currentUserCount: 1,
        currentInvoiceCount: 0,
        features: this.getPlanFeatures('free'),
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: this.getTrialEndDate(),
        createdAt: new Date().toISOString(),
        createdBy: tenant.createdBy || '',
        ...tenant
      };

      const docRef = await addDoc(collection(this.fb.db, 'tenants'), newTenant);
      return docRef.id;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getById(id: string): Promise<Tenant | null> {
    try {
      const d = await getDoc(doc(this.fb.db, 'tenants', id));
      return d.exists() ? ({ id: d.id, ...d.data() } as Tenant) : null;
    } catch (error) {
      console.error('Error getting tenant:', error);
      throw error;
    }
  }

  /**
   * Get all active tenants (Super Admin only)
   */
  async getAllTenants(): Promise<Tenant[]> {
    try {
      const q = query(collection(this.fb.db, 'tenants'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
    } catch (error) {
      console.error('Error getting tenants:', error);
      throw error;
    }
  }

  /**
   * Get tenants by status
   */
  async getTenantsByStatus(status: 'active' | 'suspended' | 'trial' | 'expired'): Promise<Tenant[]> {
    try {
      const q = query(
        collection(this.fb.db, 'tenants'),
        where('status', '==', status)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
    } catch (error) {
      console.error('Error getting tenants by status:', error);
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async update(id: string, tenant: Partial<Tenant>): Promise<void> {
    try {
      const updateData = {
        ...tenant,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(this.fb.db, 'tenants', id), updateData);

      // Update current tenant if it's the active one
      const current = this.currentTenant$.value;
      if (current?.id === id) {
        const updated = await this.getById(id);
        this.setCurrentTenant(updated);
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  }

  /**
   * Delete tenant (Super Admin only)
   */
  async delete(id: string): Promise<void> {
    try {
      await updateDoc(doc(this.fb.db, 'tenants', id), {
        status: 'suspended',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deleting tenant:', error);
      throw error;
    }
  }

  /**
   * Suspend tenant
   */
  async suspend(id: string, reason?: string): Promise<void> {
    try {
      await updateDoc(doc(this.fb.db, 'tenants', id), {
        status: 'suspended',
        suspensionReason: reason,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error suspending tenant:', error);
      throw error;
    }
  }

  /**
   * Activate tenant
   */
  async activate(id: string): Promise<void> {
    try {
      await updateDoc(doc(this.fb.db, 'tenants', id), {
        status: 'active',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error activating tenant:', error);
      throw error;
    }
  }

  /**
   * Upgrade tenant plan
   */
  async upgradePlan(
    id: string,
    newPlan: 'free' | 'basic' | 'premium' | 'enterprise'
  ): Promise<void> {
    try {
      const limits = this.getPlanLimits(newPlan);
      const features = this.getPlanFeatures(newPlan);

      await updateDoc(doc(this.fb.db, 'tenants', id), {
        plan: newPlan,
        maxUsers: limits.maxUsers,
        maxInvoicesPerMonth: limits.maxInvoices,
        features,
        status: 'active',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error upgrading plan:', error);
      throw error;
    }
  }

  /**
   * Check if tenant can add more users
   */
  async canAddUser(tenantId: string): Promise<boolean> {
    try {
      const tenant = await this.getById(tenantId);
      if (!tenant) return false;
      return (tenant.currentUserCount || 0) < tenant.maxUsers;
    } catch (error) {
      console.error('Error checking user limit:', error);
      return false;
    }
  }

  /**
   * Check if tenant can create more invoices this month
   */
  async canCreateInvoice(tenantId: string): Promise<boolean> {
    try {
      const tenant = await this.getById(tenantId);
      if (!tenant) return false;
      return (tenant.currentInvoiceCount || 0) < tenant.maxInvoicesPerMonth;
    } catch (error) {
      console.error('Error checking invoice limit:', error);
      return false;
    }
  }

  /**
   * Increment user count
   */
  async incrementUserCount(tenantId: string): Promise<void> {
    try {
      await updateDoc(doc(this.fb.db, 'tenants', tenantId), {
        currentUserCount: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing user count:', error);
      throw error;
    }
  }

  /**
   * Decrement user count
   */
  async decrementUserCount(tenantId: string): Promise<void> {
    try {
      await updateDoc(doc(this.fb.db, 'tenants', tenantId), {
        currentUserCount: increment(-1)
      });
    } catch (error) {
      console.error('Error decrementing user count:', error);
      throw error;
    }
  }

  /**
   * Increment invoice count
   */
  async incrementInvoiceCount(tenantId: string): Promise<void> {
    try {
      await updateDoc(doc(this.fb.db, 'tenants', tenantId), {
        currentInvoiceCount: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing invoice count:', error);
      throw error;
    }
  }

  /**
   * Check if feature is enabled for tenant
   */
  isFeatureEnabled(featureName: keyof Tenant['features']): boolean {
    const tenant = this.currentTenant$.value;
    if (!tenant) return false;
    return tenant.features[featureName] || false;
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(tenantId: string): Promise<any> {
    try {
      const tenant = await this.getById(tenantId);
      if (!tenant) return null;

      return {
        totalUsers: tenant.currentUserCount || 0,
        maxUsers: tenant.maxUsers,
        totalInvoices: tenant.currentInvoiceCount || 0,
        maxInvoices: tenant.maxInvoicesPerMonth,
        storageUsed: tenant.storageUsedMB || 0,
        storageLimit: tenant.storageLimitMB || 0,
        plan: tenant.plan,
        status: tenant.status,
        daysUntilExpiry: this.getDaysUntilExpiry(tenant.subscriptionEndDate)
      };
    } catch (error) {
      console.error('Error getting tenant stats:', error);
      return null;
    }
  }

  /**
   * Generate unique tenant code
   */
  private async generateTenantCode(name: string): Promise<string> {
    const prefix = name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  }

  /**
   * Get trial end date (30 days from now)
   */
  private getTrialEndDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString();
  }

  /**
   * Get plan limits
   */
  private getPlanLimits(plan: string) {
    const limits = {
      free: { maxUsers: 2, maxInvoices: 50 },
      basic: { maxUsers: 5, maxInvoices: 200 },
      premium: { maxUsers: 15, maxInvoices: 1000 },
      enterprise: { maxUsers: 999, maxInvoices: 999999 }
    };
    return limits[plan as keyof typeof limits] || limits.free;
  }

  /**
   * Get plan features
   */
  private getPlanFeatures(plan: string): Tenant['features'] {
    const allFeatures = {
      estimates: true,
      multiCurrency: true,
      advancedReports: true,
      api: true,
      whatsappIntegration: true,
      emailNotifications: true,
      smsNotifications: true,
      customFields: true
    };

    const planFeatures = {
      free: {
        estimates: true,
        multiCurrency: false,
        advancedReports: false,
        api: false,
        whatsappIntegration: false,
        emailNotifications: true,
        smsNotifications: false,
        customFields: false
      },
      basic: {
        estimates: true,
        multiCurrency: true,
        advancedReports: false,
        api: false,
        whatsappIntegration: true,
        emailNotifications: true,
        smsNotifications: false,
        customFields: false
      },
      premium: {
        estimates: true,
        multiCurrency: true,
        advancedReports: true,
        api: false,
        whatsappIntegration: true,
        emailNotifications: true,
        smsNotifications: true,
        customFields: true
      },
      enterprise: allFeatures
    };

    return planFeatures[plan as keyof typeof planFeatures] || planFeatures.free;
  }

  /**
   * Calculate days until subscription expiry
   */
  private getDaysUntilExpiry(endDate?: string): number {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
