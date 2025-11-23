/**
 * Custom Order Model
 * Tracks made-to-order jewellery pieces with design, material, and timeline management
 */

export enum CustomOrderStatus {
  ENQUIRY = 'ENQUIRY',
  DESIGN_PENDING = 'DESIGN_PENDING',
  DESIGN_APPROVED = 'DESIGN_APPROVED',
  ADVANCE_PENDING = 'ADVANCE_PENDING',
  IN_PRODUCTION = 'IN_PRODUCTION',
  QC_PENDING = 'QC_PENDING',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum CustomOrderPriority {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface DesignDetails {
  category: string;              // Ring, Necklace, etc.
  designType: 'EXISTING' | 'CUSTOM' | 'REFERENCE';
  referenceNumber?: string;      // Existing design number
  referenceImages?: string[];    // Customer provided reference images
  designImages?: string[];       // Final approved design images
  description: string;
  specifications?: string;       // Size, dimensions, etc.
  specialInstructions?: string;
}

export interface MaterialEstimate {
  metalType: string;             // 22K, 18K, etc.
  estimatedWeight: number;       // Estimated gold weight
  actualWeight?: number;         // Actual weight after production
  goldRate: number;              // Rate at time of order
  goldValue: number;             // Estimated gold value
  wastagePercent: number;
  wastageValue: number;
  makingChargesType: 'per_gram' | 'percentage' | 'fixed';
  makingChargesValue: number;
  makingCharges: number;
  stoneDetails?: CustomOrderStone[];
  stoneValue: number;
  totalEstimate: number;
}

export interface CustomOrderStone {
  stoneType: string;
  quantity: number;
  carats: number;
  quality?: string;
  estimatedCost: number;
  actualCost?: number;
}

export interface PaymentSchedule {
  advanceAmount: number;
  advancePercent: number;
  advancePaid: boolean;
  advancePaidDate?: string;
  advancePaymentMode?: string;
  advanceReceiptNumber?: string;
  balanceAmount: number;
  balancePaid: boolean;
  balancePaidDate?: string;
  balancePaymentMode?: string;
  balanceReceiptNumber?: string;
  totalAmount: number;
}

export interface ProductionTimeline {
  orderDate: string;
  expectedStartDate?: string;
  actualStartDate?: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string;
  deliveryDate?: string;
  rushOrder: boolean;
  rushCharges?: number;
}

export interface CustomOrderNote {
  date: string;
  note: string;
  addedBy: string;
  addedByName: string;
  isInternal: boolean;           // Internal notes vs customer-visible
}

export interface CustomOrder {
  id?: string;
  tenantId: string;
  orderNumber: string;           // Auto-generated: CO-YYYY-NNNN

  // Customer Details
  customerId?: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  customerAddress?: string;

  // Order Details
  status: CustomOrderStatus;
  priority: CustomOrderPriority;
  design: DesignDetails;
  materials: MaterialEstimate;
  payment: PaymentSchedule;
  timeline: ProductionTimeline;

  // Production Details
  assignedArtisan?: string;
  assignedArtisanName?: string;
  workOrderNumber?: string;

  // Final Product Details (filled after production)
  finalProduct?: {
    actualGoldWeight: number;
    actualGoldValue: number;
    actualMakingCharges: number;
    actualStoneValue: number;
    actualTotalValue: number;
    hallmarkNumber?: string;
    huid?: string;
    qualityCheckPassed: boolean;
    qualityCheckNotes?: string;
  };

  // Order History
  notes: CustomOrderNote[];
  statusHistory: Array<{
    status: CustomOrderStatus;
    changedAt: string;
    changedBy: string;
    changedByName: string;
    remarks?: string;
  }>;

  // Linked Documents
  invoiceId?: string;
  invoiceNumber?: string;
  estimateId?: string;
  estimateNumber?: string;

  // Audit Fields
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface CustomOrderSummary {
  totalOrders: number;
  enquiries: number;
  inProduction: number;
  readyForDelivery: number;
  delivered: number;
  cancelled: number;
  totalEstimatedValue: number;
  totalAdvanceCollected: number;
  totalPendingAdvance: number;
  overdueOrders: number;
  statusBreakdown: Record<CustomOrderStatus, number>;
}

// Helper Functions
export function generateCustomOrderNumber(year: number, sequence: number): string {
  return `CO-${year}-${String(sequence).padStart(4, '0')}`;
}

export function calculateMaterialEstimate(
  estimatedWeight: number,
  goldRate: number,
  wastagePercent: number,
  makingChargesType: 'per_gram' | 'percentage' | 'fixed',
  makingChargesValue: number,
  stoneValue: number = 0
): MaterialEstimate {
  const goldValue = estimatedWeight * goldRate;
  const wastageValue = (wastagePercent / 100) * goldValue;

  let makingCharges = 0;
  switch (makingChargesType) {
    case 'per_gram':
      makingCharges = estimatedWeight * makingChargesValue;
      break;
    case 'percentage':
      makingCharges = (makingChargesValue / 100) * goldValue;
      break;
    case 'fixed':
      makingCharges = makingChargesValue;
      break;
  }

  const totalEstimate = goldValue + wastageValue + makingCharges + stoneValue;

  return {
    metalType: '22K',
    estimatedWeight,
    goldRate,
    goldValue,
    wastagePercent,
    wastageValue,
    makingChargesType,
    makingChargesValue,
    makingCharges,
    stoneValue,
    totalEstimate
  };
}

export function calculatePaymentSchedule(
  totalEstimate: number,
  advancePercent: number = 50
): PaymentSchedule {
  const advanceAmount = Math.round((advancePercent / 100) * totalEstimate);
  const balanceAmount = totalEstimate - advanceAmount;

  return {
    advanceAmount,
    advancePercent,
    advancePaid: false,
    balanceAmount,
    balancePaid: false,
    totalAmount: totalEstimate
  };
}

export function getExpectedDeliveryDate(orderDate: string, rushOrder: boolean = false): string {
  const date = new Date(orderDate);
  const daysToAdd = rushOrder ? 7 : 21; // 1 week for rush, 3 weeks normally
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}

export function isOrderOverdue(order: CustomOrder): boolean {
  if (order.status === CustomOrderStatus.DELIVERED ||
      order.status === CustomOrderStatus.CANCELLED) {
    return false;
  }

  const today = new Date().toISOString().split('T')[0];
  return order.timeline.expectedCompletionDate < today;
}

// Labels
export const CUSTOM_ORDER_STATUS_LABELS: Record<CustomOrderStatus, string> = {
  [CustomOrderStatus.ENQUIRY]: 'Enquiry',
  [CustomOrderStatus.DESIGN_PENDING]: 'Design Pending',
  [CustomOrderStatus.DESIGN_APPROVED]: 'Design Approved',
  [CustomOrderStatus.ADVANCE_PENDING]: 'Advance Pending',
  [CustomOrderStatus.IN_PRODUCTION]: 'In Production',
  [CustomOrderStatus.QC_PENDING]: 'Quality Check',
  [CustomOrderStatus.READY_FOR_DELIVERY]: 'Ready for Delivery',
  [CustomOrderStatus.DELIVERED]: 'Delivered',
  [CustomOrderStatus.CANCELLED]: 'Cancelled'
};

export const CUSTOM_ORDER_STATUS_COLORS: Record<CustomOrderStatus, string> = {
  [CustomOrderStatus.ENQUIRY]: '#718096',
  [CustomOrderStatus.DESIGN_PENDING]: '#ed8936',
  [CustomOrderStatus.DESIGN_APPROVED]: '#4299e1',
  [CustomOrderStatus.ADVANCE_PENDING]: '#e53e3e',
  [CustomOrderStatus.IN_PRODUCTION]: '#9f7aea',
  [CustomOrderStatus.QC_PENDING]: '#38b2ac',
  [CustomOrderStatus.READY_FOR_DELIVERY]: '#48bb78',
  [CustomOrderStatus.DELIVERED]: '#38a169',
  [CustomOrderStatus.CANCELLED]: '#a0aec0'
};

export const CUSTOM_ORDER_PRIORITY_LABELS: Record<CustomOrderPriority, string> = {
  [CustomOrderPriority.NORMAL]: 'Normal',
  [CustomOrderPriority.HIGH]: 'High Priority',
  [CustomOrderPriority.URGENT]: 'Urgent'
};

export const CUSTOM_ORDER_PRIORITY_COLORS: Record<CustomOrderPriority, string> = {
  [CustomOrderPriority.NORMAL]: '#718096',
  [CustomOrderPriority.HIGH]: '#ed8936',
  [CustomOrderPriority.URGENT]: '#e53e3e'
};
