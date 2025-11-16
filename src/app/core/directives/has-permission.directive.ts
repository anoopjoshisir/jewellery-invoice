import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionService } from '../services/permission.service';
import { Permission } from '../models/role.model';

/**
 * Structural directive to show/hide elements based on user permissions
 *
 * Usage:
 * <button *hasPermission="'create_invoice'">Create Invoice</button>
 * <div *hasPermission="['create_invoice', 'edit_invoice']; requireAll: false">...</div>
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private permissions: Permission[] = [];
  private requireAll = true;
  private subscription?: Subscription;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  @Input() set hasPermission(permissions: Permission | Permission[]) {
    this.permissions = Array.isArray(permissions) ? permissions : [permissions];
    this.updateView();
  }

  @Input() set hasPermissionRequireAll(requireAll: boolean) {
    this.requireAll = requireAll;
    this.updateView();
  }

  ngOnInit() {
    // Subscribe to permission changes
    this.subscription = this.permissionService.getUserPermissions().subscribe(() => {
      this.updateView();
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private updateView() {
    const hasAccess = this.requireAll
      ? this.permissionService.hasAllPermissions(this.permissions)
      : this.permissionService.hasAnyPermission(this.permissions);

    if (hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
