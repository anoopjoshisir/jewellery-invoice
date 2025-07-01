import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  async googleLogin() {
    try {
      await this.auth.googleSignIn();
      this.router.navigate(['/dashboard']);
    } catch (e) { alert(e); }
  }
  async reset() {
    if (!this.email) { alert('Enter your email first.'); return; }
    try {
      await this.auth.sendPasswordReset(this.email);
      alert('Password reset email sent.');
    } catch (e) { alert(e); }
  }
  async login() {
    this.auth.login(this.email, this.password)
      .then(() => this.router.navigate(['/dashboard']))
      .catch(err => this.error = err.message);
  }
}