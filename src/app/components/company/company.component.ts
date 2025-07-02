import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { Company } from '../../core/models/company.model';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../main-layout/main-layout.component';

// All invoice fields for hideInvoiceFields
const INVOICE_FIELDS = [
  { key: 'billNo', label: 'Bill No' },
  { key: 'billDate', label: 'Bill Date' },
  { key: 'discountOnGoldWeight', label: 'Discount' },
];

// All possible fields of Invoice Item for hideItemFields
const INVOICE_ITEM_FIELDS = [
  { key: 'itempurity', label: 'Purity' },
  { key: 'itemnakingcharges', label: 'Making Charges' },
  { key: 'itemhsn', label: 'HSN' },
];

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MainLayoutComponent],
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.scss']
})
export class CompanyComponent implements OnInit {
  companies: Company[] = [];
  form: FormGroup;
  selectedId: string | null = null;
  invoiceFields = INVOICE_FIELDS;
  itemFields = INVOICE_ITEM_FIELDS;

  constructor(private fb: FormBuilder, private companyService: CompanyService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      slogan: [''],
      address: ['', Validators.required],
      mobile: ['', Validators.required],
      gstin: [''], // Not required
      email: ['', [Validators.email]], // Not required, only pattern validated
      logoUrl: [''],
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

  onMultiCheckboxChange(controlName: string, key: string, checkedval:any ) {
    const arr = this.form.get(controlName)?.value as string[];
    if (checkedval.checked) {
      if (!arr.includes(key)) arr.push(key);
    } else {
      const idx = arr.indexOf(key);
      if (idx >= 0) arr.splice(idx, 1);
    }
    this.form.get(controlName)?.setValue([...arr]);
  }
}