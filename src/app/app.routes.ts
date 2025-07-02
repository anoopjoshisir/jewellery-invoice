import { Routes } from '@angular/router';
import { CustomerListComponent } from './components/customer/customer-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { NoteListComponent } from './components/note/note-list.component';
import { InvoiceComponent } from './components/invoice/invoice.component';
import { LedgerComponent } from './components/ledger/ledger.component';
import { AuthGuard } from './core/gaurds/auth.gaurd';
import { CompanyComponent } from './components/company/company.component';
import { InvoicePrintComponent } from './components/print/invoice-print.component';
import { UserComponent } from './components/user/user.component';
import { PaymentComponent } from './components/payment/payment.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { InvoiceListComponent } from './components/invoice-list/invoice-list.component';

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