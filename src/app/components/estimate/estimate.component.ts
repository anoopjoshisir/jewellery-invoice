import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Customer } from '../../core/models/customer.model';
import { Company } from '../../core/models/company.model';
import { Estimate } from '../../core/models/estimate.model';
import { CustomerService } from '../../core/services/customer.service';
import { CompanyService } from '../../core/services/company.service';
import { EstimateService } from '../../core/services/estimate.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

type DiscountType = 'percent' | 'fixedPerPiece' | 'fixedBill';

@Component({
  selector: 'app-estimate',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MainLayoutComponent],
  templateUrl: './estimate.component.html',
  styleUrls: ['./estimate.component.scss']
})
export class EstimateComponent implements OnInit {
  customers: Customer[] = [];
  companies: Company[] = [];
  filteredCustomers: Customer[] = [];
  filteredCompanies: Company[] = [];

  estimateForm: FormGroup;
  showCustomerPopup = false;
  showCompanyPopup = false;
  manualEstimateNo: boolean = false;
  company: Company | null = null;
  isLoading = false;
  isSaving = false;

  discountTypes = [
    { label: '% (on making charges)', value: 'percent' },
    { label: 'Fixed per piece', value: 'fixedPerPiece' },
    { label: 'Fixed on bill', value: 'fixedBill' }
  ];

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private companyService: CompanyService,
    private estimateService: EstimateService,
    private companyContext: CompanyContextService,
    private auth: AuthService,
    private notification: NotificationService
  ) {
    this.estimateForm = this.fb.group({
      estimateNo: ['', Validators.required],
      estimateDate: [this.formatDate(new Date()), Validators.required],
      validUntil: [this.formatDate(this.addDays(new Date(), 30)), Validators.required],
      customer: [null, Validators.required],
      company: [null, Validators.required],
      discountOnGoldWeight: [0],
      discountType: ['percent'],
      discountValue: [0],
      items: this.fb.array([]),
      remarks: ['']
    });
  }

  async ngOnInit() {
    try {
      this.isLoading = true;
      const companyId = this.companyContext.getSelectedCompanyValue() || "";

      if (!companyId) {
        this.notification.error('No company selected. Please select a company first.');
        return;
      }

      this.customers = await this.customerService.getByCompany(companyId);
      this.filteredCustomers = [...this.customers];
      this.companies = await this.companyService.getByIds([companyId]);
      this.company = this.companies[0] || null;
      this.filteredCompanies = [...this.companies];
      this.estimateForm.patchValue({ company: this.company });

      this.addItem();
    } catch (error) {
      console.error('Error loading estimate form:', error);
      this.notification.error('Failed to load estimate form. Please refresh the page.');
    } finally {
      this.isLoading = false;
    }
  }

  get items(): FormArray { return this.estimateForm.get('items') as FormArray; }

  addItem() {
    this.items.push(this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      purity: [''],
      qty: [1, [Validators.required, Validators.min(0.01), Validators.max(100000)]],
      rate: [0, [Validators.required, Validators.min(0)]],
      makingCharges: [0, [Validators.required, Validators.min(0)]]
    }));
  }

  removeItem(i: number) { if (this.items.length > 1) this.items.removeAt(i); }

  openCustomerPopup() {
    this.showCustomerPopup = true;
    this.filteredCustomers = [...this.customers];
  }

  selectCustomer(c: Customer) {
    this.estimateForm.patchValue({ customer: c });
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
    this.estimateForm.patchValue({ company: c });
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
    return Number(this.estimateForm.get('discountOnGoldWeight')?.value) || 0;
  }

  get makingCharges(): number {
    return this.items.controls
      .map(ctrl => Number(ctrl.get('makingCharges')?.value) || 0)
      .reduce((a, b) => a + b, 0);
  }

  get makingDiscount(): number {
    const type: DiscountType = this.estimateForm.get('discountType')?.value;
    const value: number = +this.estimateForm.get('discountValue')?.value || 0;
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

  async saveEstimate() {
    // Validate form
    if (this.estimateForm.invalid) {
      this.notification.error('Please fill all required fields correctly.');
      return;
    }

    // Validate at least one item
    if (this.items.length === 0) {
      this.notification.error('Please add at least one item to the estimate.');
      return;
    }

    // Validate customer selected
    const form = this.estimateForm.value;
    if (!form.customer) {
      this.notification.error('Please select a customer.');
      return;
    }

    // Validate company selected
    if (!form.company) {
      this.notification.error('Please select a company.');
      return;
    }

    try {
      this.isSaving = true;

      let estimateNo = form.estimateNo;
      if (!this.manualEstimateNo) {
        estimateNo = await this.estimateService.generateNextEstimateNo(
          this.companyContext.getSelectedCompanyValue() || "",
          new Date(form.estimateDate).getFullYear()
        );
      }

      const user = this.auth.currentUser;
      if (!user) {
        this.notification.error('User not authenticated. Please login again.');
        return;
      }

      const ip = await this.auth.getIp();
      const estimate: Estimate = {
        estimateNo,
        customer: form.customer,
        company: form.company,
        estimateDate: form.estimateDate,
        validUntil: form.validUntil,
        items: form.items,
        makingCharges: this.makingCharges,
        makingDiscount: this.makingDiscount,
        discountType: form.discountType,
        discountValue: form.discountValue,
        total: this.total,
        discountOnGoldWeight: this.discountOnGoldWeight,
        totalDiscount: this.totalDiscount,
        grandTotal: this.grandTotal,
        status: 'pending',
        remarks: form.remarks,
        entryDate: new Date().toISOString(),
        enteredBy: user.uid,
        enteredByName: user.displayName || user.name || "",
        enteredByIp: ip
      };

      await this.estimateService.add(estimate);

      // Reset form
      this.estimateForm.reset({
        estimateDate: this.formatDate(new Date()),
        validUntil: this.formatDate(this.addDays(new Date(), 30)),
        discountType: 'percent',
        discountValue: 0,
        discountOnGoldWeight: 0,
        company: this.company
      });
      this.items.clear();
      this.addItem();

      this.notification.success(`Estimate ${estimateNo} saved successfully!`);
    } catch (error) {
      console.error('Error saving estimate:', error);
      this.notification.error('Failed to save estimate. Please try again.');
    } finally {
      this.isSaving = false;
    }
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
