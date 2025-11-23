/**
 * GST/Tax Model for Jewellery Business
 * Handles CGST, SGST, IGST calculations specific to Indian jewellery trade
 */

export enum GSTSlabType {
  GOLD_JEWELLERY = 'GOLD_JEWELLERY',      // 3% GST
  MAKING_CHARGES = 'MAKING_CHARGES',       // 5% GST on making charges
  SILVER_JEWELLERY = 'SILVER_JEWELLERY',   // 3% GST
  DIAMOND = 'DIAMOND',                      // 0.25% GST (cut & polished)
  PRECIOUS_STONES = 'PRECIOUS_STONES',     // 0.25% GST
  IMITATION = 'IMITATION',                  // 3% GST
  BULLION = 'BULLION'                       // 3% GST
}

export enum SupplyType {
  INTRA_STATE = 'INTRA_STATE',    // Within same state - CGST + SGST
  INTER_STATE = 'INTER_STATE'     // Different states - IGST
}

export interface GSTSlab {
  slabType: GSTSlabType;
  rate: number;                   // Total GST rate (e.g., 3%)
  cgstRate: number;               // CGST rate (half of total)
  sgstRate: number;               // SGST rate (half of total)
  igstRate: number;               // IGST rate (same as total)
  hsnCode: string;
  description: string;
}

export interface GSTDetails {
  supplyType: SupplyType;
  placeOfSupply: string;          // State code
  sellerState: string;            // Seller's state code
  buyerState: string;             // Buyer's state code
  reverseCharge: boolean;         // Reverse charge mechanism
}

export interface TaxBreakdown {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface InvoiceTaxSummary {
  // Gold/Silver value tax (3%)
  goldTaxableAmount: number;
  goldCGST: number;
  goldSGST: number;
  goldIGST: number;
  goldTotalTax: number;

  // Making charges tax (5%)
  makingTaxableAmount: number;
  makingCGST: number;
  makingSGST: number;
  makingIGST: number;
  makingTotalTax: number;

  // Stone/Diamond tax (0.25%)
  stoneTaxableAmount: number;
  stoneCGST: number;
  stoneSGST: number;
  stoneIGST: number;
  stoneTotalTax: number;

  // Combined totals
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  grandTotal: number;

