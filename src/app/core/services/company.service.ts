import { Injectable } from '@angular/core';
import { collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Company } from '../models/company.model';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  constructor(private fb: FirebaseService) {}
private companiesCache: Company[] | null = null;
  // Get all companies
  async getAll(): Promise<Company[]> {
    const snap = await getDocs(collection(this.fb.db, 'companies'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
  }

  // Get companies by array of ids
  async getByIds(ids: string[]): Promise<Company[]> {
    if (this.companiesCache) {
      // Return cached companies, filtered by ids
      return this.companiesCache.filter(c => ids.includes(c.id || ""));
    }
    if (!ids || ids.length === 0) return [];
    // Firestore 'in' queries: max 10 elements per query
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 10)
      chunks.push(ids.slice(i, i + 10));
    let companies: Company[] = [];
    for (const chunk of chunks) {
      const q = query(collection(this.fb.db, 'companies'), where('__name__', 'in', chunk));
      const snap = await getDocs(q);
      companies = companies.concat(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
    }
    return companies;
  }

  // Get single company by id
  async getById(id: string): Promise<Company | null> {
    const d = await getDoc(doc(this.fb.db, 'companies', id));
    return d.exists() ? ({ id: d.id, ...d.data() } as Company) : null;
  }

  // Add company
  async add(company: Company) {
    const ref = doc(collection(this.fb.db, 'companies'));
    return setDoc(ref, company);
  }

  // Update company
  async update(id: string, company: Partial<Company>) {
    return updateDoc(doc(this.fb.db, 'companies', id), company);
  }

  // Delete company
  async delete(id: string) {
    return deleteDoc(doc(this.fb.db, 'companies', id));
  }

  // Optionally, provide a method to clear the cache (on logout, etc)
  clearCache() {
    this.companiesCache = null;
  }
}