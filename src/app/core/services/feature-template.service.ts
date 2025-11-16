import { Injectable } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy } from '@angular/fire/firestore';
import { FeatureTemplate, PREDEFINED_TEMPLATES } from '../models/feature-template.model';
import { BusinessType, AccessLevel } from '../models/tenant-configuration.model';
import { AuditLogService } from './audit-log.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FeatureTemplateService {
  private collectionName = 'featureTemplates';

  constructor(
    private firestore: Firestore,
    private auditLogService: AuditLogService,
    private authService: AuthService
  ) {}

  /**
   * Initialize default templates
   * Should be called once during system setup
   */
  async initializeDefaultTemplates(): Promise<void> {
    const user = this.authService.user$.getValue();
    if (!user || !user.isSuperAdmin) {
      throw new Error('Only super admin can initialize templates');
    }

    const now = new Date().toISOString();

    for (const template of PREDEFINED_TEMPLATES) {
      const fullTemplate: Omit<FeatureTemplate, 'id'> = {
        ...template,
        createdAt: now,
        createdBy: user.uid,
        createdByName: user.name || user.email || 'Super Admin',
      };

      await this.create(fullTemplate);
    }

    // Audit log
    await this.auditLogService.log({
      action: 'template_created',
      module: 'template',
      description: `Initialized ${PREDEFINED_TEMPLATES.length} default templates`,
    });
  }

  /**
   * Create a new template
   */
  async create(template: Omit<FeatureTemplate, 'id'>): Promise<string> {
    const user = this.authService.user$.getValue();
    if (!user || !user.isSuperAdmin) {
      throw new Error('Only super admin can create templates');
    }

    const colRef = collection(this.firestore, this.collectionName);
    const docRef = await addDoc(colRef, template);

    // Audit log
    await this.auditLogService.log({
      action: 'template_created',
      module: 'template',
      description: `Created template: ${template.templateName}`,
      newValue: template,
    });

    return docRef.id;
  }

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<FeatureTemplate | null> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FeatureTemplate;
    }
    return null;
  }

  /**
   * Get all templates
   */
  async getAll(): Promise<FeatureTemplate[]> {
    const colRef = collection(this.firestore, this.collectionName);
    const q = query(colRef, orderBy('displayOrder', 'asc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FeatureTemplate));
  }

  /**
   * Get templates by business type
   */
  async getByBusinessType(businessType: BusinessType): Promise<FeatureTemplate[]> {
    const colRef = collection(this.firestore, this.collectionName);
    const q = query(
      colRef,
      where('businessType', '==', businessType),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FeatureTemplate));
  }

  /**
   * Get visible templates for tenant selection
   */
  async getVisibleTemplates(businessType?: BusinessType): Promise<FeatureTemplate[]> {
    const colRef = collection(this.firestore, this.collectionName);
    let q = query(
      colRef,
      where('isActive', '==', true),
      where('isVisible', '==', true),
      orderBy('displayOrder', 'asc')
    );

    if (businessType) {
      q = query(q, where('businessType', '==', businessType));
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FeatureTemplate));
  }

  /**
   * Get default template for business type
   */
  async getDefaultTemplate(businessType: BusinessType): Promise<FeatureTemplate | null> {
    const colRef = collection(this.firestore, this.collectionName);
    const q = query(
      colRef,
      where('businessType', '==', businessType),
      where('isDefault', '==', true),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as FeatureTemplate;
    }
    return null;
  }

  /**
   * Get recommended template for business type
   */
  async getRecommendedTemplate(businessType: BusinessType): Promise<FeatureTemplate | null> {
    const colRef = collection(this.firestore, this.collectionName);
    const q = query(
      colRef,
      where('businessType', '==', businessType),
      where('isRecommended', '==', true),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as FeatureTemplate;
    }
    return null;
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(): Promise<FeatureTemplate[]> {
    const colRef = collection(this.firestore, this.collectionName);
    const q = query(
      colRef,
      where('isPopular', '==', true),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FeatureTemplate));
  }

  /**
   * Update template
   */
  async update(id: string, updates: Partial<FeatureTemplate>): Promise<void> {
    const user = this.authService.user$.getValue();
    if (!user || !user.isSuperAdmin) {
      throw new Error('Only super admin can update templates');
    }

    // Get old value for audit
    const oldTemplate = await this.getById(id);

    const docRef = doc(this.firestore, this.collectionName, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
      updatedByName: user.name || user.email || 'Unknown',
    });

    // Audit log
    await this.auditLogService.log({
      action: 'template_updated',
      module: 'template',
      description: `Updated template: ${oldTemplate?.templateName}`,
      oldValue: oldTemplate,
      newValue: updates,
    });
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    const user = this.authService.user$.getValue();
    if (!user || !user.isSuperAdmin) {
      throw new Error('Only super admin can delete templates');
    }

    const template = await this.getById(id);
    if (!template) throw new Error('Template not found');

    const docRef = doc(this.firestore, this.collectionName, id);
    await deleteDoc(docRef);

    // Audit log
    await this.auditLogService.log({
      action: 'template_deleted',
      module: 'template',
      description: `Deleted template: ${template.templateName}`,
      oldValue: template,
    });
  }

  /**
   * Set as default template for business type
   */
  async setAsDefault(id: string): Promise<void> {
    const template = await this.getById(id);
    if (!template) throw new Error('Template not found');

    // Unset other defaults for same business type
    const existingDefaults = await this.getByBusinessType(template.businessType);
    for (const existing of existingDefaults) {
      if (existing.id && existing.isDefault && existing.id !== id) {
        await this.update(existing.id, { isDefault: false });
      }
    }

    // Set this as default
    await this.update(id, { isDefault: true });
  }

  /**
   * Clone template
   */
  async clone(id: string, newName: string): Promise<string> {
    const template = await this.getById(id);
    if (!template) throw new Error('Template not found');

    const user = this.authService.user$.getValue();
    if (!user || !user.isSuperAdmin) {
      throw new Error('Only super admin can clone templates');
    }

    const now = new Date().toISOString();

    const clonedTemplate: Omit<FeatureTemplate, 'id'> = {
      ...template,
      templateName: newName,
      isDefault: false,
      isRecommended: false,
      createdAt: now,
      createdBy: user.uid,
      createdByName: user.name || user.email || 'Unknown',
    };

    delete (clonedTemplate as any).id;
    delete (clonedTemplate as any).updatedAt;
    delete (clonedTemplate as any).updatedBy;
    delete (clonedTemplate as any).updatedByName;

    return await this.create(clonedTemplate);
  }
}
