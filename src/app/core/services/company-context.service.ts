import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CompanyContextService {
  private selectedCompanyId$ = new BehaviorSubject<string | null>(null);

  setSelectedCompany(id: string) {
    this.selectedCompanyId$.next(id);
    localStorage.setItem('selectedCompanyId', id);
  }
  getSelectedCompany() {
    return this.selectedCompanyId$.asObservable();
  }
  getSelectedCompanyValue() {
    return this.selectedCompanyId$.value;
  }
  loadFromStorage() {
    const id = localStorage.getItem('selectedCompanyId');
    if (id) this.selectedCompanyId$.next(id);
  }
}