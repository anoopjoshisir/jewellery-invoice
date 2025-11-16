import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { Permission } from '../models/role.model';
import { NotificationService } from '../services/notification.service';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private router: Router,
    private notification: NotificationService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Get required permissions from route data
    const requiredPermissions = route.data['permissions'] as Permission[];
    const requireAll = route.data['requireAll'] !== false; // Default to requiring all

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    // Check permissions
    const hasAccess = requireAll
      ? this.permissionService.hasAllPermissions(requiredPermissions)
      : this.permissionService.hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      this.notification.error('You do not have permission to access this page.');
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}
