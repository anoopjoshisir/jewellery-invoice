/**
 * Gold Rate Model
 * Tracks daily gold/silver rates and historical data
 */

export enum MetalType {
  GOLD_24K = '24K',
  GOLD_22K = '22K',
  GOLD_18K = '18K',
  GOLD_14K = '14K',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM'
}

export enum RateUnit {
  PER_GRAM = 'PER_GRAM',
  PER_10_GRAM = 'PER_10_GRAM',
  PER_TOLA = 'PER_TOLA'
}

export interface MetalRate {
  metalType: MetalType;
  rate: number;              // Rate per gram (base unit)
  unit: RateUnit;
  buyRate?: number;          // For old gold purchase
  sellRate?: number;         // For new gold sale
}

export interface GoldRate {
  id?: string;
  tenantId: string;
  date: string;              // YYYY-MM-DD format
  rates: MetalRate[];

  // Source information
  source?: 'manual' | 'api' | 'auto';
  sourceUrl?: string;
  apiResponse?: any;

  // Audit fields
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;

  // Notes
  remarks?: string;
  isActive: boolean;         // Only one active rate per day
}

export interface GoldRateHistory {
  date: string;
  metalType: MetalType;
  rate: number;
  change?: number;           // Difference from previous day
  changePercent?: number;    // Percentage change
}

// Purity conversion factors (to 24K)
export const PURITY_FACTORS: Record<string, number> = {
  '24K': 1.000,
  '23K': 0.958,
  '22K': 0.916,
  '21K': 0.875,
  '20K': 0.833,
  '18K': 0.750,
  '14K': 0.583,
  '10K': 0.417,
  '916': 0.916,    // Common notation
  '750': 0.750,
  '585': 0.585
};

// Helper functions
export function convertRateByPurity(rate24K: number, purity: string): number {
  const factor = PURITY_FACTORS[purity] || 1;
  return rate24K * factor;
}

export function getRatePerGram(rate: number, unit: RateUnit): number {
  switch (unit) {
    case RateUnit.PER_GRAM:
      return rate;
    case RateUnit.PER_10_GRAM:
      return rate / 10;
    case RateUnit.PER_TOLA:
      return rate / 11.6638; // 1 tola = 11.6638 grams
    default:
      return rate;
  }
}

export const METAL_TYPE_LABELS: Record<MetalType, string> = {
  [MetalType.GOLD_24K]: '24 Karat Gold (999)',
  [MetalType.GOLD_22K]: '22 Karat Gold (916)',
  [MetalType.GOLD_18K]: '18 Karat Gold (750)',
  [MetalType.GOLD_14K]: '14 Karat Gold (585)',
  [MetalType.SILVER]: 'Silver (999)',
  [MetalType.PLATINUM]: 'Platinum'
};

export const RATE_UNIT_LABELS: Record<RateUnit, string> = {
  [RateUnit.PER_GRAM]: 'Per Gram',
  [RateUnit.PER_10_GRAM]: 'Per 10 Grams',
  [RateUnit.PER_TOLA]: 'Per Tola (11.66g)'
};
