import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TenantService } from '../../core/services/tenant.service';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Tenant } from '../../core/models/tenant.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-tenant-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-switcher.component.html',
  styleUrls: ['./tenant-switcher.component.scss']
})
export class TenantSwitcherComponent implements OnInit {
  currentTenant: Tenant | null = null;
  userTenants: Tenant[] = [];
  currentUser: User | null = null;
  showDropdown = false;
  isLoading = false;
  isSwitching = false;

  constructor(
    private tenantService: TenantService,
    private permissionService: PermissionService,
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.currentUser = this.authService.currentUser;

    // Subscribe to current tenant changes
    this.tenantService.getCurrentTenant().subscribe(tenant => {
      this.currentTenant = tenant;
    });

    // Load user's tenants
    await this.loadUserTenants();
  }

  async loadUserTenants() {
    try {
      this.isLoading = true;

      // If super admin, get all tenants
      if (this.currentUser?.isSuperAdmin) {
        this.userTenants = await this.tenantService.getAllTenants();
      } else {
        // Get tenants from user-tenant-role mapping
        const tenantIds = this.currentUser?.tenants?.map(t => t.tenantId) ||
                          this.currentUser?.companies || [];

        if (tenantIds.length > 0) {
          // Load tenant details for each tenant ID
          const tenantPromises = tenantIds.map(id =>
            this.tenantService.getById(id)
          );
          const tenants = await Promise.all(tenantPromises);
          this.userTenants = tenants.filter(t => t !== null) as Tenant[];
        }
      }

      // If no current tenant, set the first one
      if (!this.currentTenant && this.userTenants.length > 0) {
        await this.switchTenant(this.userTenants[0]);
      }
    } catch (error) {
      console.error('Error loading user tenants:', error);
      this.notification.error('Failed to load your businesses');
    } finally {
      this.isLoading = false;
    }
  }

  async switchTenant(tenant: Tenant) {
    if (this.isSwitching || tenant.id === this.currentTenant?.id) {
      this.showDropdown = false;
      return;
    }

    try {
      this.isSwitching = true;

      // Check if tenant is active
      if (tenant.status !== 'active' && tenant.status !== 'trial') {
        this.notification.error(`This business is ${tenant.status}. Please contact support.`);
        return;
      }

      // Set as current tenant
      this.tenantService.setCurrentTenant(tenant);

      // Load permissions for this tenant
      if (this.currentUser && tenant.id) {
        await this.permissionService.loadUserPermissions(
          this.currentUser.uid,
          tenant.id
        );
      }

      this.notification.success(`Switched to ${tenant.name}`);
      this.showDropdown = false;

      // Reload current page with new tenant context
      const currentUrl = this.router.url;
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([currentUrl]);
      });
    } catch (error) {
      console.error('Error switching tenant:', error);
      this.notification.error('Failed to switch business. Please try again.');
    } finally {
      this.isSwitching = false;
    }
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown() {
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  createNewTenant() {
    this.showDropdown = false;
    this.router.navigate(['/tenant-onboarding']);
  }

  getTenantStatusBadge(status: string): string {
    const badges: any = {
      'active': '🟢',
      'trial': '🔵',
      'suspended': '🔴',
      'expired': '⚫'
    };
    return badges[status] || '';
  }

  getTenantStatusText(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getPlanBadge(plan: string): string {
    const badges: any = {
      'free': '🆓',
      'basic': '📦',
      'premium': '⭐',
      'enterprise': '💎'
    };
    return badges[plan] || '';
  }
}
