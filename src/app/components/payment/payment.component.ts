import { Component, OnInit } from '@angular/core';
import { InvoiceService } from '../../core/services/invoice.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { CompanyService } from '../../core/services/company.service';
import { CustomerService } from '../../core/services/customer.service';
import { Invoice } from '../../core/models/invoice.model';
import { Company } from '../../core/models/company.model';
import { Customer } from '../../core/models/customer.model';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../main-layout/main-layout.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MainLayoutComponent],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit {
  invoices: Invoice[] = [];
  allInvoices: Invoice[] = [];
  customers: Customer[] = [];
  selectedCustomerId: string = '';
  selectedInvoice: Invoice | null = null;
  paymentForm: FormGroup;
  company: Company | null = null;
  loading = false;

  constructor(
    private invoiceService: InvoiceService,
    private companyContext: CompanyContextService,
    private companyService: CompanyService,
    private customerService: CustomerService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.paymentForm = this.fb.group({
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      mode: ['cash'],
      note: ['']
    });
  }

  async ngOnInit() {
    this.loading = true;
    const companyId = this.companyContext.getSelectedCompanyValue() || '';
    this.customers = await this.customerService.getByCompany(companyId);
    this.allInvoices = await this.invoiceService.getByCompany(companyId);
    this.invoices = this.allInvoices;
    const companies = await this.companyService.getByIds([companyId]);
    this.company = companies[0] || null;
    this.loading = false;
  }

  selectCustomer(customer: Customer) {
    this.selectedCustomerId = customer.id || "";
    this.invoices = this.allInvoices.filter(
      inv => inv.customer?.id === this.selectedCustomerId
    );
    this.selectedInvoice = null;
  }

  getCustomerBalance(customer: Customer): number {
    return this.allInvoices
      .filter(inv => inv.customer?.id === customer.id)
      .reduce((sum, inv) => sum + this.getInvoiceBalance(inv), 0);
  }

  getInvoiceBalance(inv: Invoice): number {
    return (inv.grandTotal || 0) - (inv.amountPaid || 0);
  }

  selectInvoice(inv: Invoice) {
    this.selectedInvoice = inv;
    this.paymentForm.patchValue({
      amount: this.getInvoiceBalance(inv),
      note: '',
      mode: 'cash',
      date: new Date().toISOString().substring(0, 10)
    });
  }

  async savePayment() {
    if (!this.selectedInvoice || !this.paymentForm.valid) return;
    const invoice = { ...this.selectedInvoice };
    invoice.payments = [...(invoice.payments || []), this.paymentForm.value];
    invoice.amountPaid = invoice.payments.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    await this.invoiceService.update(invoice.id!, {
      payments: invoice.payments,
      amountPaid: invoice.amountPaid
    });
    // Update the invoice in the local array
    const idx = this.allInvoices.findIndex(i => i.id === invoice.id);
    if (idx >= 0) this.allInvoices[idx] = invoice;
    this.invoices = this.selectedCustomerId
      ? this.allInvoices.filter(inv => inv.customer?.id === this.selectedCustomerId)
      : this.allInvoices;
    this.selectedInvoice = invoice;
    this.paymentForm.reset({
      date: new Date().toISOString().substring(0, 10),
      amount: 0,
      mode: 'cash',
      note: ''
    });
  }

  get selectedCustomerName(): string {
    const c = this.customers.find(c => c.id === this.selectedCustomerId);
    return c ? c.name : '';
  }

  printInvoice() {
    if (this.selectedInvoice?.id) {
      this.router.navigate(['/print', this.selectedInvoice.id]);
    }
  }
}