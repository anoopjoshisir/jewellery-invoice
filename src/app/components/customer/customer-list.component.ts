import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CustomerService } from '../../core/services/customer.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { AuthService } from '../../core/services/auth.service'; // implement getIp() and user
import { Customer } from '../../core/models/customer.model';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,MainLayoutComponent],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  form: FormGroup;
  selectedId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private companyContext: CompanyContextService,
    private auth: AuthService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      address: [''],
      mobile: [''],
      email: ['']
    });
  }

  async ngOnInit() {
    await this.loadCustomers();
  }

  async loadCustomers() {
    const companyId = this.companyContext.getSelectedCompanyValue() || "";
    this.customers = await this.customerService.getByCompany(companyId);
  }

  async save() {
    if (!this.form.valid) return;
    const user = this.auth.currentUser;
    const companyId = this.companyContext.getSelectedCompanyValue();
    if (this.selectedId) {
      await this.customerService.update(this.selectedId, this.form.value);
    } else {
      await this.customerService.add({
        ...this.form.value,
        companyId,
        entryDate: new Date().toISOString(),
        enteredBy: user?.uid,
        enteredByName: user?.displayName,
        enteredByIp: await this.auth.getIp()
      });
    }
    this.form.reset();
    this.selectedId = null;
    await this.loadCustomers();
  }

  edit(c: Customer) {
    this.form.patchValue(c);
    this.selectedId = c.id || null;
  }

  async remove(id: string) {
    await this.customerService.delete(id);
    await this.loadCustomers();
  }
}