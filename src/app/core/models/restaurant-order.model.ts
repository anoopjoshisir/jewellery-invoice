/**
 * Restaurant Order Management Models
 *
 * Defines data structures for restaurant order management including:
 * - Orders (dine-in, takeaway, delivery)
 * - Order items with customizations
 * - Order status tracking
 * - Payment information
 */

import { MenuItem, MenuItemVariant, MenuItemModifier } from './menu-item.model';

export enum OrderType {
  DINE_IN = 'dine_in',
  TAKEAWAY = 'takeaway',
  DELIVERY = 'delivery',
  ONLINE = 'online'
}

export enum OrderStatus {
  PENDING = 'pending', // Order placed, awaiting confirmation
  CONFIRMED = 'confirmed', // Order confirmed
  PREPARING = 'preparing', // Kitchen is preparing
  READY = 'ready', // Ready for serving/pickup
  SERVED = 'served', // Served to customer (dine-in)
  OUT_FOR_DELIVERY = 'out_for_delivery', // Delivery in progress
  DELIVERED = 'delivered', // Delivered to customer
  COMPLETED = 'completed', // Payment received, order closed
  CANCELLED = 'cancelled', // Order cancelled
  REJECTED = 'rejected' // Order rejected by restaurant
}

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  WALLET = 'wallet',
  ONLINE = 'online',
  CREDIT = 'credit' // Pay later / credit
}

export interface OrderItemCustomization {
  modifierId: string;
  modifierName: string;
  price: number;
}

export interface OrderItem {
  id: string; // Unique ID for this order item
  menuItemId: string;
  menuItemName: string;

  // Variant (if applicable)
  variantId?: string;
  variantName?: string;

  // Quantity and Pricing
  quantity: number;
  unitPrice: number; // Base price (including variant)
  customizations: OrderItemCustomization[]; // Modifiers
  customizationTotal: number; // Total of all customization prices
  itemTotal: number; // (unitPrice + customizationTotal) * quantity
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;

  // Special Instructions
  specialInstructions?: string;

  // Status
  status: OrderItemStatus;
  kotId?: string; // Reference to KOT if generated

  // Preparation
  preparationTime: number; // Minutes
  startedPreparingAt?: string;
  readyAt?: string;

  // Serving
  servedAt?: string;
  servedBy?: string;

  // Cancellation
  isCancelled: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;

  // Notes
  kitchenNotes?: string;

  // Timestamps
  addedAt: string;
}

export enum OrderItemStatus {
  PENDING = 'pending',
  SENT_TO_KITCHEN = 'sent_to_kitchen',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled'
}

export interface RestaurantOrder {
  id?: string;
  tenantId: string;

  // Order Identification
  orderNumber: string; // Human-readable order number (e.g., "ORD-001", "DIN-042")
  displayNumber?: string; // Short display number for KOT/token

  // Order Type
  type: OrderType;
  status: OrderStatus;

  // Customer Information
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;

  // Table Information (for dine-in)
  tableId?: string;
  tableNumber?: string;
  guestCount?: number;

  // Delivery Information (for delivery orders)
  deliveryAddress?: DeliveryAddress;
  deliveryInstructions?: string;
  deliveryFee?: number;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryPersonId?: string;
  deliveryPersonName?: string;

  // Order Items
  items: OrderItem[];
  itemCount: number; // Total items (sum of quantities)

  // Pricing
  subtotal: number; // Sum of all item totals (before tax)
  taxAmount: number; // Total tax
  discountAmount: number;
  packagingCharges?: number;
  deliveryCharges?: number;
  serviceCharges?: number;
  otherCharges?: number;
  totalAmount: number; // Final amount to pay

  // Discounts
  discountCode?: string;
  discountPercentage?: number;
  discountReason?: string;

  // Payment
  paymentStatus: PaymentStatus;
  payments: Payment[];
  paidAmount: number;
  pendingAmount: number;

  // Timing
  orderDate: string; // ISO date string
  orderTime: string; // HH:mm format
  expectedCompletionTime?: string; // When order should be ready
  actualCompletionTime?: string;

