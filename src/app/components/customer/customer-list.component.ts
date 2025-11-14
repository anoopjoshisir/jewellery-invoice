import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CustomerService } from '../../core/services/customer.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Customer } from '../../core/models/customer.model';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MainLayoutComponent],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  form: FormGroup;
  selectedId: string | null = null;
  isLoading = false;
  isSaving = false;
  searchTerm = '';

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private companyContext: CompanyContextService,
    private auth: AuthService,
    private notification: NotificationService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      address: [''],
      mobile: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.email]]
    });
  }

  async ngOnInit() {
    await this.loadCustomers();
  }

  async loadCustomers() {
    try {
      this.isLoading = true;
      const companyId = this.companyContext.getSelectedCompanyValue() || "";

      if (!companyId) {
        this.notification.error('No company selected. Please select a company first.');
        return;
      }

      this.customers = await this.customerService.getByCompany(companyId);
      this.filteredCustomers = [...this.customers];
      this.applyFilter();
    } catch (error) {
      console.error('Error loading customers:', error);
      this.notification.error('Failed to load customers. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  applyFilter() {
    if (!this.searchTerm.trim()) {
      this.filteredCustomers = [...this.customers];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredCustomers = this.customers.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.mobile && c.mobile.includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  }

  async save() {
    if (!this.form.valid) {
      this.notification.error('Please fill all required fields correctly.');
      this.markFormGroupTouched(this.form);
      return;
    }

    try {
      this.isSaving = true;
      const user = this.auth.currentUser;
      const companyId = this.companyContext.getSelectedCompanyValue();

      if (!user) {
        this.notification.error('User not authenticated. Please login again.');
        return;
      }

      if (!companyId) {
        this.notification.error('No company selected. Please select a company first.');
        return;
      }

      if (this.selectedId) {
        await this.customerService.update(this.selectedId, this.form.value);
        this.notification.success('Customer updated successfully!');
      } else {
        await this.customerService.add({
          ...this.form.value,
          companyId,
          entryDate: new Date().toISOString(),
          enteredBy: user.uid,
          enteredByName: user.displayName || user.name || "",
          enteredByIp: await this.auth.getIp()
        });
        this.notification.success('Customer added successfully!');
      }

      this.form.reset();
      this.selectedId = null;
      await this.loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      this.notification.error('Failed to save customer. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }

  edit(c: Customer) {
    this.form.patchValue(c);
    this.selectedId = c.id || null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.form.reset();
    this.selectedId = null;
  }

  async remove(id: string, customerName: string) {
    if (!confirm(`Are you sure you want to delete customer "${customerName}"?`)) {
      return;
    }

    try {
      await this.customerService.delete(id);
      this.notification.success('Customer deleted successfully!');
      await this.loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      this.notification.error('Failed to delete customer. Please try again.');
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control && control.touched && control.errors) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['minlength']) return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['email']) return 'Invalid email format';
      if (control.errors['pattern']) return 'Invalid mobile number (10 digits required)';
    }
    return '';
  }
}