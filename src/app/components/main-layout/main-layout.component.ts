import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Company } from '../../core/models/company.model';
import { CompanyContextService } from '../../core/services/company-context.service';
import { UserService } from '../../core/services/user.service';
import { CompanyService } from '../../core/services/company.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {
  companies: Company[] = [];
  selectedCompanyId: string | null = null;

  constructor(public auth: AuthService, private router: Router,
    private companyContext: CompanyContextService,
    private userService: UserService,
    private companyService: CompanyService
  ) { }

  async ngOnInit() {
    //this.companyContext.loadFromStorage();
    //Assume you get current user from auth service
    const user = this.auth.user$.getValue(); /* get current user */;
    if (user) {
      this.companies = await this.companyService.getByIds(user.companies || []);
      this.selectedCompanyId = this.companyContext.getSelectedCompanyValue() || this.companies[0]?.id || "";
      this.companyContext.setSelectedCompany(this.selectedCompanyId!);
    }
  }

  onCompanyChange(companyId: any) {
    this.selectedCompanyId = companyId.value;
    this.companyContext.setSelectedCompany(companyId.value);
  }
  logout() {
    this.auth.logout().then(() => this.router.navigate(['/login']));
  }
}