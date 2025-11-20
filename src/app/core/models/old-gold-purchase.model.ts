/**
 * Old Gold Purchase Model
 * Tracks old gold purchases/exchanges from customers
 */

export enum OldGoldCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED'
}

export enum PurityTestMethod {
  TOUCHSTONE = 'TOUCHSTONE',
  XRF = 'XRF',                    // X-Ray Fluorescence
  FIRE_ASSAY = 'FIRE_ASSAY',
  VISUAL = 'VISUAL',
  ELECTRONIC = 'ELECTRONIC'
}

export interface OldGoldItem {
  itemType: string;                // Ring, Necklace, Bangle, etc.
  description?: string;
  grossWeight: number;             // Total weight with stones in grams
  netWeight?: number;              // Pure gold weight (after stone deduction)
  stoneWeight?: number;            // Deducted stone weight
  purityMarked?: string;           // What's marked on the item (22K, 18K, etc.)
  purityTested: string;            // Actual tested purity
  testMethod: PurityTestMethod;
  condition: OldGoldCondition;

  // Value calculation
  rate24K: number;                 // 24K rate at time of purchase
  rateForPurity: number;           // Rate based on tested purity
  deductions: OldGoldDeduction[];
  grossValue: number;              // netWeight × rateForPurity
  totalDeductions: number;
  netValue: number;                // grossValue - totalDeductions

  // Additional details
  hasStones: boolean;
  hasDamage: boolean;
  damageNotes?: string;
  images?: string[];               // Photos of the item
}

export interface OldGoldDeduction {
  type: 'STONE_WEIGHT' | 'IMPURITY' | 'DAMAGE' | 'WASTAGE' | 'OTHER';
  description: string;
  amount: number;                  // Deduction amount in rupees
  percentage?: number;             // If percentage-based
}

export interface OldGoldPurchase {
  id?: string;
  tenantId: string;
  purchaseNumber: string;          // Auto-generated: OGP-YYYY-NNNN

  // Customer details
  customerId?: string;
  customerName: string;
  customerMobile: string;
  customerAddress?: string;
  customerIdProof?: string;        // For compliance
  customerIdNumber?: string;

  // Purchase details
  purchaseDate: string;
  items: OldGoldItem[];
  totalGrossWeight: number;
  totalNetWeight: number;
  totalValue: number;

  // Payment/Settlement
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'EXCHANGE';
  paidAmount: number;
  chequeNumber?: string;
  chequeDate?: string;
  bankDetails?: string;

  // If used in exchange
  exchangeInvoiceId?: string;
  exchangeInvoiceNumber?: string;
  exchangeAmount: number;          // Amount adjusted in new purchase

  // Testing details
  testedBy: string;
  testedByName: string;
  testingEquipment?: string;
  testingNotes?: string;

  // Status
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';

  // Audit fields
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;

  // Additional details
  remarks?: string;
  documents?: string[];            // Scanned documents, receipts
}

export interface OldGoldSummary {
  totalPurchases: number;
  totalWeight: number;
  totalValue: number;
  averageRate: number;
  purchasesByPurity: Record<string, { count: number; weight: number; value: number }>;
  monthlyTrend: { month: string; purchases: number; value: number }[];
}

// Helper functions
export function calculateOldGoldValue(
  netWeight: number,
  testedPurity: string,
  rate24K: number,
  deductions: OldGoldDeduction[]
): { grossValue: number; totalDeductions: number; netValue: number } {
  // Import purity factor from gold-rate model
  const PURITY_FACTORS: Record<string, number> = {
    '24K': 1.000,
    '23K': 0.958,
    '22K': 0.916,
    '21K': 0.875,
    '20K': 0.833,
    '18K': 0.750,
    '14K': 0.583,
    '10K': 0.417,
    '916': 0.916,
    '750': 0.750,
    '585': 0.585
  };

  const purityFactor = PURITY_FACTORS[testedPurity] || 0.916; // Default to 22K
  const rateForPurity = rate24K * purityFactor;
  const grossValue = netWeight * rateForPurity;

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const netValue = grossValue - totalDeductions;

  return { grossValue, totalDeductions, netValue };
}

export function generateOldGoldPurchaseNumber(year: number, sequence: number): string {
  return `OGP-${year}-${String(sequence).padStart(4, '0')}`;
}

export const OLD_GOLD_CONDITION_LABELS: Record<OldGoldCondition, string> = {
  [OldGoldCondition.EXCELLENT]: 'Excellent',
  [OldGoldCondition.GOOD]: 'Good',
  [OldGoldCondition.FAIR]: 'Fair',
  [OldGoldCondition.POOR]: 'Poor',
  [OldGoldCondition.DAMAGED]: 'Damaged'
};

export const PURITY_TEST_METHOD_LABELS: Record<PurityTestMethod, string> = {
  [PurityTestMethod.TOUCHSTONE]: 'Touchstone',
  [PurityTestMethod.XRF]: 'XRF (X-Ray Fluorescence)',
  [PurityTestMethod.FIRE_ASSAY]: 'Fire Assay',
  [PurityTestMethod.VISUAL]: 'Visual Inspection',
  [PurityTestMethod.ELECTRONIC]: 'Electronic Tester'
};

export const OLD_GOLD_CONDITION_COLORS: Record<OldGoldCondition, string> = {
  [OldGoldCondition.EXCELLENT]: '#48bb78',
  [OldGoldCondition.GOOD]: '#4299e1',
  [OldGoldCondition.FAIR]: '#ed8936',
  [OldGoldCondition.POOR]: '#f56565',
  [OldGoldCondition.DAMAGED]: '#c53030'
};
