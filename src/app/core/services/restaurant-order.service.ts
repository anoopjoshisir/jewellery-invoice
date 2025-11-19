import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy, Timestamp } from '@angular/fire/firestore';
import {
  RestaurantOrder,
  OrderItem,
  OrderType,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  Payment,
  OrderStatusHistory,
  OrderItemStatus,
  OrderSummary,
  calculateOrderSubtotal,
  calculateOrderTax,
  calculateOrderTotal,
  calculatePendingAmount,
  canOrderBeCancelled,
  canOrderBeModified,
  isOrderActive,
  getNextOrderStatus,
  generateOrderNumber,
  generateDisplayNumber,
  estimatePreparationTime
} from '../models/restaurant-order.model';

@Injectable({
  providedIn: 'root'
})
export class RestaurantOrderService {
  private ordersCollection = 'restaurant_orders';
  private orderSequenceDoc = 'order_sequences';

  constructor(private firestore: Firestore) {}

  // ==================== ORDER CRUD ====================

  async createOrder(order: Omit<RestaurantOrder, 'id' | 'orderNumber' | 'displayNumber'>): Promise<string> {
    const ref = doc(collection(this.firestore, this.ordersCollection));
    const now = new Date().toISOString();

    // Generate order number and display number
    const sequence = await this.getNextSequence(order.type);
    const orderNumber = generateOrderNumber(order.type, sequence);
    const displayNumber = generateDisplayNumber(sequence);

    // Calculate pricing
    const subtotal = calculateOrderSubtotal(order.items);
    const taxAmount = calculateOrderTax(order.items);

    const orderData: RestaurantOrder = {
      ...order,
      id: ref.id,
      orderNumber,
      displayNumber,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      taxAmount,
      totalAmount: calculateOrderTotal({
        ...order,
        subtotal,
        taxAmount
      }),
      paidAmount: 0,
      pendingAmount: 0, // Will be calculated after total
      kotIds: [],
      statusHistory: [
        {
          status: order.status,
          timestamp: now,
          userId: order.createdBy,
          userName: order.takenByName,
          notes: 'Order created'
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    // Calculate pending amount
    orderData.pendingAmount = calculatePendingAmount(orderData);

    await setDoc(ref, orderData);
    return ref.id;
  }

  async getOrderById(id: string): Promise<RestaurantOrder | null> {
    const docRef = doc(this.firestore, this.ordersCollection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as RestaurantOrder) : null;
  }

  async getOrderByNumber(orderNumber: string): Promise<RestaurantOrder | null> {
    const q = query(
      collection(this.firestore, this.ordersCollection),
      where('orderNumber', '==', orderNumber)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as RestaurantOrder);
  }

  async getOrdersByTenant(tenantId: string): Promise<RestaurantOrder[]> {
    const q = query(
      collection(this.firestore, this.ordersCollection),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantOrder);
  }

  async getOrdersByStatus(tenantId: string, status: OrderStatus): Promise<RestaurantOrder[]> {
    const q = query(
      collection(this.firestore, this.ordersCollection),
      where('tenantId', '==', tenantId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantOrder);
  }

  async getOrdersByType(tenantId: string, type: OrderType): Promise<RestaurantOrder[]> {
    const q = query(
      collection(this.firestore, this.ordersCollection),
      where('tenantId', '==', tenantId),
      where('type', '==', type),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantOrder);
  }

  async getOrdersByDate(tenantId: string, date: string): Promise<RestaurantOrder[]> {
    const q = query(
      collection(this.firestore, this.ordersCollection),
      where('tenantId', '==', tenantId),
      where('orderDate', '==', date),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantOrder);
  }

  async getOrdersByTable(tableId: string): Promise<RestaurantOrder[]> {
    const q = query(
      collection(this.firestore, this.ordersCollection),
      where('tableId', '==', tableId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantOrder);
  }

  async getActiveOrders(tenantId: string): Promise<RestaurantOrder[]> {
    const orders = await this.getOrdersByTenant(tenantId);
    return orders.filter(order => isOrderActive(order));
  }

  async getTodaysOrders(tenantId: string): Promise<RestaurantOrder[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getOrdersByDate(tenantId, today);
  }

  async updateOrder(id: string, updates: Partial<RestaurantOrder>): Promise<void> {
    const docRef = doc(this.firestore, this.ordersCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteOrder(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.ordersCollection, id);
    await deleteDoc(docRef);
  }

  // ==================== ORDER ITEMS ====================

  async addItem(orderId: string, item: OrderItem, updatedBy: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    if (!canOrderBeModified(order)) {
      throw new Error('Order cannot be modified in current status');
    }

    const items = [...order.items, item];
    const subtotal = calculateOrderSubtotal(items);
    const taxAmount = calculateOrderTax(items);
    const totalAmount = calculateOrderTotal({
      ...order,
      subtotal,
      taxAmount
    });

    await this.updateOrder(orderId, {
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      taxAmount,
      totalAmount,
      pendingAmount: totalAmount - order.paidAmount,
      updatedBy
    });
  }

  async updateItem(orderId: string, itemId: string, updates: Partial<OrderItem>, updatedBy: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    if (!canOrderBeModified(order)) {
      throw new Error('Order cannot be modified in current status');
    }

    const items = order.items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    const subtotal = calculateOrderSubtotal(items);
    const taxAmount = calculateOrderTax(items);
    const totalAmount = calculateOrderTotal({
      ...order,
      subtotal,
      taxAmount
    });

    await this.updateOrder(orderId, {
      items,
      subtotal,
      taxAmount,
      totalAmount,
      pendingAmount: totalAmount - order.paidAmount,
      updatedBy
    });
  }

  async removeItem(orderId: string, itemId: string, updatedBy: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    if (!canOrderBeModified(order)) {
      throw new Error('Order cannot be modified in current status');
    }

    const items = order.items.filter(item => item.id !== itemId);

    if (items.length === 0) {
      throw new Error('Cannot remove last item from order');
    }

    const subtotal = calculateOrderSubtotal(items);
    const taxAmount = calculateOrderTax(items);
    const totalAmount = calculateOrderTotal({
      ...order,
      subtotal,
      taxAmount
    });

    await this.updateOrder(orderId, {
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      taxAmount,
      totalAmount,
      pendingAmount: totalAmount - order.paidAmount,
      updatedBy
    });
  }

  async cancelItem(orderId: string, itemId: string, reason: string, cancelledBy: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const items = order.items.map(item =>
      item.id === itemId
        ? {
            ...item,
            isCancelled: true,
            cancelledAt: new Date().toISOString(),
            cancelledBy,
            cancellationReason: reason,
            status: OrderItemStatus.CANCELLED
          }
        : item
    );

    const subtotal = calculateOrderSubtotal(items);
    const taxAmount = calculateOrderTax(items);
    const totalAmount = calculateOrderTotal({
      ...order,
      subtotal,
      taxAmount
    });

    await this.updateOrder(orderId, {
      items,
      subtotal,
      taxAmount,
      totalAmount,
      pendingAmount: totalAmount - order.paidAmount,
      updatedBy: cancelledBy
    });
  }

  // ==================== ORDER STATUS ====================

  async updateOrderStatus(orderId: string, status: OrderStatus, userId: string, userName: string, notes?: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const statusHistory: OrderStatusHistory[] = [
      ...order.statusHistory,
      {
        status,
        timestamp: new Date().toISOString(),
        userId,
        userName,
        notes
      }
    ];

    const updates: Partial<RestaurantOrder> = {
      status,
      statusHistory,
      updatedBy: userId
    };

    // Set timestamps based on status
    if (status === OrderStatus.COMPLETED) {
      updates.actualCompletionTime = new Date().toISOString();
    }

    await this.updateOrder(orderId, updates);
  }

  async moveToNextStatus(orderId: string, userId: string, userName: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const nextStatus = getNextOrderStatus(order.status, order.type);
    if (!nextStatus) {
      throw new Error('Order is already at final status');
    }

    await this.updateOrderStatus(orderId, nextStatus, userId, userName);
  }

  async cancelOrder(orderId: string, reason: string, cancelledBy: string, cancelledByName: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    if (!canOrderBeCancelled(order)) {
      throw new Error('Order cannot be cancelled in current status');
    }

    await this.updateOrderStatus(orderId, OrderStatus.CANCELLED, cancelledBy, cancelledByName, reason);
    await this.updateOrder(orderId, {
      cancelledAt: new Date().toISOString(),
      cancelledBy,
      cancellationReason: reason
    });
  }

  // ==================== PAYMENTS ====================

  async addPayment(orderId: string, payment: Omit<Payment, 'id'>): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const paymentWithId: Payment = {
      ...payment,
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const payments = [...order.payments, paymentWithId];
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = Math.max(0, order.totalAmount - paidAmount);

    let paymentStatus: PaymentStatus;
    if (pendingAmount === 0) {
      paymentStatus = PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = PaymentStatus.PARTIAL;
    } else {
      paymentStatus = PaymentStatus.PENDING;
    }

    await this.updateOrder(orderId, {
      payments,
      paidAmount,
      pendingAmount,
      paymentStatus,
      billedBy: payment.paidBy
    });

    // Auto-complete order if fully paid and ready/served
    if (paymentStatus === PaymentStatus.PAID &&
        [OrderStatus.READY, OrderStatus.SERVED, OrderStatus.DELIVERED].includes(order.status)) {
      await this.updateOrderStatus(orderId, OrderStatus.COMPLETED, payment.paidBy, 'System', 'Payment completed');
    }
  }

  async refundPayment(orderId: string, paymentId: string, refundAmount: number, refundedBy: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const payment = order.payments.find(p => p.id === paymentId);
    if (!payment) throw new Error('Payment not found');

    if (refundAmount > payment.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    // Create refund as negative payment
    const refund: Payment = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: payment.method,
      amount: -refundAmount,
      paidAt: new Date().toISOString(),
      paidBy: refundedBy,
      notes: `Refund for payment ${paymentId}`
    };

    const payments = [...order.payments, refund];
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = Math.max(0, order.totalAmount - paidAmount);

    await this.updateOrder(orderId, {
      payments,
      paidAmount,
      pendingAmount,
      paymentStatus: paidAmount === 0 ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL
    });
  }

  // ==================== DISCOUNTS ====================

  async applyDiscount(orderId: string, discountAmount: number, discountCode?: string, discountReason?: string, appliedBy?: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    if (discountAmount < 0 || discountAmount > order.subtotal) {
      throw new Error('Invalid discount amount');
    }

    const totalAmount = calculateOrderTotal({
      ...order,
      discountAmount
    });

    const discountPercentage = order.subtotal > 0
      ? Math.round((discountAmount / order.subtotal) * 100)
      : 0;

    await this.updateOrder(orderId, {
      discountAmount,
      discountCode,
      discountReason,
      discountPercentage,
      totalAmount,
      pendingAmount: totalAmount - order.paidAmount,
      updatedBy: appliedBy || order.createdBy
    });
  }

  async removeDiscount(orderId: string, updatedBy: string): Promise<void> {
    await this.applyDiscount(orderId, 0, undefined, undefined, updatedBy);
  }

  // ==================== SUMMARIES ====================

  async getOrderSummary(tenantId: string, date?: string): Promise<OrderSummary> {
    const orders = date
      ? await this.getOrdersByDate(tenantId, date)
      : await this.getTodaysOrders(tenantId);

    const summary: OrderSummary = {
      totalOrders: orders.length,
      pendingOrders: 0,
      preparingOrders: 0,
      readyOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      dineInOrders: 0,
      takeawayOrders: 0,
      deliveryOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      paymentPending: 0
    };

    orders.forEach(order => {
      // Count by status
      switch (order.status) {
        case OrderStatus.PENDING:
        case OrderStatus.CONFIRMED:
          summary.pendingOrders++;
          break;
        case OrderStatus.PREPARING:
          summary.preparingOrders++;
          break;
        case OrderStatus.READY:
        case OrderStatus.OUT_FOR_DELIVERY:
          summary.readyOrders++;
          break;
        case OrderStatus.COMPLETED:
        case OrderStatus.DELIVERED:
          summary.completedOrders++;
          break;
        case OrderStatus.CANCELLED:
        case OrderStatus.REJECTED:
          summary.cancelledOrders++;
          break;
      }

      // Count by type
      switch (order.type) {
        case OrderType.DINE_IN:
          summary.dineInOrders++;
          break;
        case OrderType.TAKEAWAY:
          summary.takeawayOrders++;
          break;
        case OrderType.DELIVERY:
        case OrderType.ONLINE:
          summary.deliveryOrders++;
          break;
      }

      // Revenue (only completed orders)
      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED) {
        summary.totalRevenue += order.totalAmount;
      }

      // Payment pending
      summary.paymentPending += order.pendingAmount;
    });

    summary.averageOrderValue = summary.completedOrders > 0
      ? Math.round(summary.totalRevenue / summary.completedOrders)
      : 0;

    return summary;
  }

  // ==================== HELPERS ====================

  private async getNextSequence(orderType: OrderType): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const sequenceId = `${orderType}_${today}`;

    const docRef = doc(this.firestore, this.orderSequenceDoc, sequenceId);
    const docSnap = await getDoc(docRef);

    let sequence = 1;
    if (docSnap.exists()) {
      sequence = (docSnap.data()['sequence'] || 0) + 1;
    }

    await setDoc(docRef, { sequence, lastUpdated: new Date().toISOString() });
    return sequence;
  }

  async linkKOT(orderId: string, kotId: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const kotIds = [...order.kotIds, kotId];
    await this.updateOrder(orderId, { kotIds });
  }

  async updateItemKOT(orderId: string, itemId: string, kotId: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const items = order.items.map(item =>
      item.id === itemId ? { ...item, kotId, status: OrderItemStatus.SENT_TO_KITCHEN } : item
    );

    await this.updateOrder(orderId, { items });
  }
}
