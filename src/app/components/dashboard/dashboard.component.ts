import { AfterViewInit, Component, OnInit } from '@angular/core';
import { InvoiceService } from '../../core/services/invoice.service';
import { Invoice } from '../../core/models/invoice.model';
import { MatDialog } from '@angular/material/dialog';
import { InvoicePrintComponent } from '../print/invoice-print.component';
import { CompanyContextService } from '../../core/services/company-context.service';
import { NotificationService } from '../../core/services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  years: number[] = [];
  months: { value: number, name: string }[] = [
    { value: 0, name: 'All' },
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];
  selectedYear: number = 0;
  selectedMonth: number = 0;
  totalSales = 0;
  invoiceCount = 0;
  outstanding = 0;
  loading = true;
  recentInvoices: Invoice[] = [];

  companyId = ''; // should be set based on logged-in user's company

  constructor(
    private invoiceService: InvoiceService,
    private companyContext: CompanyContextService,
    private dialog: MatDialog,
    private notification: NotificationService
  ) {
    this.companyId = this.companyContext.getSelectedCompanyValue() || "";
  }
  async ngAfterViewInit() {
    await this.fetchInvoices();
  }

  async ngOnInit() {
    await this.getAvailableYears();
    this.loading = false;
  }

  async getAvailableYears() {
    this.years.push(new Date().getFullYear());
    this.years.push(new Date().getFullYear() - 1);
    this.years.push(new Date().getFullYear() - 2);
    this.years.push(new Date().getFullYear() - 3);
    this.selectedYear = new Date().getFullYear();
    this.selectedMonth = new Date().getMonth() + 1;

    // Optionally, you can make a Firestore call to only get available years for invoices (e.g., with an index/minimal projection query)
    // For simplicity, we fetch all invoice dates (shallow data) once, then filter in the app.
    // const invoiceDates = await this.invoiceService.getInvoiceDates(this.companyId); // only returns [{billDate: '2024-06-01'}, ...]
    // const yearsSet = new Set<number>();
    // invoiceDates.forEach((i: { billDate: string | number | Date; }) => {
    //   if (i.billDate) yearsSet.add(new Date(i.billDate).getFullYear());
    // });
    // this.years = Array.from(yearsSet).sort((a, b) => b - a);
    // this.selectedYear = this.years[0] || new Date().getFullYear();
  }

  async fetchInvoices() {
    try {
      this.loading = true;

      if (!this.companyId) {
        this.notification.error('No company selected. Please select a company first.');
        return;
      }

      // Fetch only filtered invoices from Firestore
      this.invoices = await this.invoiceService.getInvoicesByYearMonth(
        this.companyId,
        this.selectedYear,
        this.selectedMonth
      );
      this.updateDashboardStats();
    } catch (error) {
      console.error('Error fetching invoices:', error);
      this.notification.error('Failed to load invoices. Please try again.');
      this.invoices = [];
      this.updateDashboardStats();
    } finally {
      this.loading = false;
    }
  }

  updateDashboardStats() {
    this.filteredInvoices = this.invoices.slice();
    this.invoiceCount = this.filteredInvoices.length;
    this.totalSales = this.filteredInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
    this.outstanding = this.filteredInvoices.reduce((sum, i) => sum + ((i.grandTotal || 0) - (i.amountPaid || 0)), 0);
    this.recentInvoices = this.filteredInvoices.slice().sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime()).slice(0, 5);
  }

  onYearChange() {
    this.fetchInvoices();
  }

  onMonthChange() {
    this.fetchInvoices();
  }

  openInvoiceDetail(invoice: Invoice) {
    this.dialog.open(InvoicePrintComponent, {
            width: '95vw',
            maxWidth: '900px',
            height: '90vh',
            panelClass: 'invoice-dialog-panel',
            data: { invoice, type: 'normal', exportMode: false }
        });
  }

}