import { Component, OnInit } from '@angular/core';
import { CompanyContextService } from '../../core/services/company-context.service';
import { CompanyService } from '../../core/services/company.service';
import { CustomerService } from '../../core/services/customer.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { Company } from '../../core/models/company.model';
import { Customer } from '../../core/models/customer.model';
import { Invoice } from '../../core/models/invoice.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainLayoutComponent } from '../main-layout/main-layout.component';
import { filter, forkJoin, switchMap } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  company: Company | null = null;
  customers: Customer[] = [];
  invoices: Invoice[] = [];
  totalSales = 0;
  totalReceivables = 0;
  latestInvoices: Invoice[] = [];
  loading = true;

  constructor(
    private companyContext: CompanyContextService,
    private companyService: CompanyService,
    private customerService: CustomerService,
    private invoiceService: InvoiceService
  ) { }

  ngOnInit() {
  this.loading = true;
  this.companyContext.getSelectedCompany().pipe(
    filter(id => !!id), // ignore blank IDs
    switchMap(companyId =>
      forkJoin({
        companies: this.companyService.getByIds([companyId || ""]),
        customers: this.customerService.getByCompany(companyId || ""),
        invoices: this.invoiceService.getByCompany(companyId || "")
      })
    )
  ).subscribe(({ companies, customers, invoices }) => {
    this.company = companies[0] || null;
    this.customers = customers;
    this.invoices = invoices;
    this.totalSales = this.invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    this.totalReceivables = this.invoices.reduce((sum, inv) => sum + Math.max((inv.grandTotal || 0) - (inv.amountPaid || 0), 0), 0);
    this.latestInvoices = [...this.invoices]
      .sort((a, b) => (b.billDate > a.billDate ? 1 : -1))
      .slice(0, 5);
    this.loading = false;
  });
}
  // async ngOnInit() {
  //   this.loading = true;
  //   this.companyContext.getSelectedCompany().subscribe(id => {
  //     const companyId = id;
  //     // Optionally: Only run logic if id is not blank      
  //     if (companyId != "") {
  //       const [companies, customers, invoices] = await Promise.all([
  //         this.companyService.getByIds([companyId]),
  //         this.customerService.getByCompany(companyId),
  //         this.invoiceService.getByCompany(companyId)
  //       ]);
  //       this.company = companies[0] || null;
  //       this.customers = customers;
  //       this.invoices = invoices;

  //       this.totalSales = this.invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  //       this.totalReceivables = this.invoices.reduce((sum, inv) => sum + Math.max((inv.grandTotal || 0) - (inv.amountPaid || 0), 0), 0);
  //       this.latestInvoices = [...this.invoices]
  //         .sort((a, b) => (b.billDate > a.billDate ? 1 : -1))
  //         .slice(0, 5);
  //     }
      
  //   });
  //   this.loading = false;

  // }
}