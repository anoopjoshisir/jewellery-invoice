/**
 * Scheme Model
 * Tracks gold savings schemes, installments, and maturity
 */

export enum SchemeType {
  MONTHLY_SAVINGS = 'MONTHLY_SAVINGS',      // Fixed monthly installment
  FLEXI_SAVINGS = 'FLEXI_SAVINGS',          // Flexible amount any time
  ADVANCE_PURCHASE = 'ADVANCE_PURCHASE'      // Pre-paid purchase scheme
}

export enum SchemeStatus {
  ACTIVE = 'ACTIVE',
  MATURED = 'MATURED',
  REDEEMED = 'REDEEMED',
  CLOSED = 'CLOSED',
  DEFAULTED = 'DEFAULTED'
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  SKIPPED = 'SKIPPED'
}

export interface SchemePlan {
  id?: string;
  tenantId: string;
  planName: string;
  planCode: string;
  schemeType: SchemeType;
  description: string;

  // Duration & Terms
  durationMonths: number;           // Total scheme duration
  installmentAmount: number;        // Monthly installment (for MONTHLY_SAVINGS)
  minInstallment?: number;          // Minimum installment (for FLEXI_SAVINGS)
  maxInstallment?: number;          // Maximum installment (for FLEXI_SAVINGS)
  totalInstallments: number;

  // Benefits
  bonusMonths: number;              // Free months added (e.g., 11+1 scheme)
  bonusPercent?: number;            // Bonus percentage on total
  discountOnMaking?: number;        // Discount on making charges
  discountOnWastage?: number;       // Discount on wastage

  // Rules
  allowEarlyRedemption: boolean;
  earlyRedemptionPenalty?: number;  // Percentage penalty
  allowPurchaseAnyItem: boolean;    // Can redeem against any item
  minPurchaseAmount?: number;       // Minimum purchase at redemption

  // Admin
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
}

export interface Installment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidAmount?: number;
  paidDate?: string;
  paymentMode?: string;
  receiptNumber?: string;
  remarks?: string;
}

export interface SchemeEnrollment {
  id?: string;
  tenantId: string;
  enrollmentNumber: string;         // Auto: SCH-YYYY-NNNN

  // Scheme Details
  planId: string;
  planName: string;
  planCode: string;
  schemeType: SchemeType;

  // Customer Details
  customerId?: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  customerAddress?: string;
  nomineeDetails?: string;

  // Enrollment Details
  enrollmentDate: string;
  startDate: string;                // First installment date
  maturityDate: string;
  installmentAmount: number;
  totalInstallments: number;

  // Progress
  installments: Installment[];
  paidInstallments: number;
  totalPaid: number;
  pendingAmount: number;
  nextDueDate: string;
  overdueInstallments: number;

  // Benefits Earned
  bonusAmount: number;              // Bonus earned
  totalMaturityValue: number;       // Total + Bonus

  // Status
  status: SchemeStatus;

  // Redemption
  redemption?: {
    redeemedDate: string;
    redeemedAmount: number;
    invoiceId?: string;
    invoiceNumber?: string;
    cashRefund?: number;
    remarks?: string;
  };

  // Audit
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;

  notes?: string;
}

export interface SchemeSummary {
  totalEnrollments: number;
  activeEnrollments: number;
  maturedEnrollments: number;
  redeemedEnrollments: number;
  totalCollected: number;
  totalMaturityValue: number;
  upcomingMaturities: number;       // In next 30 days
  overduePayments: number;
  monthlyCollection: number;        // Expected this month
  planWiseBreakdown: Record<string, {
    count: number;
    collected: number;
    maturityValue: number;
  }>;
}

// Helper Functions
export function generateEnrollmentNumber(year: number, sequence: number): string {
  return `SCH-${year}-${String(sequence).padStart(4, '0')}`;
}

export function calculateMaturityDate(startDate: string, durationMonths: number): string {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + durationMonths);
  return date.toISOString().split('T')[0];
}

export function generateInstallmentSchedule(
  startDate: string,
  amount: number,
  count: number
): Installment[] {
  const installments: Installment[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    installments.push({
      installmentNumber: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount,
      status: InstallmentStatus.PENDING
    });
  }

  return installments;
}

export function calculateBonusAmount(
  totalPaid: number,
  bonusMonths: number,
  installmentAmount: number,
  bonusPercent?: number
): number {
  // Method 1: Bonus months (e.g., 11+1 scheme)
  const monthlyBonus = bonusMonths * installmentAmount;

  // Method 2: Percentage bonus
  const percentBonus = bonusPercent ? (bonusPercent / 100) * totalPaid : 0;

  return Math.max(monthlyBonus, percentBonus);
}

export function getNextDueDate(installments: Installment[]): string {
  const pending = installments.find(i => i.status === InstallmentStatus.PENDING);
  return pending?.dueDate || '';
}

export function getOverdueCount(installments: Installment[]): number {
  const today = new Date().toISOString().split('T')[0];
  return installments.filter(
    i => i.status === InstallmentStatus.PENDING && i.dueDate < today
  ).length;
}

export function isMaturityDue(enrollment: SchemeEnrollment): boolean {
  const today = new Date().toISOString().split('T')[0];
  return enrollment.maturityDate <= today &&
         enrollment.status === SchemeStatus.ACTIVE;
}

// Labels
export const SCHEME_TYPE_LABELS: Record<SchemeType, string> = {
  [SchemeType.MONTHLY_SAVINGS]: 'Monthly Savings',
  [SchemeType.FLEXI_SAVINGS]: 'Flexible Savings',
  [SchemeType.ADVANCE_PURCHASE]: 'Advance Purchase'
};

export const SCHEME_STATUS_LABELS: Record<SchemeStatus, string> = {
  [SchemeStatus.ACTIVE]: 'Active',
  [SchemeStatus.MATURED]: 'Matured',
  [SchemeStatus.REDEEMED]: 'Redeemed',
  [SchemeStatus.CLOSED]: 'Closed',
  [SchemeStatus.DEFAULTED]: 'Defaulted'
};

export const SCHEME_STATUS_COLORS: Record<SchemeStatus, string> = {
  [SchemeStatus.ACTIVE]: '#48bb78',
  [SchemeStatus.MATURED]: '#4299e1',
  [SchemeStatus.REDEEMED]: '#9f7aea',
  [SchemeStatus.CLOSED]: '#a0aec0',
  [SchemeStatus.DEFAULTED]: '#f56565'
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'Pending',
  [InstallmentStatus.PAID]: 'Paid',
  [InstallmentStatus.OVERDUE]: 'Overdue',
  [InstallmentStatus.SKIPPED]: 'Skipped'
};

export const INSTALLMENT_STATUS_COLORS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: '#ed8936',
  [InstallmentStatus.PAID]: '#48bb78',
  [InstallmentStatus.OVERDUE]: '#f56565',
  [InstallmentStatus.SKIPPED]: '#a0aec0'
};
