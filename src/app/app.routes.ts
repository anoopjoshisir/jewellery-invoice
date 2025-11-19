import { Routes } from '@angular/router';
import { CustomerListComponent } from './components/customer/customer-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { NoteListComponent } from './components/note/note-list.component';
import { InvoiceComponent } from './components/invoice/invoice.component';
import { LedgerComponent } from './components/ledger/ledger.component';
import { AuthGuard } from './core/guards/auth.guard';
import { CompanyComponent } from './components/company/company.component';
import { InvoicePrintComponent } from './components/print/invoice-print.component';
import { UserComponent } from './components/user/user.component';
import { PaymentComponent } from './components/payment/payment.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { InvoiceListComponent } from './components/invoice-list/invoice-list.component';
import { EstimateComponent } from './components/estimate/estimate.component';
import { EstimateListComponent } from './components/estimate-list/estimate-list.component';
import { TenantOnboardingComponent } from './components/tenant-onboarding/tenant-onboarding.component';
import { SuperAdminComponent } from './components/super-admin/super-admin.component';
import { SuperAdminDashboardComponent } from './components/super-admin-dashboard/super-admin-dashboard.component';
import { TenantConfigEditorComponent } from './components/tenant-config-editor/tenant-config-editor.component';
import { TemplateManagerComponent } from './components/template-manager/template-manager.component';
import { AuditLogViewerComponent } from './components/audit-log-viewer/audit-log-viewer.component';
import { UsageMonitoringComponent } from './components/usage-monitoring/usage-monitoring.component';
import { RestaurantDashboardComponent } from './components/restaurant-dashboard/restaurant-dashboard.component';
import { TableManagementComponent } from './components/table-management/table-management.component';
import { MenuManagementComponent } from './components/menu-management/menu-management.component';
import { OrderManagementComponent } from './components/order-management/order-management.component';
import { KOTManagementComponent } from './components/kot-management/kot-management.component';
import { KitchenDisplaySystemComponent } from './components/kitchen-display-system/kitchen-display-system.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'company',
    component: CompanyComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'customers',
    component: CustomerListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'invoices',
    component: InvoiceComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'invoicelist',
    component: InvoiceListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'estimates',
    component: EstimateComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'estimatelist',
    component: EstimateListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'payment',
    component: PaymentComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'ledger', 
    component: LedgerComponent 
  },
  { 
    path: 'user', 
    component: UserComponent 
  },
  {
    path: 'print/:invoiceId',
    component: InvoicePrintComponent
  },
  {
    path: 'tenant-onboarding',
    component: TenantOnboardingComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'super-admin',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: SuperAdminDashboardComponent
      },
      {
        path: 'tenant-config/:id',
        component: TenantConfigEditorComponent
      },
      {
        path: 'templates',
        component: TemplateManagerComponent
      },
      {
        path: 'audit-logs',
        component: AuditLogViewerComponent
      },
      {
        path: 'usage-monitoring',
        component: UsageMonitoringComponent
      },
      // Legacy route for backwards compatibility
      {
        path: 'old',
        component: SuperAdminComponent
      }
    ]
  },
  // Restaurant Module Routes
  {
    path: 'restaurant',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: RestaurantDashboardComponent
      },
      {
        path: 'tables',
        component: TableManagementComponent
      },
      {
        path: 'menu',
        component: MenuManagementComponent
      },
      {
        path: 'orders',
        component: OrderManagementComponent
      },
      {
        path: 'kot',
        component: KOTManagementComponent
      },
      {
        path: 'kitchen-display',
        component: KitchenDisplaySystemComponent
      }
    ]
  },
  // Add more feature routes here as needed, using lazy loading for large modules:
  // {
  //   path: 'reports',
  //   loadChildren: () => import('./features/reports/reports.routes')
  //     .then(m => m.routes),
  //   canActivate: [AuthGuard]
  // },

  // Not found route
  { path: '**', component: NotFoundComponent }
];