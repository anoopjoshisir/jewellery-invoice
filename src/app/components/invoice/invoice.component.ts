import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Customer } from '../../core/models/customer.model';
import { Company } from '../../core/models/company.model';
import { Invoice } from '../../core/models/invoice.model';
import { CustomerService } from '../../core/services/customer.service';
import { CompanyService } from '../../core/services/company.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

type DiscountType = 'percent' | 'fixedPerPiece' | 'fixedBill';

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,MainLayoutComponent],
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.scss']
})
export class InvoiceComponent implements OnInit {
  customers: Customer[] = [];
  companies: Company[] = [];
  filteredCustomers: Customer[] = [];
  filteredCompanies: Company[] = [];

  invoiceForm: FormGroup;
  showCustomerPopup = false;
  showCompanyPopup = false;
  manualBillNo:boolean = false;
  company: Company | null = null;

  discountTypes = [
    { label: '% (on making charges)', value: 'percent' },
    { label: 'Fixed per piece', value: 'fixedPerPiece' },
    { label: 'Fixed on bill', value: 'fixedBill' }
  ];

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private companyService: CompanyService,
    private invoiceService: InvoiceService,
    private companyContext: CompanyContextService,
    private auth: AuthService
  ) {
    this.invoiceForm = this.fb.group({
      billNo: ['', Validators.required],
      billDate: [this.formatDate(new Date()), Validators.required],
      dueDate: [this.formatDate(this.addDays(new Date(), 30)), Validators.required],
      customer: [null, Validators.required],
      company: [null, Validators.required],
      discountOnGoldWeight: [0],
      discountType: ['percent'],
      discountValue: [0],
      items: this.fb.array([]),
      remarks:[''],
      payments: this.fb.array([])
    });
  }

  async ngOnInit() {
    const companyId = this.companyContext.getSelectedCompanyValue() || "";
    this.customers = await this.customerService.getByCompany(companyId);
    this.filteredCustomers = [...this.customers];
    this.companies = await this.companyService.getByIds([companyId]);
    this.company = this.companies[0] || null;
    this.filteredCompanies = [...this.companies];
    this.invoiceForm.patchValue({ company: this.company });

    this.addItem();
  }

  get items(): FormArray { return this.invoiceForm.get('items') as FormArray; }
  get payments(): FormArray { return this.invoiceForm.get('payments') as FormArray; }

  addItem() {
    this.items.push(this.fb.group({
      name: ['', Validators.required],
      purity: [''],
      qty: [1, [Validators.required]],
      rate: [0, Validators.required],
      makingCharges: [0, Validators.required]
    }));
  }
  removeItem(i: number) { if (this.items.length > 1) this.items.removeAt(i); }

  addPayment() {
    this.payments.push(this.fb.group({
      date: [this.formatDate(new Date()), Validators.required],
      amount: [0, Validators.required],
      mode: ['cash'],
      note: ['']
    }));
  }
  removePayment(i: number) { this.payments.removeAt(i); }

  openCustomerPopup() {
    this.showCustomerPopup = true;
    this.filteredCustomers = [...this.customers];
  }
  selectCustomer(c: Customer) {
    this.invoiceForm.patchValue({ customer: c });
    this.showCustomerPopup = false;
  }
  filterCustomers(term: any) {
    this.filteredCustomers = this.customers.filter(c =>
      c.name.toLowerCase().includes(term.value.toLowerCase()) ||
      (c.mobile && c.mobile.includes(term.value))
    );
  }

  openCompanyPopup() {
    this.showCompanyPopup = true;
    this.filteredCompanies = [...this.companies];
  }
  selectCompany(c: Company) {
    this.invoiceForm.patchValue({ company: c });
    this.showCompanyPopup = false;
  }
  filterCompanies(term: any) {
    this.filteredCompanies = this.companies.filter(c =>
      c.name.toLowerCase().includes(term.value.toLowerCase()) ||
      (c.mobile && c.mobile.includes(term.value))
    );
  }

  get total(): number {
    return this.items.controls
      .map(ctrl => (Number(ctrl.get('qty')?.value) || 0) * (Number(ctrl.get('rate')?.value) || 0))
      .reduce((a, b) => a + b, 0);
  }
  get discountOnGoldWeight(): number {
    return Number(this.invoiceForm.get('discountOnGoldWeight')?.value) || 0;
  }
  get makingCharges(): number {
    return this.items.controls
      .map(ctrl => Number(ctrl.get('makingCharges')?.value) || 0)
      .reduce((a, b) => a + b, 0);
  }
  get makingDiscount(): number {
    const type: DiscountType = this.invoiceForm.get('discountType')?.value;
    const value: number = +this.invoiceForm.get('discountValue')?.value || 0;
    if (type === 'percent') return this.makingCharges * (value / 100);
    if (type === 'fixedPerPiece') return this.items.length * value;
    if (type === 'fixedBill') return value;
    return 0;
  }
  get totalDiscount(): number {
    return this.discountOnGoldWeight + this.makingDiscount;
  }
  get grandTotal(): number {
    return this.total + this.makingCharges - this.totalDiscount;
  }
  get amountPaid(): number {
    return this.payments.controls
      .map(ctrl => Number(ctrl.get('amount')?.value) || 0)
      .reduce((a, b) => a + b, 0);
  }

  async saveInvoice() {
    if (this.invoiceForm.invalid) return;
    const form = this.invoiceForm.value;
    let billNo = form.billNo;
    if (!this.manualBillNo) {
      billNo = await this.invoiceService.generateNextBillNo(
        this.companyContext.getSelectedCompanyValue()||"",
        new Date(form.billDate).getFullYear()
      );
    }
    const user = this.auth.currentUser;
    const ip = await this.auth.getIp();
    const invoice: Invoice = {
      billNo,
      customer: form.customer,
      company: form.company,
      billDate: form.billDate,
      dueDate: form.dueDate,
      items: form.items,
      payments: form.payments,
      makingCharges: this.makingCharges,
      makingDiscount: this.makingDiscount,
      discountType: form.discountType,
      discountValue: form.discountValue,
      total: this.total,
      discountOnGoldWeight: this.discountOnGoldWeight,
      totalDiscount: this.totalDiscount,
      amountPaid: this.amountPaid,
      grandTotal: this.grandTotal,
      entryDate: new Date().toISOString(),
      enteredBy: user?.uid || "",
      enteredByName: user?.displayName || "",
      enteredByIp: ip,
      remarks:form.remarks
    };
    await this.invoiceService.add(invoice);
    this.invoiceForm.reset({
      billDate: this.formatDate(new Date()),
      dueDate: this.formatDate(this.addDays(new Date(), 30)),
      discountType: 'percent',
      discountValue: 0,
      discountOnGoldWeight: 0
    });
    this.items.clear(); this.addItem();
    this.payments.clear();
    alert('Invoice saved!');
  }

  formatDate(date: Date): string {
    return date.toISOString().substring(0, 10);
  }
  addDays(date: Date, days: number): Date {
    const d = new Date(date.valueOf());
    d.setDate(d.getDate() + days);
    return d;
  }
}