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

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'company', component: CompanyComponent },
  { path: 'customers', component: CustomerListComponent },
  { path: 'invoices', component: InvoiceComponent },
  { path: 'ledger', component: LedgerComponent },
  { path: 'payment', component: PaymentComponent },
  { path: 'user', component: UserComponent },
  { path: 'print/:invoiceId', component: InvoicePrintComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];

//,canActivate: [AuthGuard]