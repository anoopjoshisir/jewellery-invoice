/**
 * KOT (Kitchen Order Ticket) Models
 *
 * Defines data structures for kitchen order management including:
 * - KOT generation and tracking
 * - Kitchen station routing
 * - Status updates from kitchen
 * - Print formatting
 */

import { OrderItem, OrderType } from './restaurant-order.model';

export enum KOTStatus {
  PENDING = 'pending', // KOT generated, not yet started
  ACKNOWLEDGED = 'acknowledged', // Kitchen acknowledged receipt
  PREPARING = 'preparing', // Currently being prepared
  READY = 'ready', // Ready for serving
  SERVED = 'served', // Served to customer
  CANCELLED = 'cancelled' // Cancelled
}

export enum KOTPriority {
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum KitchenStation {
  HOT_KITCHEN = 'hot_kitchen', // Main cooking station
  COLD_KITCHEN = 'cold_kitchen', // Salads, desserts
  GRILL = 'grill', // Grill items
  TANDOOR = 'tandoor', // Tandoor items
  CHINESE = 'chinese', // Chinese wok station
  BEVERAGES = 'beverages', // Drinks counter
  DESSERTS = 'desserts', // Dessert section
  BAKERY = 'bakery', // Bakery section
  BAR = 'bar' // Bar counter
}

export interface KOTItem {
  id: string; // Same as OrderItem ID
  menuItemId: string;
  menuItemName: string;

  // Variant
  variantId?: string;
  variantName?: string;

  // Quantity
  quantity: number;

  // Customizations
  customizations: string[]; // List of modifier names
  specialInstructions?: string;

  // Status
  status: KOTStatus;
  startedAt?: string;
  readyAt?: string;

  // Kitchen Assignment
  kitchenStation: KitchenStation;

  // Timing
  preparationTime: number;
  estimatedReadyTime?: string;

  // Cancellation
  isCancelled: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface KOT {
  id?: string;
  tenantId: string;

  // Identification
  kotNumber: string; // Human-readable KOT number (e.g., "KOT-001", "K-042")
  displayNumber: string; // Short number for kitchen display (e.g., "42", "K12")

  // Order Reference
  orderId: string;
  orderNumber: string;
  orderType: OrderType;

  // Table/Customer Info
  tableNumber?: string;
  customerName?: string;
  guestCount?: number;

  // KOT Items
  items: KOTItem[];
  itemCount: number; // Total items (sum of quantities)

  // Kitchen Station
  primaryStation: KitchenStation; // Main station responsible
  assignedStations: KitchenStation[]; // All stations involved

  // Status
  status: KOTStatus;
  priority: KOTPriority;

  // Timing
  createdAt: string; // When KOT was generated
  printedAt?: string; // When KOT was printed
  acknowledgedAt?: string; // When kitchen acknowledged
  startedPreparingAt?: string; // When preparation started
  readyAt?: string; // When all items ready
  servedAt?: string; // When served to customer
  estimatedReadyTime?: string; // Calculated estimated ready time

  // Staff
  createdBy: string; // User ID who created KOT
  createdByName: string;
  acknowledgedBy?: string;
  preparedBy?: string; // Chef who prepared
  servedBy?: string;

  // Print Information
  printCount: number; // Number of times printed
  lastPrintedAt?: string;

  // Modifications
  isModification: boolean; // Is this a modification KOT?
  originalKOTId?: string; // If modification, reference to original
  modificationNotes?: string;

  // Cancellation
  isCancelled: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;

  // Special Notes
  kitchenNotes?: string;
  allergies?: string[];
  specialRequests?: string;

  // Status History
  statusHistory: KOTStatusHistory[];

  // Audit
  updatedAt: string;
  updatedBy: string;
}

export interface KOTStatusHistory {
  status: KOTStatus;
  timestamp: string;
  userId: string;
  userName: string;
  notes?: string;
}

// KOT Print Format
export interface KOTPrintData {
  kot: KOT;
  restaurantName: string;
  restaurantAddress?: string;
  printTime: string;
  printedBy: string;

  // Grouped items by station (for multi-station orders)
  itemsByStation: Map<KitchenStation, KOTItem[]>;

  // Display settings
  showPrices: boolean;
  showPreparationTime: boolean;
  fontSize: 'small' | 'medium' | 'large';
  copies: number;
}

// Kitchen Display Board Item
export interface KitchenDisplayItem {
  kot: KOT;
  elapsedTime: number; // Minutes since KOT creation
  estimatedTimeRemaining: number; // Minutes until ready
  isOverdue: boolean; // Past estimated time
  urgencyLevel: 'normal' | 'warning' | 'critical';
}

// Helper interfaces
export interface KOTSummary {
  totalKOTs: number;
  pendingKOTs: number;
  preparingKOTs: number;
  readyKOTs: number;
  servedKOTs: number;
  cancelledKOTs: number;

