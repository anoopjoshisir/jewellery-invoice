# 🏢 Advanced Multi-Tenant Architecture Guide

## Overview

Your jewellery invoice application has been upgraded to an **enterprise-grade multi-tenant architecture** supporting unlimited tenants with complete data isolation, role-based access control, and subscription management.

---

## 🎯 Key Features

### 1. **Multi-Tenancy**
- ✅ Complete data isolation per tenant
- ✅ Tenant-specific branding & customization
- ✅ Subscription plans: Free, Basic, Premium, Enterprise
- ✅ Usage limits per plan (users, invoices, storage)
- ✅ Tenant status management (active, trial, suspended, expired)

### 2. **Role-Based Access Control (RBAC)**
- ✅ Granular permissions system
- ✅ 5 predefined roles: Super Admin, Tenant Admin, Manager, Accountant, Sales Person, Viewer
- ✅ Custom role creation
- ✅ Permission-based route guards
- ✅ Permission-based UI element visibility

### 3. **Subscription Management**
- ✅ Plan-based feature access
- ✅ Usage tracking (users, invoices, storage)
- ✅ Automatic limit enforcement
- ✅ Trial period support (30 days)

---

## 📊 Data Models

### **Tenant Model**
```typescript
interface Tenant {
  id: string;
  name: string;
  tenantCode: string;  // Unique identifier
  status: 'active' | 'suspended' | 'trial' | 'expired';
  plan: 'free' | 'basic' | 'premium' | 'enterprise';

  // Limits
  maxUsers: number;
  maxInvoicesPerMonth: number;
  currentUserCount: number;
  currentInvoiceCount: number;

  // Features (plan-based)
  features: {
    estimates: boolean;
    multiCurrency: boolean;
    advancedReports: boolean;
    whatsappIntegration: boolean;
    // ... more features
  };

  // Branding
  branding: {
    primaryColor: string;
    secondaryColor: string;
    customCSS: string;
  };
}
```

### **User Model (Enhanced)**
```typescript
interface User {
  uid: string;
  email: string;
  isSuperAdmin: boolean;  // Access to all tenants

  tenants: TenantMembership[];  // Tenants user belongs to
  currentTenantId: string;  // Active tenant
}

interface TenantMembership {
  tenantId: string;
  roleId: string;
  permissions: Permission[];
  status: 'active' | 'invited' | 'suspended';
}
```

### **Role Model**
```typescript
interface Role {
  id: string;
  tenantId: string;
  name: string;
  permissions: Permission[];
  isSystemRole: boolean;  // Can't be deleted
}
```

---

## 🔐 Permissions

### Available Permissions
```typescript
enum Permission {
  // Invoice
  CREATE_INVOICE, VIEW_INVOICE, EDIT_INVOICE, DELETE_INVOICE,

  // Estimate
  CREATE_ESTIMATE, VIEW_ESTIMATE, EDIT_ESTIMATE, DELETE_ESTIMATE, CONVERT_ESTIMATE,

  // Customer
  CREATE_CUSTOMER, VIEW_CUSTOMER, EDIT_CUSTOMER, DELETE_CUSTOMER,

  // Settings
  MANAGE_COMPANY, MANAGE_USERS, MANAGE_ROLES,

  // Super Admin
  SUPER_ADMIN, MANAGE_TENANTS, VIEW_ALL_TENANTS
}
```

### Predefined Roles

**1. Super Admin**
- Access to all tenants
- All permissions
- Can manage tenants

**2. Tenant Admin**
- Full access within tenant
- Can manage users and roles
- All tenant permissions

**3. Manager**
- Manage invoices, estimates, customers
- View reports
- Cannot manage settings

**4. Accountant**
- View all financial data
- Manage payments
- Export reports

**5. Sales Person**
- Create invoices and estimates
- Manage customers
- View payments

**6. Viewer**
- Read-only access
- No create/edit/delete permissions

---

## 💻 Usage Examples

### 1. **Protect Routes with Permissions**

```typescript
// In app.routes.ts
{
  path: 'invoices',
  component: InvoiceComponent,
  canActivate: [AuthGuard, PermissionGuard],
  data: {
    permissions: [Permission.CREATE_INVOICE],
    requireAll: true
  }
}

{
  path: 'reports',
  component: ReportsComponent,
  canActivate: [AuthGuard, PermissionGuard],
  data: {
    permissions: [Permission.VIEW_REPORTS, Permission.EXPORT_REPORTS],
    requireAll: false  // User needs ANY of these permissions
  }
}
```

