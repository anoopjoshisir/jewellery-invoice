import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc
} from '@angular/fire/firestore';
import {
  OldGoldPurchase,
  OldGoldSummary,
  generateOldGoldPurchaseNumber
} from '../models/old-gold-purchase.model';

@Injectable({
  providedIn: 'root'
})
export class OldGoldPurchaseService {
  private collectionName = 'oldGoldPurchases';

  constructor(private firestore: Firestore) {}

  /**
   * Create a new old gold purchase
   */
  async createPurchase(
    purchase: Omit<OldGoldPurchase, 'id' | 'purchaseNumber'>
  ): Promise<string> {
    try {
      const purchaseCollection = collection(this.firestore, this.collectionName);
      const newDocRef = doc(purchaseCollection);

      // Generate purchase number
      const year = new Date().getFullYear();
      const sequence = await this.getNextSequence(purchase.tenantId, year);
      const purchaseNumber = generateOldGoldPurchaseNumber(year, sequence);

      const purchaseData: OldGoldPurchase = {
        ...purchase,
        id: newDocRef.id,
        purchaseNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(newDocRef, purchaseData);
      return newDocRef.id;
    } catch (error) {
      console.error('Error creating old gold purchase:', error);
      throw error;
    }
  }

  /**
   * Update existing purchase
   */
  async updatePurchase(id: string, updates: Partial<OldGoldPurchase>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating old gold purchase:', error);
      throw error;
    }
  }

  /**
   * Get purchase by ID
   */
  async getPurchase(id: string): Promise<OldGoldPurchase | null> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as OldGoldPurchase;
    } catch (error) {
      console.error('Error getting old gold purchase:', error);
      throw error;
    }
  }

  /**
   * Get all purchases for a tenant
   */
  async getAllPurchases(tenantId: string): Promise<OldGoldPurchase[]> {
    try {
      const purchaseCollection = collection(this.firestore, this.collectionName);
      const q = query(
        purchaseCollection,
        where('tenantId', '==', tenantId),
        orderBy('purchaseDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as OldGoldPurchase);
    } catch (error) {
      console.error('Error getting all purchases:', error);
      throw error;
    }
  }

  /**
   * Get purchases by customer
   */
  async getPurchasesByCustomer(
    tenantId: string,
    customerId: string
  ): Promise<OldGoldPurchase[]> {
    try {
      const purchaseCollection = collection(this.firestore, this.collectionName);
      const q = query(
        purchaseCollection,
        where('tenantId', '==', tenantId),
        where('customerId', '==', customerId),
        orderBy('purchaseDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as OldGoldPurchase);
    } catch (error) {
      console.error('Error getting purchases by customer:', error);
      throw error;
    }
  }

  /**
   * Get purchases by date range
   */
  async getPurchasesByDateRange(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<OldGoldPurchase[]> {
    try {
      const purchaseCollection = collection(this.firestore, this.collectionName);
      const q = query(
        purchaseCollection,
        where('tenantId', '==', tenantId),
        where('purchaseDate', '>=', startDate),
        where('purchaseDate', '<=', endDate),
        orderBy('purchaseDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as OldGoldPurchase);
    } catch (error) {
      console.error('Error getting purchases by date range:', error);
      throw error;
    }
  }

  /**
   * Get purchases used in exchange (linked to invoices)
   */
  async getExchangePurchases(tenantId: string): Promise<OldGoldPurchase[]> {
    try {
      const purchaseCollection = collection(this.firestore, this.collectionName);
      const q = query(
        purchaseCollection,
        where('tenantId', '==', tenantId),
        where('paymentMode', '==', 'EXCHANGE'),
        orderBy('purchaseDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as OldGoldPurchase);
    } catch (error) {
      console.error('Error getting exchange purchases:', error);
      throw error;
    }
  }

  /**
   * Get next sequence number for purchase number generation
   */
  private async getNextSequence(tenantId: string, year: number): Promise<number> {
    try {
      const purchaseCollection = collection(this.firestore, this.collectionName);
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const q = query(
        purchaseCollection,
        where('tenantId', '==', tenantId),
        where('purchaseDate', '>=', yearStart),
        where('purchaseDate', '<=', yearEnd),
        orderBy('purchaseDate', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return 1;
      }

      const lastPurchase = querySnapshot.docs[0].data() as OldGoldPurchase;
      const match = lastPurchase.purchaseNumber.match(/OGP-\d{4}-(\d{4})/);

      if (match) {
        return parseInt(match[1]) + 1;
      }

      return 1;
    } catch (error) {
      console.error('Error getting next sequence:', error);
      return 1;
    }
  }

  /**
   * Get purchase summary/statistics
   */
  async getPurchaseSummary(tenantId: string): Promise<OldGoldSummary> {
    try {
      const purchases = await this.getAllPurchases(tenantId);

      const summary: OldGoldSummary = {
        totalPurchases: purchases.length,
        totalWeight: 0,
        totalValue: 0,
        averageRate: 0,
        purchasesByPurity: {},
        monthlyTrend: []
      };

      let totalWeightedRate = 0;

      purchases.forEach(purchase => {
        summary.totalWeight += purchase.totalNetWeight;
        summary.totalValue += purchase.totalValue;

        // Calculate weighted average rate
        purchase.items.forEach(item => {
          totalWeightedRate += item.rateForPurity * item.netWeight!;

          // Group by purity
          const purity = item.purityTested;
          if (!summary.purchasesByPurity[purity]) {
            summary.purchasesByPurity[purity] = { count: 0, weight: 0, value: 0 };
          }
          summary.purchasesByPurity[purity].count++;
          summary.purchasesByPurity[purity].weight += item.netWeight || 0;
          summary.purchasesByPurity[purity].value += item.netValue;
        });
      });

      // Calculate average rate
      if (summary.totalWeight > 0) {
        summary.averageRate = totalWeightedRate / summary.totalWeight;
      }

      // Calculate monthly trend (last 6 months)
      const monthlyData: Record<string, { purchases: number; value: number }> = {};

      purchases.forEach(purchase => {
        const month = purchase.purchaseDate.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { purchases: 0, value: 0 };
        }
        monthlyData[month].purchases++;
        monthlyData[month].value += purchase.totalValue;
      });

      summary.monthlyTrend = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          purchases: data.purchases,
          value: data.value
        }))
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 6)
        .reverse();

      return summary;
    } catch (error) {
      console.error('Error getting purchase summary:', error);
      throw error;
    }
  }

  /**
   * Cancel a purchase
   */
  async cancelPurchase(
    id: string,
    reason: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      await this.updatePurchase(id, {
        status: 'CANCELLED',
        remarks: `Cancelled: ${reason}`,
        updatedBy: userId,
        updatedByName: userName
      });
    } catch (error) {
      console.error('Error cancelling purchase:', error);
      throw error;
    }
  }

  /**
   * Search purchases
   */
  async searchPurchases(tenantId: string, searchTerm: string): Promise<OldGoldPurchase[]> {
    try {
      const allPurchases = await this.getAllPurchases(tenantId);

      const term = searchTerm.toLowerCase();
      return allPurchases.filter(
        purchase =>
          purchase.purchaseNumber.toLowerCase().includes(term) ||
          purchase.customerName.toLowerCase().includes(term) ||
          purchase.customerMobile.includes(term) ||
          purchase.remarks?.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching purchases:', error);
      throw error;
    }
  }
}