  // Staff
  takenBy: string; // User ID who took the order
  takenByName: string;
  assignedTo?: string; // Chef/kitchen staff assigned
  servedBy?: string;
  billedBy?: string;

  // KOT References
  kotIds: string[]; // References to generated KOTs

  // Status Tracking
  statusHistory: OrderStatusHistory[];

  // Special Requests
  specialRequests?: string;
  allergies?: string[];

  // Source
  source: OrderSource;
  sourceInfo?: string; // Additional source details

  // Cancellation
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;

  // Notes
  notes?: string;
  kitchenNotes?: string;

  // Ratings & Feedback
  rating?: number;
  feedback?: string;
  feedbackDate?: string;

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface DeliveryAddress {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  transactionId?: string;
  reference?: string;
  paidAt: string;
  paidBy: string; // User ID
  notes?: string;
}

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  userId: string;
  userName: string;
  notes?: string;
}

export enum OrderSource {
  POS = 'pos', // Point of Sale (in-restaurant)
  ONLINE = 'online', // Own online ordering
  PHONE = 'phone', // Phone order
  AGGREGATOR = 'aggregator', // Zomato, Swiggy, etc.
  QR_CODE = 'qr_code', // Table QR code
  KIOSK = 'kiosk' // Self-service kiosk
}

// Helper interfaces
export interface OrderSummary {
  totalOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;

  dineInOrders: number;
  takeawayOrders: number;
  deliveryOrders: number;

  totalRevenue: number;
  averageOrderValue: number;

  paymentPending: number;
}

export interface DailySummary {
  date: string;
  orders: OrderSummary;
  topItems: { itemName: string; quantity: number; revenue: number }[];
  hourlyDistribution: { hour: number; orders: number; revenue: number }[];
}

// Constants
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  [OrderType.DINE_IN]: 'Dine In',
  [OrderType.TAKEAWAY]: 'Takeaway',
  [OrderType.DELIVERY]: 'Delivery',
  [OrderType.ONLINE]: 'Online'
};

export const ORDER_TYPE_ICONS: Record<OrderType, string> = {
  [OrderType.DINE_IN]: '🍽️',
  [OrderType.TAKEAWAY]: '🥡',
  [OrderType.DELIVERY]: '🛵',
  [OrderType.ONLINE]: '💻'
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pending',
  [OrderStatus.CONFIRMED]: 'Confirmed',
  [OrderStatus.PREPARING]: 'Preparing',
  [OrderStatus.READY]: 'Ready',
  [OrderStatus.SERVED]: 'Served',
  [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.COMPLETED]: 'Completed',
  [OrderStatus.CANCELLED]: 'Cancelled',
  [OrderStatus.REJECTED]: 'Rejected'
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '#f59e0b',
  [OrderStatus.CONFIRMED]: '#3b82f6',
  [OrderStatus.PREPARING]: '#8b5cf6',
  [OrderStatus.READY]: '#10b981',
  [OrderStatus.SERVED]: '#06b6d4',
  [OrderStatus.OUT_FOR_DELIVERY]: '#f97316',
  [OrderStatus.DELIVERED]: '#10b981',
  [OrderStatus.COMPLETED]: '#6b7280',
  [OrderStatus.CANCELLED]: '#ef4444',
  [OrderStatus.REJECTED]: '#dc2626'
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.UPI]: 'UPI',
  [PaymentMethod.WALLET]: 'Wallet',
  [PaymentMethod.ONLINE]: 'Online',
  [PaymentMethod.CREDIT]: 'Credit'
};

// Utility functions
export function calculateOrderSubtotal(items: OrderItem[]): number {
  return items
    .filter(item => !item.isCancelled)
    .reduce((sum, item) => sum + item.itemTotal, 0);
}

export function calculateOrderTax(items: OrderItem[]): number {
  return items
    .filter(item => !item.isCancelled)
    .reduce((sum, item) => sum + item.taxAmount, 0);
}

