import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { TenantSwitcherComponent } from '../tenant-switcher/tenant-switcher.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, TenantSwitcherComponent],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {
  constructor(public auth: AuthService, private router: Router) { }

  logout() {
    this.auth.logout().then(() => this.router.navigate(['/login']));
  }
}