### 2. **Show/Hide UI Elements Based on Permissions**

```html
<!-- Show only if user can create invoices -->
<button *hasPermission="'create_invoice'">
  Create Invoice
</button>

<!-- Show if user has ANY of these permissions -->
<div *hasPermission="['view_reports', 'export_reports']; requireAll: false">
  Reports Section
</div>

<!-- Show only if user has ALL permissions -->
<button *hasPermission="['edit_invoice', 'delete_invoice']; requireAll: true">
  Manage Invoices
</button>
```

### 3. **Check Permissions in Component**

```typescript
import { PermissionService } from './core/services/permission.service';
import { Permission } from './core/models/role.model';

export class InvoiceComponent {
  canCreateInvoice = false;

  constructor(private permissionService: PermissionService) {}

  ngOnInit() {
    this.canCreateInvoice = this.permissionService.hasPermission(
      Permission.CREATE_INVOICE
    );
  }

  deleteInvoice() {
    if (!this.permissionService.hasPermission(Permission.DELETE_INVOICE)) {
      this.notification.error('You do not have permission to delete invoices');
      return;
    }
    // ... delete logic
  }
}
```

### 4. **Check Feature Access**

```typescript
import { TenantService } from './core/services/tenant.service';

export class EstimateComponent {
  canUseEstimates = false;

  constructor(private tenantService: TenantService) {}

  ngOnInit() {
    this.canUseEstimates = this.tenantService.isFeatureEnabled('estimates');

    if (!this.canUseEstimates) {
      this.notification.warning('Upgrade to premium plan to use estimates');
      this.router.navigate(['/dashboard']);
    }
  }
}
```

### 5. **Create New Tenant (Onboarding)**

```typescript
import { TenantService } from './core/services/tenant.service';

async createTenant() {
  const tenantId = await this.tenantService.createTenant({
    name: 'ABC Jewellers',
    email: 'contact@abcjewellers.com',
    mobile: '9876543210',
    address: 'Mumbai, India',
    gstin: 'GST123456',
    plan: 'free',  // Start with free plan
    createdBy: this.currentUser.uid
  });

  // Create default roles for this tenant
  await this.permissionService.createDefaultRoles(
    tenantId,
    this.currentUser.uid
  );

  // Assign creator as Tenant Admin
  const adminRole = await this.getAdminRole(tenantId);
  await this.permissionService.assignRoleToUser(
    this.currentUser.uid,
    tenantId,
    adminRole.id,
    this.currentUser.uid
  );
}
```

### 6. **Switch Between Tenants**

```typescript
import { TenantService } from './core/services/tenant.service';
import { PermissionService } from './core/services/permission.service';

async switchTenant(tenantId: string) {
  // Load tenant
  const tenant = await this.tenantService.getById(tenantId);

  if (!tenant) {
    this.notification.error('Tenant not found');
    return;
  }

  // Set as current tenant
  this.tenantService.setCurrentTenant(tenant);

  // Load permissions for this tenant
  await this.permissionService.loadUserPermissions(
    this.currentUser.uid,
    tenantId
  );

  // Reload dashboard with new tenant context
  this.router.navigate(['/dashboard']);
}
```

### 7. **Manage User Roles**

```typescript
// Assign role to user
await this.permissionService.assignRoleToUser(
  userId,
  tenantId,
  roleId,
  this.currentUser.uid
);

// Remove user from tenant
await this.permissionService.removeUserFromTenant(userId, tenantId);

// Get all users in tenant
const users = await this.permissionService.getTenantUsers(tenantId);
```

### 8. **Upgrade Tenant Plan**

```typescript
await this.tenantService.upgradePlan(tenantId, 'premium');

// Check new limits
const canAdd = await this.tenantService.canAddUser(tenantId);
const canCreate = await this.tenantService.canCreateInvoice(tenantId);
```

---

## 📋 Plan Limits

| Feature | Free | Basic | Premium | Enterprise |
|---------|------|-------|---------|------------|
| Max Users | 2 | 5 | 15 | Unlimited |
| Invoices/Month | 50 | 200 | 1,000 | Unlimited |
| Estimates | ✅ | ✅ | ✅ | ✅ |
| Multi-Currency | ❌ | ✅ | ✅ | ✅ |
| Advanced Reports | ❌ | ❌ | ✅ | ✅ |
| WhatsApp Integration | ❌ | ✅ | ✅ | ✅ |
| SMS Notifications | ❌ | ❌ | ✅ | ✅ |
| Custom Fields | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |

