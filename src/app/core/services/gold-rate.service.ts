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
  updateDoc,
  Timestamp
} from '@angular/fire/firestore';
import {
  GoldRate,
  MetalRate,
  MetalType,
  RateUnit,
  GoldRateHistory,
  getRatePerGram,
  convertRateByPurity
} from '../models/gold-rate.model';

@Injectable({
  providedIn: 'root'
})
export class GoldRateService {
  private collectionName = 'goldRates';

  constructor(private firestore: Firestore) {}

  /**
   * Create or update gold rate for a specific date
   */
  async setGoldRate(goldRate: Omit<GoldRate, 'id'>): Promise<string> {
    try {
      // Check if rate already exists for this date
      const existingRate = await this.getRateByDate(goldRate.tenantId, goldRate.date);

      if (existingRate) {
        // Update existing rate
        await this.updateGoldRate(existingRate.id!, goldRate);
        return existingRate.id!;
      } else {
        // Create new rate
        const goldRateCollection = collection(this.firestore, this.collectionName);
        const newDocRef = doc(goldRateCollection);

        const goldRateData: GoldRate = {
          ...goldRate,
          id: newDocRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        };

        await setDoc(newDocRef, goldRateData);
        return newDocRef.id;
      }
    } catch (error) {
      console.error('Error setting gold rate:', error);
      throw error;
    }
  }

  /**
   * Update existing gold rate
   */
  async updateGoldRate(id: string, updates: Partial<GoldRate>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating gold rate:', error);
      throw error;
    }
  }

  /**
   * Get gold rate for a specific date
   */
  async getRateByDate(tenantId: string, date: string): Promise<GoldRate | null> {
    try {
      const goldRateCollection = collection(this.firestore, this.collectionName);
      const q = query(
        goldRateCollection,
        where('tenantId', '==', tenantId),
        where('date', '==', date),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return querySnapshot.docs[0].data() as GoldRate;
    } catch (error) {
      console.error('Error getting gold rate by date:', error);
      throw error;
    }
  }

  /**
   * Get today's gold rate
   */
  async getTodaysRate(tenantId: string): Promise<GoldRate | null> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return this.getRateByDate(tenantId, today);
  }

  /**
   * Get latest gold rate (most recent available)
   */
  async getLatestRate(tenantId: string): Promise<GoldRate | null> {
    try {
      const goldRateCollection = collection(this.firestore, this.collectionName);
      const q = query(
        goldRateCollection,
        where('tenantId', '==', tenantId),
        where('isActive', '==', true),
        orderBy('date', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return querySnapshot.docs[0].data() as GoldRate;
    } catch (error) {
      console.error('Error getting latest gold rate:', error);
      throw error;
    }
  }

  /**
   * Get gold rate history for a date range
   */
  async getRateHistory(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<GoldRate[]> {
    try {
      const goldRateCollection = collection(this.firestore, this.collectionName);
      const q = query(
        goldRateCollection,
        where('tenantId', '==', tenantId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as GoldRate);
    } catch (error) {
      console.error('Error getting rate history:', error);
      throw error;
    }
  }

  /**
   * Get rate for specific metal type from latest rate
   */
  async getMetalRate(tenantId: string, metalType: MetalType): Promise<number | null> {
    try {
      const latestRate = await getLatestRate(tenantId);
      if (!latestRate) {
        return null;
      }

      const metalRate = latestRate.rates.find(r => r.metalType === metalType);
      if (!metalRate) {
        return null;
      }

      return getRatePerGram(metalRate.rate, metalRate.unit);
    } catch (error) {
      console.error('Error getting metal rate:', error);
      throw error;
    }
  }

  /**
   * Calculate value for given weight and purity
   */
  async calculateGoldValue(
    tenantId: string,
    weightGrams: number,
    purity: string
  ): Promise<number> {
    try {
      // Get 24K rate
      const gold24KRate = await this.getLatestRate(tenantId);
      if (!gold24KRate) {
        throw new Error('Gold rate not found');
      }

      const metalRate = gold24KRate.rates.find(r => r.metalType === MetalType.GOLD_24K);
      if (!metalRate) {
        throw new Error('24K gold rate not found');
      }

      const rate24K = getRatePerGram(metalRate.rate, metalRate.unit);

      // Convert to specific purity
      const rateForPurity = convertRateByPurity(rate24K, purity);

      // Calculate value
      return weightGrams * rateForPurity;
    } catch (error) {
      console.error('Error calculating gold value:', error);
      throw error;
    }
  }

  /**
   * Get rate history with change calculations
   */
  async getRateHistoryWithChanges(
    tenantId: string,
    metalType: MetalType,
    days: number = 30
  ): Promise<GoldRateHistory[]> {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const rates = await this.getRateHistory(tenantId, startDate, endDate);

      const history: GoldRateHistory[] = [];
      let previousRate: number | null = null;

      for (const goldRate of rates.reverse()) {
        const metalRate = goldRate.rates.find(r => r.metalType === metalType);
        if (metalRate) {
          const rate = getRatePerGram(metalRate.rate, metalRate.unit);

          const historyEntry: GoldRateHistory = {
            date: goldRate.date,
            metalType,
            rate
          };

          if (previousRate !== null) {
            historyEntry.change = rate - previousRate;
            historyEntry.changePercent = ((rate - previousRate) / previousRate) * 100;
          }

          history.push(historyEntry);
          previousRate = rate;
        }
      }

      return history.reverse();
    } catch (error) {
      console.error('Error getting rate history with changes:', error);
      throw error;
    }
  }

  /**
   * Import rates from external API (placeholder for future implementation)
   */
  async importRatesFromAPI(tenantId: string, apiUrl: string, apiKey?: string): Promise<void> {
    // TODO: Implement API integration
    // This would call an external gold rate API and import the data
    throw new Error('API import not yet implemented');
  }

  /**
   * Clone previous day's rate to today
   */
  async clonePreviousRate(tenantId: string, userId: string, userName: string): Promise<string> {
    try {
      const latestRate = await this.getLatestRate(tenantId);
      if (!latestRate) {
        throw new Error('No previous rate found to clone');
      }

      const today = new Date().toISOString().split('T')[0];

      const newRate: Omit<GoldRate, 'id'> = {
        tenantId,
        date: today,
        rates: [...latestRate.rates],
        source: 'manual',
        remarks: `Cloned from ${latestRate.date}`,
        createdBy: userId,
        createdByName: userName,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      return await this.setGoldRate(newRate);
    } catch (error) {
      console.error('Error cloning previous rate:', error);
      throw error;
    }
  }

  /**
   * Get all rates for a month (for display/management)
   */
  async getMonthRates(tenantId: string, year: number, month: number): Promise<GoldRate[]> {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      return await this.getRateHistory(tenantId, startDate, endDate);
    } catch (error) {
      console.error('Error getting month rates:', error);
      throw error;
    }
  }
}