  supplyType: SupplyType;
}

export interface HSNCode {
  code: string;
  description: string;
  gstRate: number;
  category: GSTSlabType;
}

// GST Slabs for Jewellery Industry
export const GST_SLABS: Record<GSTSlabType, GSTSlab> = {
  [GSTSlabType.GOLD_JEWELLERY]: {
    slabType: GSTSlabType.GOLD_JEWELLERY,
    rate: 3,
    cgstRate: 1.5,
    sgstRate: 1.5,
    igstRate: 3,
    hsnCode: '7113',
    description: 'Gold Jewellery'
  },
  [GSTSlabType.MAKING_CHARGES]: {
    slabType: GSTSlabType.MAKING_CHARGES,
    rate: 5,
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 5,
    hsnCode: '9988',
    description: 'Making/Labour Charges'
  },
  [GSTSlabType.SILVER_JEWELLERY]: {
    slabType: GSTSlabType.SILVER_JEWELLERY,
    rate: 3,
    cgstRate: 1.5,
    sgstRate: 1.5,
    igstRate: 3,
    hsnCode: '7114',
    description: 'Silver Jewellery'
  },
  [GSTSlabType.DIAMOND]: {
    slabType: GSTSlabType.DIAMOND,
    rate: 0.25,
    cgstRate: 0.125,
    sgstRate: 0.125,
    igstRate: 0.25,
    hsnCode: '7102',
    description: 'Cut & Polished Diamonds'
  },
  [GSTSlabType.PRECIOUS_STONES]: {
    slabType: GSTSlabType.PRECIOUS_STONES,
    rate: 0.25,
    cgstRate: 0.125,
    sgstRate: 0.125,
    igstRate: 0.25,
    hsnCode: '7103',
    description: 'Precious Stones'
  },
  [GSTSlabType.IMITATION]: {
    slabType: GSTSlabType.IMITATION,
    rate: 3,
    cgstRate: 1.5,
    sgstRate: 1.5,
    igstRate: 3,
    hsnCode: '7117',
    description: 'Imitation Jewellery'
  },
  [GSTSlabType.BULLION]: {
    slabType: GSTSlabType.BULLION,
    rate: 3,
    cgstRate: 1.5,
    sgstRate: 1.5,
    igstRate: 3,
    hsnCode: '7108',
    description: 'Gold Bullion/Coins'
  }
};

// Common HSN Codes for Jewellery
export const HSN_CODES: HSNCode[] = [
  { code: '7108', description: 'Gold (including platinum plated)', gstRate: 3, category: GSTSlabType.BULLION },
  { code: '71081100', description: 'Gold Powder', gstRate: 3, category: GSTSlabType.BULLION },
  { code: '71081200', description: 'Other unwrought gold', gstRate: 3, category: GSTSlabType.BULLION },
  { code: '71081300', description: 'Gold in semi-manufactured forms', gstRate: 3, category: GSTSlabType.BULLION },
  { code: '7113', description: 'Articles of jewellery and parts thereof', gstRate: 3, category: GSTSlabType.GOLD_JEWELLERY },
  { code: '71131100', description: 'Silver jewellery (plated/clad)', gstRate: 3, category: GSTSlabType.SILVER_JEWELLERY },
  { code: '71131910', description: 'Gold jewellery', gstRate: 3, category: GSTSlabType.GOLD_JEWELLERY },
  { code: '71131920', description: 'Gold jewellery set with pearls', gstRate: 3, category: GSTSlabType.GOLD_JEWELLERY },
  { code: '71131930', description: 'Gold jewellery set with diamonds', gstRate: 3, category: GSTSlabType.GOLD_JEWELLERY },
  { code: '71131940', description: 'Gold jewellery set with other stones', gstRate: 3, category: GSTSlabType.GOLD_JEWELLERY },
  { code: '7114', description: 'Articles of goldsmiths/silversmiths wares', gstRate: 3, category: GSTSlabType.SILVER_JEWELLERY },
  { code: '7102', description: 'Diamonds', gstRate: 0.25, category: GSTSlabType.DIAMOND },
  { code: '71023100', description: 'Non-industrial diamonds - unworked', gstRate: 0.25, category: GSTSlabType.DIAMOND },
  { code: '71023910', description: 'Cut & polished diamonds', gstRate: 0.25, category: GSTSlabType.DIAMOND },
  { code: '7103', description: 'Precious & semi-precious stones', gstRate: 0.25, category: GSTSlabType.PRECIOUS_STONES },
  { code: '7117', description: 'Imitation jewellery', gstRate: 3, category: GSTSlabType.IMITATION },
  { code: '9988', description: 'Manufacturing services (Making charges)', gstRate: 5, category: GSTSlabType.MAKING_CHARGES }
];

// Indian State Codes for GST
export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh'
};

// Helper Functions
export function calculateGST(
  amount: number,
  slabType: GSTSlabType,
  supplyType: SupplyType
): TaxBreakdown {
  const slab = GST_SLABS[slabType];

  if (supplyType === SupplyType.INTRA_STATE) {
    const cgstAmount = roundToTwo(amount * slab.cgstRate / 100);
    const sgstAmount = roundToTwo(amount * slab.sgstRate / 100);
    const totalTax = roundToTwo(cgstAmount + sgstAmount);

    return {
      taxableAmount: amount,
      cgstRate: slab.cgstRate,
      cgstAmount,
      sgstRate: slab.sgstRate,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      totalAmount: roundToTwo(amount + totalTax)
    };
  } else {
    const igstAmount = roundToTwo(amount * slab.igstRate / 100);

    return {
      taxableAmount: amount,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: slab.igstRate,
      igstAmount,
      totalTax: igstAmount,
      totalAmount: roundToTwo(amount + igstAmount)
    };
  }
}

