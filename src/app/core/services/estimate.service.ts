import { Injectable } from '@angular/core';
import { collection, addDoc, query, where, getDocs, orderBy, limit, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Estimate } from '../models/estimate.model';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class EstimateService {
  constructor(private fb: FirebaseService) { }

  /**
   * Add a new estimate
   */
  async add(estimate: Estimate) {
    try {
      return await addDoc(collection(this.fb.db, 'estimates'), estimate);
    } catch (error) {
      console.error('Error adding estimate:', error);
      throw error;
    }
  }

  /**
   * Get estimate by ID
   */
  async getById(id: string): Promise<Estimate | null> {
    try {
      const d = await getDoc(doc(this.fb.db, 'estimates', id));
      return d.exists() ? ({ id: d.id, ...d.data() } as Estimate) : null;
    } catch (error) {
      console.error('Error getting estimate by ID:', error);
      throw error;
    }
  }

  /**
   * Get all estimates for a company
   */
  async getByCompany(companyId: string): Promise<Estimate[]> {
    try {
      const q = query(
        collection(this.fb.db, 'estimates'),
        where('company.id', '==', companyId),
        orderBy('estimateDate', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Estimate));
    } catch (error) {
      console.error('Error getting estimates by company:', error);
      throw error;
    }
  }

  /**
   * Get estimates by status
   */
  async getByStatus(companyId: string, status: 'pending' | 'accepted' | 'rejected' | 'converted'): Promise<Estimate[]> {
    try {
      const q = query(
        collection(this.fb.db, 'estimates'),
        where('company.id', '==', companyId),
        where('status', '==', status),
        orderBy('estimateDate', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Estimate));
    } catch (error) {
      console.error('Error getting estimates by status:', error);
      throw error;
    }
  }

  /**
   * Update an estimate
   */
  async update(id: string, estimate: Partial<Estimate>) {
    try {
      return await updateDoc(doc(this.fb.db, 'estimates', id), estimate);
    } catch (error) {
      console.error('Error updating estimate:', error);
      throw error;
    }
  }

  /**
   * Delete an estimate
   */
  async delete(id: string) {
    try {
      return await deleteDoc(doc(this.fb.db, 'estimates', id));
    } catch (error) {
      console.error('Error deleting estimate:', error);
      throw error;
    }
  }

  /**
   * Generate next estimate number
   * Format: EST-YYYY-NNNN (e.g., EST-2025-0001)
   */
  async generateNextEstimateNo(companyId: string, year: number): Promise<string> {
    try {
      const prefix = `EST-${year}-`;
      const q = query(
        collection(this.fb.db, 'estimates'),
        where('company.id', '==', companyId),
        where('estimateNo', '>=', prefix),
        where('estimateNo', '<', `EST-${year + 1}-`),
        orderBy('estimateNo', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const last = snap.docs[0].data()['estimateNo'];
        const n = parseInt(last.split('-')[2], 10) + 1;
        return `EST-${year}-${n.toString().padStart(4, '0')}`;
      }
      return `EST-${year}-0001`;
    } catch (error) {
      console.error('Error generating estimate number:', error);
      throw error;
    }
  }

  /**
   * Get estimates by year and month
   */
  async getEstimatesByYearMonth(companyId: string, year: number, month: number): Promise<Estimate[]> {
    try {
      let q = query(
        collection(this.fb.db, 'estimates'),
        where('company.id', '==', companyId)
      );

      // If filter is applied, use date range
      if (year) {
        const start = new Date(year, month > 0 ? month - 1 : 0, 1);
        const end = month > 0
          ? new Date(year, month, 1)
          : new Date(year + 1, 0, 1);
        q = query(
          collection(this.fb.db, 'estimates'),
          where('company.id', '==', companyId),
          where('estimateDate', '>=', start.toISOString().slice(0, 10)),
          where('estimateDate', '<', end.toISOString().slice(0, 10)),
          orderBy('estimateDate', 'desc')
        );
      }
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Estimate));
    } catch (error) {
      console.error('Error getting estimates by year/month:', error);
      throw error;
    }
  }
}
