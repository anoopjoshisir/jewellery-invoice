import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { Company } from '../../core/models/company.model';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,MainLayoutComponent],
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.scss']
})
export class CompanyComponent implements OnInit {
  companies: Company[] = [];
  form: FormGroup;
  selectedId: string | null = null;

  constructor(private fb: FormBuilder, private companyService: CompanyService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      mobile: ['', Validators.required],
      gstin: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      logoUrl: [''],
      hideItemFields: [[]],
      hideInvoiceFields: [[]],
      hidePrintItemFields: [[]],
      hidePrintInvoiceFields: [[]],
    });
  }

  async ngOnInit() {
    this.loadCompanies();
  }

  async loadCompanies() {
    this.companies = await this.companyService.getAll();
  }

  async save() {
    if (!this.form.valid) return;
    if (this.selectedId) {
      await this.companyService.update(this.selectedId, this.form.value);
    } else {
      await this.companyService.add(this.form.value);
    }
    this.form.reset();
    this.selectedId = null;
    await this.loadCompanies();
  }

  edit(company: Company) {
    this.form.patchValue(company);
    this.selectedId = company.id || null;
  }

  async remove(id: string) {
    await this.companyService.delete(id);
    await this.loadCompanies();
  }
}