export function calculateInvoiceTax(
  goldValue: number,
  makingCharges: number,
  stoneValue: number,
  supplyType: SupplyType
): InvoiceTaxSummary {
  // Calculate gold/silver tax (3%)
  const goldTax = calculateGST(goldValue, GSTSlabType.GOLD_JEWELLERY, supplyType);

  // Calculate making charges tax (5%)
  const makingTax = calculateGST(makingCharges, GSTSlabType.MAKING_CHARGES, supplyType);

  // Calculate stone/diamond tax (0.25%)
  const stoneTax = calculateGST(stoneValue, GSTSlabType.DIAMOND, supplyType);

  // Calculate totals
  const totalTaxableAmount = goldValue + makingCharges + stoneValue;
  const totalCGST = roundToTwo(goldTax.cgstAmount + makingTax.cgstAmount + stoneTax.cgstAmount);
  const totalSGST = roundToTwo(goldTax.sgstAmount + makingTax.sgstAmount + stoneTax.sgstAmount);
  const totalIGST = roundToTwo(goldTax.igstAmount + makingTax.igstAmount + stoneTax.igstAmount);
  const totalTax = roundToTwo(totalCGST + totalSGST + totalIGST);
  const grandTotal = roundToTwo(totalTaxableAmount + totalTax);

  return {
    goldTaxableAmount: goldValue,
    goldCGST: goldTax.cgstAmount,
    goldSGST: goldTax.sgstAmount,
    goldIGST: goldTax.igstAmount,
    goldTotalTax: goldTax.totalTax,

    makingTaxableAmount: makingCharges,
    makingCGST: makingTax.cgstAmount,
    makingSGST: makingTax.sgstAmount,
    makingIGST: makingTax.igstAmount,
    makingTotalTax: makingTax.totalTax,

    stoneTaxableAmount: stoneValue,
    stoneCGST: stoneTax.cgstAmount,
    stoneSGST: stoneTax.sgstAmount,
    stoneIGST: stoneTax.igstAmount,
    stoneTotalTax: stoneTax.totalTax,

    totalTaxableAmount,
    totalCGST,
    totalSGST,
    totalIGST,
    totalTax,
    grandTotal,
    supplyType
  };
}

export function determineSupplyType(sellerStateCode: string, buyerStateCode: string): SupplyType {
  return sellerStateCode === buyerStateCode
    ? SupplyType.INTRA_STATE
    : SupplyType.INTER_STATE;
}

export function getGSTSlab(slabType: GSTSlabType): GSTSlab {
  return GST_SLABS[slabType];
}

export function getHSNCode(code: string): HSNCode | undefined {
  return HSN_CODES.find(h => h.code === code);
}

export function getHSNCodesByCategory(category: GSTSlabType): HSNCode[] {
  return HSN_CODES.filter(h => h.category === category);
}

export function getStateName(stateCode: string): string {
  return STATE_CODES[stateCode] || 'Unknown';
}

export function validateGSTIN(gstin: string): boolean {
  // GSTIN format: 2 digit state code + 10 digit PAN + 1 digit entity code + 1 digit checksum + 1 digit Z
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

export function extractStateFromGSTIN(gstin: string): string {
  if (gstin && gstin.length >= 2) {
    return gstin.substring(0, 2);
  }
  return '';
}

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// GST Labels
export const GST_SLAB_LABELS: Record<GSTSlabType, string> = {
  [GSTSlabType.GOLD_JEWELLERY]: 'Gold Jewellery (3%)',
  [GSTSlabType.MAKING_CHARGES]: 'Making Charges (5%)',
  [GSTSlabType.SILVER_JEWELLERY]: 'Silver Jewellery (3%)',
  [GSTSlabType.DIAMOND]: 'Diamonds (0.25%)',
  [GSTSlabType.PRECIOUS_STONES]: 'Precious Stones (0.25%)',
  [GSTSlabType.IMITATION]: 'Imitation Jewellery (3%)',
  [GSTSlabType.BULLION]: 'Bullion (3%)'
};

export const SUPPLY_TYPE_LABELS: Record<SupplyType, string> = {
  [SupplyType.INTRA_STATE]: 'Intra-State (CGST + SGST)',
  [SupplyType.INTER_STATE]: 'Inter-State (IGST)'
};
