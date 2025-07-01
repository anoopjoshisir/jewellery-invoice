import { Component, OnInit } from '@angular/core';
import { InvoiceService } from '../../core/services/invoice.service';
import { CustomerService } from '../../core/services/customer.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { CompanyService } from '../../core/services/company.service';
import { Invoice, Payment } from '../../core/models/invoice.model';
import { Customer } from '../../core/models/customer.model';
import { Company } from '../../core/models/company.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

interface LedgerEntry {
  date: string;
  type: 'Invoice' | 'Payment';
  details: string;
  credit: number;
  debit: number;
  balance: number;
}

@Component({
  selector: 'app-ledger',
  standalone:true,
  imports:[CommonModule,FormsModule,MainLayoutComponent],
  templateUrl: './ledger.component.html',
  styleUrls: ['./ledger.component.scss']
})
export class LedgerComponent implements OnInit {
  invoices: Invoice[] = [];
  allInvoices: Invoice[] = [];
  customers: Customer[] = [];
  selectedCustomerId: string = '';
  selectedCustomer: Customer | null = null;
  ledger: LedgerEntry[] = [];
  company: Company | null = null;

  constructor(
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
    private companyContext: CompanyContextService,
    private companyService: CompanyService,
  ) {}

  async ngOnInit() {
    const companyId = this.companyContext.getSelectedCompanyValue() || "";
    this.customers = await this.customerService.getByCompany(companyId);
    this.allInvoices = await this.invoiceService.getByCompany(companyId);
    this.invoices = this.allInvoices;
    const companies = await this.companyService.getByIds([companyId]); 
    this.company = companies[0] || null;
    this.buildLedger();
  }

  filterByCustomer() {
    if (!this.selectedCustomerId) {
      this.invoices = this.allInvoices;
      this.selectedCustomer = null;
    } else {
      this.invoices = this.allInvoices.filter(
        inv => inv.customer?.id === this.selectedCustomerId
      );
      this.selectedCustomer = this.customers.find(c => c.id === this.selectedCustomerId) || null;
    }
    this.buildLedger();
  }

  /** Build the running ledger (sorted by date, invoice and payments interleaved) */
  buildLedger() {
    // Flatten all invoice and payment rows, sort by date, and compute running balance
    const entries: LedgerEntry[] = [];
    let balance = 0;
    // Collect all invoice and payment events
    type LedgerSource = { date: string, type: 'Invoice', invoice: Invoice } | { date: string, type: 'Payment', payment: Payment, invoice: Invoice };
    const ledgerSources: LedgerSource[] = [];

    for (const inv of this.invoices) {
      ledgerSources.push({ date: inv.billDate, type: 'Invoice', invoice: inv });
      for (const pmt of (inv.payments || [])) {
        ledgerSources.push({ date: pmt.date, type: 'Payment', payment: pmt, invoice: inv });
      }
    }

    // Sort by date (and type: Invoice before Payment on same day)
    ledgerSources.sort((a, b) => {
      const ad = a.date, bd = b.date;
      if (ad < bd) return -1;
      if (ad > bd) return 1;
      if (a.type === b.type) return 0;
      return a.type === 'Invoice' ? -1 : 1;
    });

    for (const entry of ledgerSources) {
      if (entry.type === 'Invoice') {
        balance += entry.invoice.grandTotal;
        entries.push({
          date: entry.invoice.billDate,
          type: 'Invoice',
          details: `Invoice #${entry.invoice.billNo}`,
          credit: entry.invoice.grandTotal,
          debit: 0,
          balance
        });
      } else {
        balance -= entry.payment.amount;
        entries.push({
          date: entry.payment.date,
          type: 'Payment',
          details: `${entry.payment.mode}${entry.payment.note ? ' (' + entry.payment.note + ')' : ''} for Invoice #${entry.invoice.billNo}`,
          credit: 0,
          debit: entry.payment.amount,
          balance
        });
      }
    }
    this.ledger = entries;
  }
}