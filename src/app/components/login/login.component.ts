import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { CompanyContextService } from '../../core/services/company-context.service';

@Component({
  selector: 'app-login',
  standalone:true,
  imports:[CommonModule,FormsModule,ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  hidePassword = true;
  loading = false;
  loginForm !: FormGroup;
  loginError = '';


  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router,private companyContext:CompanyContextService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [true]
    });
  }

  async onSubmit() {
    this.loginError = '';
    if (this.loginForm.invalid) return;
    this.loading = true;
    const { email, password, rememberMe } = this.loginForm.value;
    try {
      const user = await this.auth.login(email!, password!, rememberMe!);      
      if (user) {
        const selectedcompany = user && user.companies ? user.companies[0] : undefined;
        this.companyContext.setSelectedCompany(selectedcompany!);
        this.router.navigate(['/dashboard']);
      } else {
        this.loginError = 'Invalid credentials';
      }
    } catch (e) {
      this.loginError = 'Login failed. Please try again.';
    }
    this.loading = false;
  }
}