  averagePreparationTime: number; // Minutes
  oldestPendingKOT?: KOT;
  overdueKOTs: number;
}

export interface StationSummary {
  station: KitchenStation;
  pendingKOTs: number;
  preparingKOTs: number;
  readyKOTs: number;
  averagePreparationTime: number;
  currentLoad: number; // Percentage
}

// Constants
export const KITCHEN_STATION_LABELS: Record<KitchenStation, string> = {
  [KitchenStation.HOT_KITCHEN]: 'Hot Kitchen',
  [KitchenStation.COLD_KITCHEN]: 'Cold Kitchen',
  [KitchenStation.GRILL]: 'Grill',
  [KitchenStation.TANDOOR]: 'Tandoor',
  [KitchenStation.CHINESE]: 'Chinese',
  [KitchenStation.BEVERAGES]: 'Beverages',
  [KitchenStation.DESSERTS]: 'Desserts',
  [KitchenStation.BAKERY]: 'Bakery',
  [KitchenStation.BAR]: 'Bar'
};

export const KITCHEN_STATION_ICONS: Record<KitchenStation, string> = {
  [KitchenStation.HOT_KITCHEN]: '🔥',
  [KitchenStation.COLD_KITCHEN]: '🥗',
  [KitchenStation.GRILL]: '🍖',
  [KitchenStation.TANDOOR]: '🫓',
  [KitchenStation.CHINESE]: '🥘',
  [KitchenStation.BEVERAGES]: '☕',
  [KitchenStation.DESSERTS]: '🍰',
  [KitchenStation.BAKERY]: '🍞',
  [KitchenStation.BAR]: '🍺'
};

export const KOT_STATUS_LABELS: Record<KOTStatus, string> = {
  [KOTStatus.PENDING]: 'Pending',
  [KOTStatus.ACKNOWLEDGED]: 'Acknowledged',
  [KOTStatus.PREPARING]: 'Preparing',
  [KOTStatus.READY]: 'Ready',
  [KOTStatus.SERVED]: 'Served',
  [KOTStatus.CANCELLED]: 'Cancelled'
};

export const KOT_STATUS_COLORS: Record<KOTStatus, string> = {
  [KOTStatus.PENDING]: '#f59e0b',
  [KOTStatus.ACKNOWLEDGED]: '#3b82f6',
  [KOTStatus.PREPARING]: '#8b5cf6',
  [KOTStatus.READY]: '#10b981',
  [KOTStatus.SERVED]: '#6b7280',
  [KOTStatus.CANCELLED]: '#ef4444'
};

export const PRIORITY_LABELS: Record<KOTPriority, string> = {
  [KOTPriority.NORMAL]: 'Normal',
  [KOTPriority.HIGH]: 'High',
  [KOTPriority.URGENT]: 'Urgent'
};

export const PRIORITY_COLORS: Record<KOTPriority, string> = {
  [KOTPriority.NORMAL]: '#6b7280',
  [KOTPriority.HIGH]: '#f59e0b',
  [KOTPriority.URGENT]: '#ef4444'
};

// Utility functions
export function generateKOTNumber(sequence: number, prefix: string = 'KOT'): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  return `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}

export function generateKOTDisplayNumber(sequence: number): string {
  return sequence.toString().padStart(3, '0');
}

export function determineKitchenStation(itemName: string, tags: string[] = []): KitchenStation {
  const name = itemName.toLowerCase();
  const allTags = tags.map(t => t.toLowerCase());

  // Check tags first
  if (allTags.includes('beverage') || allTags.includes('drink')) {
    return KitchenStation.BEVERAGES;
  }
  if (allTags.includes('dessert')) {
    return KitchenStation.DESSERTS;
  }
  if (allTags.includes('bakery') || allTags.includes('bread')) {
    return KitchenStation.BAKERY;
  }
  if (allTags.includes('bar') || allTags.includes('alcohol')) {
    return KitchenStation.BAR;
  }

  // Check name patterns
  if (name.includes('tandoor') || name.includes('naan') || name.includes('roti')) {
    return KitchenStation.TANDOOR;
  }
  if (name.includes('grill') || name.includes('tikka') || name.includes('kebab')) {
    return KitchenStation.GRILL;
  }
  if (name.includes('chinese') || name.includes('noodles') || name.includes('manchurian') || name.includes('fried rice')) {
    return KitchenStation.CHINESE;
  }
  if (name.includes('salad') || name.includes('raita') || name.includes('cold')) {
    return KitchenStation.COLD_KITCHEN;
  }
  if (name.includes('juice') || name.includes('shake') || name.includes('coffee') || name.includes('tea')) {
    return KitchenStation.BEVERAGES;
  }
  if (name.includes('ice cream') || name.includes('pastry') || name.includes('cake')) {
    return KitchenStation.DESSERTS;
  }

  // Default to hot kitchen
  return KitchenStation.HOT_KITCHEN;
}

export function groupItemsByStation(items: KOTItem[]): Map<KitchenStation, KOTItem[]> {
  const grouped = new Map<KitchenStation, KOTItem[]>();

  items.forEach(item => {
    const station = item.kitchenStation;
    if (!grouped.has(station)) {
      grouped.set(station, []);
    }
    grouped.get(station)!.push(item);
  });

  return grouped;
}

export function calculateEstimatedReadyTime(items: KOTItem[], createdAt: string): string {
  const maxPrepTime = Math.max(...items.map(item => item.preparationTime));
  const created = new Date(createdAt);
  const ready = new Date(created.getTime() + maxPrepTime * 60000);
  return ready.toISOString();
}

export function getElapsedTime(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  return Math.floor((now.getTime() - created.getTime()) / 60000); // Minutes
}

export function getRemainingTime(estimatedReadyTime: string): number {
  const now = new Date();
  const ready = new Date(estimatedReadyTime);
  return Math.floor((ready.getTime() - now.getTime()) / 60000); // Minutes
}

export function isKOTOverdue(estimatedReadyTime: string): boolean {
  return getRemainingTime(estimatedReadyTime) < 0;
}

export function getUrgencyLevel(kot: KOT): 'normal' | 'warning' | 'critical' {
  if (kot.priority === KOTPriority.URGENT) return 'critical';
  if (kot.priority === KOTPriority.HIGH) return 'warning';

  if (!kot.estimatedReadyTime) return 'normal';

  const remaining = getRemainingTime(kot.estimatedReadyTime);
  const elapsed = getElapsedTime(kot.createdAt);

  if (remaining < 0) return 'critical'; // Overdue
  if (remaining < 5) return 'warning'; // Less than 5 minutes left
  if (elapsed > 30) return 'warning'; // Been waiting more than 30 minutes

  return 'normal';
}

export function canKOTBeCancelled(kot: KOT): boolean {
  return [
    KOTStatus.PENDING,
    KOTStatus.ACKNOWLEDGED
  ].includes(kot.status) && !kot.isCancelled;
}

export function canKOTBeModified(kot: KOT): boolean {
  return [
    KOTStatus.PENDING,
    KOTStatus.ACKNOWLEDGED
  ].includes(kot.status) && !kot.isCancelled;
}

export function getNextKOTStatus(currentStatus: KOTStatus): KOTStatus | null {
  const statusFlow: Record<KOTStatus, KOTStatus | null> = {
    [KOTStatus.PENDING]: KOTStatus.ACKNOWLEDGED,
    [KOTStatus.ACKNOWLEDGED]: KOTStatus.PREPARING,
    [KOTStatus.PREPARING]: KOTStatus.READY,
    [KOTStatus.READY]: KOTStatus.SERVED,
    [KOTStatus.SERVED]: null,
    [KOTStatus.CANCELLED]: null
  };

  return statusFlow[currentStatus] || null;
}

export function formatKOTPrintText(kot: KOT, restaurantName: string): string {
  const lines: string[] = [];

  // Header
  lines.push('='.repeat(40));
  lines.push(restaurantName.toUpperCase().padStart(20 + restaurantName.length / 2));
  lines.push('='.repeat(40));
  lines.push('');

  // KOT Info
  lines.push(`KOT No: ${kot.kotNumber}     Display: ${kot.displayNumber}`);
  lines.push(`Order No: ${kot.orderNumber}`);
  lines.push(`Type: ${kot.orderType.toUpperCase()}`);

  if (kot.tableNumber) {
    lines.push(`Table: ${kot.tableNumber}     Guests: ${kot.guestCount || '-'}`);
  }

  if (kot.customerName) {
    lines.push(`Customer: ${kot.customerName}`);
  }

  lines.push(`Time: ${new Date(kot.createdAt).toLocaleString()}`);

  if (kot.priority !== KOTPriority.NORMAL) {
    lines.push(`PRIORITY: ${PRIORITY_LABELS[kot.priority].toUpperCase()}`);
  }

  lines.push('-'.repeat(40));
  lines.push('');

  // Items
  lines.push('Items:');
  lines.push('');

  kot.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.menuItemName}${item.variantName ? ` (${item.variantName})` : ''}`);
    lines.push(`   Qty: ${item.quantity}`);

    if (item.customizations.length > 0) {
      lines.push(`   Customizations: ${item.customizations.join(', ')}`);
    }

    if (item.specialInstructions) {
      lines.push(`   ** ${item.specialInstructions} **`);
    }

    lines.push('');
  });

  // Special notes
  if (kot.allergies && kot.allergies.length > 0) {
    lines.push('⚠️  ALLERGIES: ' + kot.allergies.join(', '));
    lines.push('');
  }

  if (kot.specialRequests) {
    lines.push('Special Requests:');
    lines.push(kot.specialRequests);
    lines.push('');
  }

  if (kot.kitchenNotes) {
    lines.push('Kitchen Notes:');
    lines.push(kot.kitchenNotes);
    lines.push('');
  }

  lines.push('='.repeat(40));
  lines.push(`Prepared by: _________________`);
  lines.push('='.repeat(40));

  return lines.join('\n');
}