export function calculateOrderTotal(order: Partial<RestaurantOrder>): number {
  let total = order.subtotal || 0;
  total += (order.taxAmount || 0);
  total += (order.packagingCharges || 0);
  total += (order.deliveryCharges || 0);
  total += (order.serviceCharges || 0);
  total += (order.otherCharges || 0);
  total -= (order.discountAmount || 0);
  return Math.round(total * 100) / 100;
}

export function calculatePendingAmount(order: RestaurantOrder): number {
  return Math.max(0, order.totalAmount - order.paidAmount);
}

export function canOrderBeCancelled(order: RestaurantOrder): boolean {
  return [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED
  ].includes(order.status);
}

export function canOrderBeModified(order: RestaurantOrder): boolean {
  return [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED
  ].includes(order.status);
}

export function isOrderActive(order: RestaurantOrder): boolean {
  return ![
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED
  ].includes(order.status);
}

export function getNextOrderStatus(currentStatus: OrderStatus, orderType: OrderType): OrderStatus | null {
  const statusFlow: Record<OrderType, Record<OrderStatus, OrderStatus | null>> = {
    [OrderType.DINE_IN]: {
      [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
      [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
      [OrderStatus.PREPARING]: OrderStatus.READY,
      [OrderStatus.READY]: OrderStatus.SERVED,
      [OrderStatus.SERVED]: OrderStatus.COMPLETED,
      [OrderStatus.COMPLETED]: null,
      [OrderStatus.CANCELLED]: null,
      [OrderStatus.REJECTED]: null,
      [OrderStatus.OUT_FOR_DELIVERY]: null,
      [OrderStatus.DELIVERED]: null
    },
    [OrderType.TAKEAWAY]: {
      [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
      [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
      [OrderStatus.PREPARING]: OrderStatus.READY,
      [OrderStatus.READY]: OrderStatus.COMPLETED,
      [OrderStatus.COMPLETED]: null,
      [OrderStatus.CANCELLED]: null,
      [OrderStatus.REJECTED]: null,
      [OrderStatus.SERVED]: null,
      [OrderStatus.OUT_FOR_DELIVERY]: null,
      [OrderStatus.DELIVERED]: null
    },
    [OrderType.DELIVERY]: {
      [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
      [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
      [OrderStatus.PREPARING]: OrderStatus.READY,
      [OrderStatus.READY]: OrderStatus.OUT_FOR_DELIVERY,
      [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
      [OrderStatus.DELIVERED]: OrderStatus.COMPLETED,
      [OrderStatus.COMPLETED]: null,
      [OrderStatus.CANCELLED]: null,
      [OrderStatus.REJECTED]: null,
      [OrderStatus.SERVED]: null
    },
    [OrderType.ONLINE]: {
      [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
      [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
      [OrderStatus.PREPARING]: OrderStatus.READY,
      [OrderStatus.READY]: OrderStatus.OUT_FOR_DELIVERY,
      [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
      [OrderStatus.DELIVERED]: OrderStatus.COMPLETED,
      [OrderStatus.COMPLETED]: null,
      [OrderStatus.CANCELLED]: null,
      [OrderStatus.REJECTED]: null,
      [OrderStatus.SERVED]: null
    }
  };

  return statusFlow[orderType]?.[currentStatus] || null;
}

export function generateOrderNumber(type: OrderType, sequence: number): string {
  const prefix = {
    [OrderType.DINE_IN]: 'DIN',
    [OrderType.TAKEAWAY]: 'TKW',
    [OrderType.DELIVERY]: 'DEL',
    [OrderType.ONLINE]: 'ONL'
  };

  return `${prefix[type]}-${sequence.toString().padStart(4, '0')}`;
}

export function generateDisplayNumber(sequence: number): string {
  return sequence.toString().padStart(3, '0');
}

export function estimatePreparationTime(items: OrderItem[]): number {
  if (items.length === 0) return 0;
  // Return the maximum preparation time among all items
  return Math.max(...items.map(item => item.preparationTime));
}