---

## 🔧 Services Reference

### **TenantService**
```typescript
// CRUD Operations
createTenant(tenant): Promise<string>
getById(id): Promise<Tenant>
getAllTenants(): Promise<Tenant[]>
update(id, updates): Promise<void>
delete(id): Promise<void>

// Status Management
suspend(id, reason): Promise<void>
activate(id): Promise<void>

// Plan Management
upgradePlan(id, plan): Promise<void>

// Limits & Features
canAddUser(tenantId): Promise<boolean>
canCreateInvoice(tenantId): Promise<boolean>
isFeatureEnabled(feature): boolean

// Statistics
getTenantStats(tenantId): Promise<TenantStats>
```

### **PermissionService**
```typescript
// Permission Checks
hasPermission(permission): boolean
hasAnyPermission(permissions[]): boolean
hasAllPermissions(permissions[]): boolean

// Role Management
createRole(role): Promise<string>
updateRole(roleId, updates): Promise<void>
deleteRole(roleId): Promise<void>
getRolesByTenant(tenantId): Promise<Role[]>

// User-Role Assignment
assignRoleToUser(userId, tenantId, roleId): Promise<void>
removeUserFromTenant(userId, tenantId): Promise<void>
getTenantUsers(tenantId): Promise<UserTenantRole[]>

// Setup
createDefaultRoles(tenantId, createdBy): Promise<void>
loadUserPermissions(userId, tenantId): Promise<void>
```

---

## 🚀 Migration Steps

### From Old System to Multi-Tenant

1. **Update existing companies to tenants**:
```typescript
// Run migration script
const companies = await companyService.getAll();
for (const company of companies) {
  await tenantService.createTenant({
    ...company,
    tenantCode: await generateCode(company.name),
    status: 'active',
    plan: 'free',
    maxUsers: 2,
    maxInvoicesPerMonth: 50,
    features: getPlanFeatures('free')
  });
}
```

2. **Migrate user-company relationships**:
```typescript
const users = await userService.getAll();
for (const user of users) {
  for (const companyId of user.companies) {
    await permissionService.assignRoleToUser(
      user.uid,
      companyId,
      adminRoleId,  // Make existing users admins
      'system'
    );
  }
}
```

3. **Update all service calls** to use new tenant-aware methods

---

## 🎨 Customization

### Tenant-Specific Branding
```typescript
// Set custom colors
await tenantService.update(tenantId, {
  branding: {
    primaryColor: '#FF5733',
    secondaryColor: '#33FF57',
    fontFamily: 'Arial',
    customCSS: '.invoice { border: 2px solid blue; }'
  }
});

// Apply branding in component
const tenant = this.tenantService.getCurrentTenantValue();
document.documentElement.style.setProperty(
  '--primary-color',
  tenant.branding.primaryColor
);
```

---

## 📈 Best Practices

1. **Always check permissions before actions**
```typescript
if (!this.permissionService.hasPermission(Permission.DELETE_INVOICE)) {
  return;
}
```

2. **Check feature availability**
```typescript
if (!this.tenantService.isFeatureEnabled('multiCurrency')) {
  this.notification.warning('Upgrade to enable this feature');
  return;
}
```

3. **Enforce limits**
```typescript
if (!(await this.tenantService.canCreateInvoice(tenantId))) {
  this.notification.error('Monthly invoice limit reached. Upgrade your plan.');
  return;
}
```

4. **Load permissions on tenant switch**
```typescript
await this.permissionService.loadUserPermissions(userId, newTenantId);
```

5. **Use permission directive in templates**
```html
<button *hasPermission="'create_invoice'">Create</button>
```

---

## 🔒 Security Considerations

1. **Data Isolation**: All queries filtered by tenantId
2. **Permission Guards**: Routes protected by PermissionGuard
3. **Feature Gates**: Features disabled if plan doesn't allow
4. **Limit Enforcement**: Automatic checks before operations
5. **Audit Trail**: All tenant changes logged with user and timestamp

---

## 📚 Further Reading

- [Firestore Security Rules for Multi-Tenancy](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [RBAC Best Practices](https://auth0.com/docs/manage-users/access-control/rbac)
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models)

---

## 🆘 Support

For questions or issues:
1. Check this guide
2. Review code examples in services
3. Check permission and tenant models
4. Review Firestore data structure

---

**Happy Multi-Tenanting! 🎉**
