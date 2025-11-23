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
  orderBy
} from '@angular/fire/firestore';
import {
  GSTSlabType,
  SupplyType,
  TaxBreakdown,
  InvoiceTaxSummary,
  HSNCode,
  GST_SLABS,
  HSN_CODES,
  STATE_CODES,
  calculateGST,
  calculateInvoiceTax,
  determineSupplyType,
  validateGSTIN,
  extractStateFromGSTIN
} from '../models/gst.model';

export interface GSTReport {
  id?: string;
  tenantId: string;
  reportType: 'GSTR1' | 'GSTR3B' | 'MONTHLY' | 'QUARTERLY';
  period: string;          // YYYY-MM or YYYY-Q1/Q2/Q3/Q4
  startDate: string;
  endDate: string;

  // B2B Sales (Business to Business)
  b2bSales: {
    count: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  };

  // B2C Sales (Business to Consumer)
  b2cSales: {
    count: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  };

  // Total Outward Supplies
  totalOutward: {
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
  };

  // Input Tax Credit (if applicable)
  inputTaxCredit: {
    cgst: number;
    sgst: number;
    igst: number;
  };

  // Net Tax Payable
  netTaxPayable: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };

  // HSN-wise Summary
  hsnSummary: Array<{
    hsnCode: string;
    description: string;
    quantity: number;
    taxableValue: number;
    gstRate: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  }>;

  // Status
  status: 'DRAFT' | 'GENERATED' | 'FILED';
  generatedAt: string;
  generatedBy: string;
  generatedByName: string;
}

