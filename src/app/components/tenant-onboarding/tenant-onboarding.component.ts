import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TenantService } from '../../core/services/tenant.service';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SystemRoles } from '../../core/models/role.model';

@Component({
  selector: 'app-tenant-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tenant-onboarding.component.html',
  styleUrls: ['./tenant-onboarding.component.scss']
})
export class TenantOnboardingComponent implements OnInit {
  onboardingForm: FormGroup;
  currentStep = 1;
  totalSteps = 3;
  isSubmitting = false;
  selectedPlan: string = 'free';

  plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: [
        '2 Users',
        '50 Invoices/month',
        'Estimates',
        'Email Notifications',
        'Basic Support'
      ]
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 999,
      popular: false,
      features: [
        '5 Users',
        '200 Invoices/month',
        'All Free features',
        'Multi-Currency',
        'WhatsApp Integration',
        'Priority Support'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 2999,
      popular: true,
      features: [
        '15 Users',
        '1,000 Invoices/month',
        'All Basic features',
        'Advanced Reports',
        'SMS Notifications',
        'Custom Fields',
        'Dedicated Support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      features: [
        'Unlimited Users',
        'Unlimited Invoices',
        'All Premium features',
        'API Access',
        'Custom Integrations',
        'Dedicated Account Manager'
      ]
    }
  ];

  constructor(
    private fb: FormBuilder,
    private tenantService: TenantService,
    private permissionService: PermissionService,
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {
    this.onboardingForm = this.fb.group({
      // Step 1: Business Info
      name: ['', [Validators.required, Validators.minLength(2)]],
      slogan: [''],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],

      // Step 2: Business Details
      address: ['', Validators.required],
      gstin: ['', [Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)]],
      ownerName: ['', Validators.required],
      ownerPhone: ['', [Validators.pattern(/^[0-9]{10}$/)]],

      // Step 3: Plan Selection (handled separately)
    });
  }

  ngOnInit() {
    // Pre-fill owner info from current user
    const user = this.authService.currentUser;
    if (user) {
      this.onboardingForm.patchValue({
        ownerName: user.displayName || user.name,
        ownerPhone: user.phone,
        email: user.email
      });
    }
  }

  nextStep() {
    if (this.currentStep === 1) {
      // Validate step 1 fields
      const step1Fields = ['name', 'email', 'mobile'];
      if (this.areFieldsValid(step1Fields)) {
        this.currentStep++;
      } else {
        this.notification.error('Please fill all required fields correctly.');
        this.markFieldsAsTouched(step1Fields);
      }
    } else if (this.currentStep === 2) {
      // Validate step 2 fields
      const step2Fields = ['address', 'ownerName'];
      if (this.areFieldsValid(step2Fields)) {
        this.currentStep++;
      } else {
        this.notification.error('Please fill all required fields correctly.');
        this.markFieldsAsTouched(step2Fields);
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  selectPlan(planId: string) {
    this.selectedPlan = planId;
  }

  async submitOnboarding() {
    if (this.onboardingForm.invalid) {
      this.notification.error('Please fill all required fields correctly.');
      this.markFormAsTouched();
      return;
    }

    if (!this.selectedPlan) {
      this.notification.error('Please select a plan.');
      return;
    }

    try {
      this.isSubmitting = true;
      const user = this.authService.currentUser;

      if (!user) {
        this.notification.error('User not authenticated. Please login again.');
        return;
      }

      const formValue = this.onboardingForm.value;

      // Create tenant
      const tenantId = await this.tenantService.createTenant({
        name: formValue.name,
        slogan: formValue.slogan,
        email: formValue.email,
        mobile: formValue.mobile,
        address: formValue.address,
        gstin: formValue.gstin || '',
        ownerName: formValue.ownerName,
        ownerEmail: formValue.email,
        ownerPhone: formValue.ownerPhone,
        plan: this.selectedPlan as any,
        createdBy: user.uid
      });

      this.notification.success('Tenant created successfully!');

      // Create default system roles for this tenant
      await this.permissionService.createDefaultRoles(tenantId, user.uid);

      // Get the Tenant Admin role
      const roles = await this.permissionService.getRolesByTenant(tenantId);
      const adminRole = roles.find(r => r.name === SystemRoles.TENANT_ADMIN.name);

      if (adminRole?.id) {
        // Assign creator as Tenant Admin
        await this.permissionService.assignRoleToUser(
          user.uid,
          tenantId,
          adminRole.id,
          user.uid
        );

        // Increment user count
        await this.tenantService.incrementUserCount(tenantId);
      }

      // Load the new tenant
      const tenant = await this.tenantService.getById(tenantId);
      if (tenant) {
        this.tenantService.setCurrentTenant(tenant);

        // Load permissions for this tenant
        await this.permissionService.loadUserPermissions(user.uid, tenantId);
      }

      this.notification.success('Welcome to your new business! 🎉');

      // Redirect to dashboard
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1500);

    } catch (error) {
      console.error('Error creating tenant:', error);
      this.notification.error('Failed to create tenant. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  private areFieldsValid(fieldNames: string[]): boolean {
    return fieldNames.every(field => {
      const control = this.onboardingForm.get(field);
      return control && control.valid;
    });
  }

  private markFieldsAsTouched(fieldNames: string[]) {
    fieldNames.forEach(field => {
      this.onboardingForm.get(field)?.markAsTouched();
    });
  }

  private markFormAsTouched() {
    Object.keys(this.onboardingForm.controls).forEach(key => {
      this.onboardingForm.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.onboardingForm.get(fieldName);
    if (control && control.touched && control.errors) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['email']) return 'Invalid email format';
      if (control.errors['pattern']) {
        if (fieldName.includes('mobile') || fieldName.includes('Phone')) {
          return 'Invalid phone number (10 digits)';
        }
        if (fieldName === 'gstin') {
          return 'Invalid GSTIN format';
        }
      }
    }
    return '';
  }

  getPlanPrice(plan: any): string {
    if (typeof plan.price === 'number') {
      return `₹${plan.price}/month`;
    }
    return plan.price;
  }
}
