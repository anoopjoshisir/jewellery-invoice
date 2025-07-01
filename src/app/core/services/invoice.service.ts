import { Injectable } from '@angular/core';
import { collection, addDoc, query, where, getDocs, orderBy, limit, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Invoice } from '../models/invoice.model';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  constructor(private fb: FirebaseService) { }

  async add(invoice: Invoice) {
    return addDoc(collection(this.fb.db, 'invoices'), invoice);
  }

  async getById(id: string): Promise<Invoice | null> {
    const d = await getDoc(doc(this.fb.db, 'invoices', id));
    return d.exists() ? ({ id: d.id, ...d.data() } as Invoice) : null;
  }

  async getByCompany(companyId: string): Promise<Invoice[]> {
    const q = query(collection(this.fb.db, 'invoices'), where('company.id', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
  }

  async update(id: string, invoice: Partial<Invoice>) {
    return updateDoc(doc(this.fb.db, 'invoices', id), invoice);
  }

  async delete(id: string) {
    return deleteDoc(doc(this.fb.db, 'invoices', id));
  }

  // Efficient billNo generation (manual or auto)
  async generateNextBillNo(companyId: string, year: number): Promise<string> {
    // Query for highest billNo for this company/year
    const prefix = `${year}-`;
    const q = query(
      collection(this.fb.db, 'invoices'),
      where('company.id', '==', companyId),
      where('billNo', '>=', prefix),
      where('billNo', '<', `${year + 1}-`),
      orderBy('billNo', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const last = snap.docs[0].data()["billNo"];
      const n = parseInt(last.split('-')[1], 10) + 1;
      return `${year}-${n.toString().padStart(4, '0')}`;
    }
    return `${year}-0001`;
  }
}