export interface TenantGSTSettings {
  tenantId: string;
  gstin: string;
  legalName: string;
  tradeName: string;
  stateCode: string;
  stateName: string;
  address: string;
  registrationType: 'Regular' | 'Composition' | 'Unregistered';
  filingFrequency: 'Monthly' | 'Quarterly';
  defaultSupplyType: SupplyType;
  enableReverseCharge: boolean;
  showHSNInInvoice: boolean;
  roundOffTax: boolean;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class GSTService {
  private gstSettingsCollection = 'gstSettings';
  private gstReportsCollection = 'gstReports';

  constructor(private firestore: Firestore) {}

  // ==================== Tax Calculation Methods ====================

  /**
   * Calculate GST for a single amount
   */
  calculateTax(
    amount: number,
    slabType: GSTSlabType,
    supplyType: SupplyType
  ): TaxBreakdown {
    return calculateGST(amount, slabType, supplyType);
  }

  /**
   * Calculate complete invoice tax with multiple components
   */
  calculateInvoiceTax(
    goldValue: number,
    makingCharges: number,
    stoneValue: number,
    sellerStateCode: string,
    buyerStateCode: string
  ): InvoiceTaxSummary {
    const supplyType = determineSupplyType(sellerStateCode, buyerStateCode);
    return calculateInvoiceTax(goldValue, makingCharges, stoneValue, supplyType);
  }

  /**
   * Calculate tax for a simple jewellery invoice
   * (Combined gold value + making charges approach)
   */
  calculateSimpleInvoiceTax(
    totalAmount: number,
    supplyType: SupplyType
  ): TaxBreakdown {
    // For simplified billing where gold + making are combined
    // Apply 3% GST on total (common practice for small shops)
    return calculateGST(totalAmount, GSTSlabType.GOLD_JEWELLERY, supplyType);
  }

  /**
   * Determine supply type from GSTIN numbers
   */
  determineSupplyTypeFromGSTIN(
    sellerGSTIN: string,
    buyerGSTIN?: string
  ): SupplyType {
    const sellerState = extractStateFromGSTIN(sellerGSTIN);
    const buyerState = buyerGSTIN ? extractStateFromGSTIN(buyerGSTIN) : sellerState;
    return determineSupplyType(sellerState, buyerState);
  }

  // ==================== HSN Code Methods ====================

  /**
   * Get all HSN codes
   */
  getAllHSNCodes(): HSNCode[] {
    return HSN_CODES;
  }

  /**
   * Get HSN codes by category
   */
  getHSNCodesByCategory(category: GSTSlabType): HSNCode[] {
    return HSN_CODES.filter(h => h.category === category);
  }

  /**
   * Search HSN codes
   */
  searchHSNCodes(searchTerm: string): HSNCode[] {
    const term = searchTerm.toLowerCase();
    return HSN_CODES.filter(
      h => h.code.includes(term) || h.description.toLowerCase().includes(term)
    );
  }

  /**
   * Get default HSN code for jewellery
   */
  getDefaultJewelleryHSN(): string {
    return '71131910'; // Gold jewellery
  }

  // ==================== Validation Methods ====================

  /**
   * Validate GSTIN format
   */
  validateGSTIN(gstin: string): { valid: boolean; error?: string } {
    if (!gstin) {
      return { valid: false, error: 'GSTIN is required' };
    }

    if (gstin.length !== 15) {
      return { valid: false, error: 'GSTIN must be 15 characters' };
    }

    if (!validateGSTIN(gstin)) {
      return { valid: false, error: 'Invalid GSTIN format' };
    }

    const stateCode = gstin.substring(0, 2);
    if (!STATE_CODES[stateCode]) {
      return { valid: false, error: 'Invalid state code in GSTIN' };
    }

    return { valid: true };
  }

  /**
   * Extract state from GSTIN
   */
  getStateFromGSTIN(gstin: string): { code: string; name: string } | null {
    if (!gstin || gstin.length < 2) {
      return null;
    }

    const code = gstin.substring(0, 2);
    const name = STATE_CODES[code];

    return name ? { code, name } : null;
  }

  // ==================== GST Settings Methods ====================

  /**
   * Save tenant GST settings
   */
  async saveGSTSettings(settings: TenantGSTSettings): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.gstSettingsCollection, settings.tenantId);
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving GST settings:', error);
      throw error;
    }
  }

  /**
   * Get tenant GST settings
   */
  async getGSTSettings(tenantId: string): Promise<TenantGSTSettings | null> {
    try {
      const docRef = doc(this.firestore, this.gstSettingsCollection, tenantId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as TenantGSTSettings;
    } catch (error) {
      console.error('Error getting GST settings:', error);
      throw error;
    }
  }

  // ==================== GST Report Methods ====================

  /**
   * Generate monthly GST report
   */
  async generateMonthlyReport(
    tenantId: string,
    year: number,
    month: number,
    invoices: any[],
    userId: string,
    userName: string
  ): Promise<GSTReport> {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // Filter invoices for the period
    const periodInvoices = invoices.filter(
      inv => inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
    );

    // Calculate summaries
    const b2bInvoices = periodInvoices.filter(inv => inv.customerGSTIN);
    const b2cInvoices = periodInvoices.filter(inv => !inv.customerGSTIN);

    const b2bSummary = this.calculateInvoiceSummary(b2bInvoices);
    const b2cSummary = this.calculateInvoiceSummary(b2cInvoices);

    // HSN-wise summary
    const hsnSummary = this.calculateHSNSummary(periodInvoices);

    const report: GSTReport = {
      tenantId,
      reportType: 'MONTHLY',
      period,
      startDate,
      endDate,
      b2bSales: {
        count: b2bInvoices.length,
        ...b2bSummary
      },
      b2cSales: {
        count: b2cInvoices.length,
        ...b2cSummary
      },
      totalOutward: {
        taxableAmount: b2bSummary.taxableAmount + b2cSummary.taxableAmount,
        cgst: b2bSummary.cgst + b2cSummary.cgst,
        sgst: b2bSummary.sgst + b2cSummary.sgst,
        igst: b2bSummary.igst + b2cSummary.igst,
        cess: 0,
        totalTax: b2bSummary.totalTax + b2cSummary.totalTax
      },
      inputTaxCredit: { cgst: 0, sgst: 0, igst: 0 },
      netTaxPayable: {
        cgst: b2bSummary.cgst + b2cSummary.cgst,
        sgst: b2bSummary.sgst + b2cSummary.sgst,
        igst: b2bSummary.igst + b2cSummary.igst,
        total: b2bSummary.totalTax + b2cSummary.totalTax
      },
      hsnSummary,
      status: 'GENERATED',
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      generatedByName: userName
    };

    // Save report
    await this.saveGSTReport(report);

    return report;
  }

  /**
   * Save GST report
   */
  private async saveGSTReport(report: GSTReport): Promise<string> {
    try {
      const reportCollection = collection(this.firestore, this.gstReportsCollection);
      const newDocRef = doc(reportCollection);

      const reportData: GSTReport = {
        ...report,
        id: newDocRef.id
      };

      await setDoc(newDocRef, reportData);
      return newDocRef.id;
    } catch (error) {
      console.error('Error saving GST report:', error);
      throw error;
    }
  }

  /**
   * Get GST reports for a tenant
   */
  async getGSTReports(tenantId: string): Promise<GSTReport[]> {
    try {
      const reportCollection = collection(this.firestore, this.gstReportsCollection);
      const q = query(
        reportCollection,
        where('tenantId', '==', tenantId),
        orderBy('period', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as GSTReport);
    } catch (error) {
      console.error('Error getting GST reports:', error);
      throw error;
    }
  }

  // ==================== Helper Methods ====================

  private calculateInvoiceSummary(invoices: any[]): {
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  } {
    return invoices.reduce(
      (acc, inv) => ({
        taxableAmount: acc.taxableAmount + (inv.taxableAmount || inv.subtotal || 0),
        cgst: acc.cgst + (inv.cgst || 0),
        sgst: acc.sgst + (inv.sgst || 0),
        igst: acc.igst + (inv.igst || 0),
        totalTax: acc.totalTax + (inv.totalTax || inv.cgst + inv.sgst + inv.igst || 0)
      }),
      { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 }
    );
  }

  private calculateHSNSummary(invoices: any[]): GSTReport['hsnSummary'] {
    const hsnMap = new Map<string, {
      hsnCode: string;
      description: string;
      quantity: number;
      taxableValue: number;
      gstRate: number;
      cgst: number;
      sgst: number;
      igst: number;
    }>();

    // Group by HSN code
    invoices.forEach(inv => {
      inv.items?.forEach((item: any) => {
        const hsnCode = item.hsnCode || '71131910';
        const existing = hsnMap.get(hsnCode);

        if (existing) {
          existing.quantity += item.quantity || 1;
          existing.taxableValue += item.taxableAmount || item.total || 0;
          existing.cgst += item.cgst || 0;
          existing.sgst += item.sgst || 0;
          existing.igst += item.igst || 0;
        } else {
          const hsnInfo = HSN_CODES.find(h => h.code === hsnCode);
          hsnMap.set(hsnCode, {
            hsnCode,
            description: hsnInfo?.description || 'Jewellery',
            quantity: item.quantity || 1,
            taxableValue: item.taxableAmount || item.total || 0,
            gstRate: hsnInfo?.gstRate || 3,
            cgst: item.cgst || 0,
            sgst: item.sgst || 0,
            igst: item.igst || 0
          });
        }
      });
    });

    return Array.from(hsnMap.values()).map(item => ({
      ...item,
      totalTax: item.cgst + item.sgst + item.igst
    }));
  }

  /**
   * Get GST slab info
   */
  getGSTSlab(slabType: GSTSlabType) {
    return GST_SLABS[slabType];
  }

  /**
   * Get all states
   */
  getAllStates(): Array<{ code: string; name: string }> {
    return Object.entries(STATE_CODES).map(([code, name]) => ({ code, name }));
  }

  /**
   * Format tax amount
   */
  formatTaxAmount(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}
