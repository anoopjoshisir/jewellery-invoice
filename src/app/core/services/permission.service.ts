import { Injectable } from '@angular/core';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Permission, Role, SystemRoles, UserTenantRole } from '../models/role.model';
import { User } from '../models/user.model';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private userPermissions$ = new BehaviorSubject<Permission[]>([]);

  constructor(
    private fb: FirebaseService,
    private authService: AuthService
  ) {}

  /**
   * Get user permissions for current tenant
   */
  getUserPermissions(): Observable<Permission[]> {
    return this.userPermissions$.asObservable();
  }

  /**
   * Load user permissions for a specific tenant
   */
  async loadUserPermissions(userId: string, tenantId: string): Promise<void> {
    try {
      const user = this.authService.currentUser;

      // Super admins have all permissions
      if (user?.isSuperAdmin) {
        this.userPermissions$.next(Object.values(Permission));
        return;
      }

      // Get user-tenant-role mapping
      const userRole = await this.getUserTenantRole(userId, tenantId);
      if (!userRole) {
        this.userPermissions$.next([]);
        return;
      }

      // Get role permissions
      const role = await this.getRoleById(userRole.roleId);
      if (role) {
        this.userPermissions$.next(role.permissions);
      } else {
        this.userPermissions$.next([]);
      }
    } catch (error) {
      console.error('Error loading user permissions:', error);
      this.userPermissions$.next([]);
    }
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    const permissions = this.userPermissions$.value;
    return permissions.includes(permission) || permissions.includes(Permission.SUPER_ADMIN);
  }

  /**
   * Check if user has any of the permissions
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  /**
   * Check if user has all permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * Get user-tenant-role mapping
   */
  async getUserTenantRole(userId: string, tenantId: string): Promise<UserTenantRole | null> {
    try {
      const q = query(
        collection(this.fb.db, 'userTenantRoles'),
        where('userId', '==', userId),
        where('tenantId', '==', tenantId)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as UserTenantRole;
    } catch (error) {
      console.error('Error getting user tenant role:', error);
      return null;
    }
  }

  /**
   * Assign role to user for a tenant
   */
  async assignRoleToUser(
    userId: string,
    tenantId: string,
    roleId: string,
    assignedBy: string
  ): Promise<void> {
    try {
      // Check if mapping already exists
      const existing = await this.getUserTenantRole(userId, tenantId);
      if (existing) {
        // Update existing role
        const q = query(
          collection(this.fb.db, 'userTenantRoles'),
          where('userId', '==', userId),
          where('tenantId', '==', tenantId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(snap.docs[0].ref, {
            roleId,
            assignedAt: new Date().toISOString(),
            assignedBy
          });
        }
      } else {
        // Create new mapping
        await addDoc(collection(this.fb.db, 'userTenantRoles'), {
          userId,
          tenantId,
          roleId,
          assignedAt: new Date().toISOString(),
          assignedBy
        });
      }
    } catch (error) {
      console.error('Error assigning role to user:', error);
      throw error;
    }
  }

  /**
   * Remove user from tenant
   */
  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    try {
      const q = query(
        collection(this.fb.db, 'userTenantRoles'),
        where('userId', '==', userId),
        where('tenantId', '==', tenantId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(snap.docs[0].ref);
      }
    } catch (error) {
      console.error('Error removing user from tenant:', error);
      throw error;
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<Role | null> {
    try {
      const roleDoc = await getDocs(
        query(collection(this.fb.db, 'roles'), where('__name__', '==', roleId))
      );
      if (roleDoc.empty) return null;
      return roleDoc.docs[0].data() as Role;
    } catch (error) {
      console.error('Error getting role:', error);
      return null;
    }
  }

  /**
   * Get all roles for a tenant
   */
  async getRolesByTenant(tenantId: string): Promise<Role[]> {
    try {
      const q = query(
        collection(this.fb.db, 'roles'),
        where('tenantId', '==', tenantId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
    } catch (error) {
      console.error('Error getting roles:', error);
      return [];
    }
  }

  /**
   * Create default system roles for a tenant
   */
  async createDefaultRoles(tenantId: string, createdBy: string): Promise<void> {
    try {
      const roles = [
        { ...SystemRoles.TENANT_ADMIN, tenantId, createdAt: new Date().toISOString() },
        { ...SystemRoles.MANAGER, tenantId, createdAt: new Date().toISOString() },
        { ...SystemRoles.ACCOUNTANT, tenantId, createdAt: new Date().toISOString() },
        { ...SystemRoles.SALES_PERSON, tenantId, createdAt: new Date().toISOString() },
        { ...SystemRoles.VIEWER, tenantId, createdAt: new Date().toISOString() }
      ];

      for (const role of roles) {
        await addDoc(collection(this.fb.db, 'roles'), role);
      }
    } catch (error) {
      console.error('Error creating default roles:', error);
      throw error;
    }
  }

  /**
   * Create custom role
   */
  async createRole(role: Omit<Role, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(this.fb.db, 'roles'), {
        ...role,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<void> {
    try {
      await updateDoc(doc(this.fb.db, 'roles', roleId), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  /**
   * Delete role (only if not system role)
   */
  async deleteRole(roleId: string): Promise<void> {
    try {
      const role = await this.getRoleById(roleId);
      if (role?.isSystemRole) {
        throw new Error('Cannot delete system role');
      }
      await deleteDoc(doc(this.fb.db, 'roles', roleId));
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  /**
   * Get all users for a tenant with their roles
   */
  async getTenantUsers(tenantId: string): Promise<any[]> {
    try {
      const q = query(
        collection(this.fb.db, 'userTenantRoles'),
        where('tenantId', '==', tenantId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting tenant users:', error);
      return [];
    }
  }
}
