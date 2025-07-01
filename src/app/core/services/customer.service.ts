import { Injectable } from '@angular/core';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Customer } from '../models/customer.model';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  constructor(private fb: FirebaseService) {}

  async getByCompany(companyId: string): Promise<Customer[]> {
    const q = query(collection(this.fb.db, 'customers'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  }

  async getById(id: string): Promise<Customer | null> {
    const d = await getDoc(doc(this.fb.db, 'customers', id));
    return d.exists() ? ({ id: d.id, ...d.data() } as Customer) : null;
  }

  async add(customer: Customer) {
    return addDoc(collection(this.fb.db, 'customers'), customer);
  }

  async update(id: string, customer: Partial<Customer>) {
    return updateDoc(doc(this.fb.db, 'customers', id), customer);
  }

  async delete(id: string) {
    return deleteDoc(doc(this.fb.db, 'customers', id));
  }
}