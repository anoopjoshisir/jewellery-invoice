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
  updateDoc
} from '@angular/fire/firestore';
import {
  CustomOrder,
  CustomOrderStatus,
  CustomOrderPriority,
  CustomOrderSummary,
  CustomOrderNote,
  generateCustomOrderNumber,
  isOrderOverdue
} from '../models/custom-order.model';

@Injectable({
  providedIn: 'root'
})
export class CustomOrderService {
  private collectionName = 'customOrders';

  constructor(private firestore: Firestore) {}

  /**
   * Create a new custom order
   */
  async createOrder(order: Omit<CustomOrder, 'id' | 'orderNumber'>): Promise<string> {
    try {
      const orderCollection = collection(this.firestore, this.collectionName);
      const newDocRef = doc(orderCollection);

      // Generate order number
      const year = new Date().getFullYear();
      const sequence = await this.getNextSequence(order.tenantId, year);
      const orderNumber = generateCustomOrderNumber(year, sequence);

      const orderData: CustomOrder = {
        ...order,
        id: newDocRef.id,
        orderNumber,
        notes: order.notes || [],
        statusHistory: [
          {
            status: order.status,
            changedAt: new Date().toISOString(),
            changedBy: order.createdBy,
            changedByName: order.createdByName,
            remarks: 'Order created'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(newDocRef, orderData);
      return newDocRef.id;
    } catch (error) {
      console.error('Error creating custom order:', error);
      throw error;
    }
  }

  /**
   * Update custom order
   */
  async updateOrder(id: string, updates: Partial<CustomOrder>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating custom order:', error);
      throw error;
    }
  }

  /**
   * Update order status with history tracking
   */
  async updateStatus(
    id: string,
    newStatus: CustomOrderStatus,
    userId: string,
    userName: string,
    remarks?: string
  ): Promise<void> {
    try {
      const order = await this.getOrder(id);
      if (!order) {
        throw new Error('Order not found');
      }

      const statusHistory = order.statusHistory || [];
      statusHistory.push({
        status: newStatus,
        changedAt: new Date().toISOString(),
        changedBy: userId,
        changedByName: userName,
        remarks
      });

      await this.updateOrder(id, {
        status: newStatus,
        statusHistory,
        updatedBy: userId,
        updatedByName: userName
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(id: string): Promise<CustomOrder | null> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as CustomOrder;
    } catch (error) {
      console.error('Error getting custom order:', error);
      throw error;
    }
  }

  /**
   * Get all orders for tenant
   */
  async getAllOrders(tenantId: string): Promise<CustomOrder[]> {
    try {
      const orderCollection = collection(this.firestore, this.collectionName);
      const q = query(
        orderCollection,
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as CustomOrder);
    } catch (error) {
      console.error('Error getting all orders:', error);
      throw error;
    }
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(
    tenantId: string,
    status: CustomOrderStatus
  ): Promise<CustomOrder[]> {
    try {
      const orderCollection = collection(this.firestore, this.collectionName);
      const q = query(
        orderCollection,
        where('tenantId', '==', tenantId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as CustomOrder);
    } catch (error) {
      console.error('Error getting orders by status:', error);
      throw error;
    }
  }

  /**
   * Get orders by customer
   */
  async getOrdersByCustomer(
    tenantId: string,
    customerId: string
  ): Promise<CustomOrder[]> {
    try {
      const orderCollection = collection(this.firestore, this.collectionName);
      const q = query(
        orderCollection,
        where('tenantId', '==', tenantId),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as CustomOrder);
    } catch (error) {
      console.error('Error getting customer orders:', error);
      throw error;
    }
  }

  /**
   * Get in-production orders
   */
  async getInProductionOrders(tenantId: string): Promise<CustomOrder[]> {
    const productionStatuses = [
      CustomOrderStatus.IN_PRODUCTION,
      CustomOrderStatus.QC_PENDING
    ];

    const orders = await this.getAllOrders(tenantId);
    return orders.filter(o => productionStatuses.includes(o.status));
  }

  /**
   * Get overdue orders
   */
  async getOverdueOrders(tenantId: string): Promise<CustomOrder[]> {
    const orders = await this.getAllOrders(tenantId);
    return orders.filter(o => isOrderOverdue(o));
  }

  /**
   * Get pending advance orders
   */
  async getPendingAdvanceOrders(tenantId: string): Promise<CustomOrder[]> {
    const orders = await this.getAllOrders(tenantId);
    return orders.filter(
      o => !o.payment.advancePaid &&
           o.status !== CustomOrderStatus.CANCELLED &&
           o.status !== CustomOrderStatus.ENQUIRY
    );
  }

  /**
   * Add note to order
   */
  async addNote(
    orderId: string,
    note: string,
    userId: string,
    userName: string,
    isInternal: boolean = true
  ): Promise<void> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const newNote: CustomOrderNote = {
        date: new Date().toISOString(),
        note,
        addedBy: userId,
        addedByName: userName,
        isInternal
      };

      const notes = order.notes || [];
      notes.push(newNote);

      await this.updateOrder(orderId, { notes });
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }

  /**
   * Record advance payment
   */
  async recordAdvancePayment(
    orderId: string,
    paymentMode: string,
    receiptNumber: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const payment = {
        ...order.payment,
        advancePaid: true,
        advancePaidDate: new Date().toISOString().split('T')[0],
        advancePaymentMode: paymentMode,
        advanceReceiptNumber: receiptNumber
      };

      await this.updateOrder(orderId, {
        payment,
        updatedBy: userId,
        updatedByName: userName
      });

      // Update status if it was pending advance
      if (order.status === CustomOrderStatus.ADVANCE_PENDING) {
        await this.updateStatus(
          orderId,
          CustomOrderStatus.IN_PRODUCTION,
          userId,
          userName,
          'Advance received, moving to production'
        );
      }
    } catch (error) {
      console.error('Error recording advance payment:', error);
      throw error;
    }
  }

  /**
   * Record final payment and delivery
   */
  async recordFinalPaymentAndDelivery(
    orderId: string,
    paymentMode: string,
    receiptNumber: string,
    invoiceId: string,
    invoiceNumber: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const payment = {
        ...order.payment,
        balancePaid: true,
        balancePaidDate: new Date().toISOString().split('T')[0],
        balancePaymentMode: paymentMode,
        balanceReceiptNumber: receiptNumber
      };

      const timeline = {
        ...order.timeline,
        deliveryDate: new Date().toISOString().split('T')[0]
      };

      await this.updateOrder(orderId, {
        payment,
        timeline,
        invoiceId,
        invoiceNumber,
        updatedBy: userId,
        updatedByName: userName
      });

      await this.updateStatus(
        orderId,
        CustomOrderStatus.DELIVERED,
        userId,
        userName,
        `Delivered with invoice ${invoiceNumber}`
      );
    } catch (error) {
      console.error('Error recording final payment:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      await this.updateStatus(
        orderId,
        CustomOrderStatus.CANCELLED,
        userId,
        userName,
        `Cancelled: ${reason}`
      );
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Get order summary
   */
  async getOrderSummary(tenantId: string): Promise<CustomOrderSummary> {
    try {
      const orders = await this.getAllOrders(tenantId);

      const summary: CustomOrderSummary = {
        totalOrders: orders.length,
        enquiries: 0,
        inProduction: 0,
        readyForDelivery: 0,
        delivered: 0,
        cancelled: 0,
        totalEstimatedValue: 0,
        totalAdvanceCollected: 0,
        totalPendingAdvance: 0,
        overdueOrders: 0,
        statusBreakdown: {
          [CustomOrderStatus.ENQUIRY]: 0,
          [CustomOrderStatus.DESIGN_PENDING]: 0,
          [CustomOrderStatus.DESIGN_APPROVED]: 0,
          [CustomOrderStatus.ADVANCE_PENDING]: 0,
          [CustomOrderStatus.IN_PRODUCTION]: 0,
          [CustomOrderStatus.QC_PENDING]: 0,
          [CustomOrderStatus.READY_FOR_DELIVERY]: 0,
          [CustomOrderStatus.DELIVERED]: 0,
          [CustomOrderStatus.CANCELLED]: 0
        }
      };

      orders.forEach(order => {
        summary.statusBreakdown[order.status]++;

        switch (order.status) {
          case CustomOrderStatus.ENQUIRY:
            summary.enquiries++;
            break;
          case CustomOrderStatus.IN_PRODUCTION:
          case CustomOrderStatus.QC_PENDING:
            summary.inProduction++;
            break;
          case CustomOrderStatus.READY_FOR_DELIVERY:
            summary.readyForDelivery++;
            break;
          case CustomOrderStatus.DELIVERED:
            summary.delivered++;
            break;
          case CustomOrderStatus.CANCELLED:
            summary.cancelled++;
            break;
        }

        // Financial calculations
        if (order.status !== CustomOrderStatus.CANCELLED) {
          summary.totalEstimatedValue += order.materials.totalEstimate;

          if (order.payment.advancePaid) {
            summary.totalAdvanceCollected += order.payment.advanceAmount;
          } else if (order.status !== CustomOrderStatus.ENQUIRY) {
            summary.totalPendingAdvance += order.payment.advanceAmount;
          }
        }

        // Overdue check
        if (isOrderOverdue(order)) {
          summary.overdueOrders++;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error getting order summary:', error);
      throw error;
    }
  }

  /**
   * Search orders
   */
  async searchOrders(tenantId: string, searchTerm: string): Promise<CustomOrder[]> {
    try {
      const orders = await this.getAllOrders(tenantId);
      const term = searchTerm.toLowerCase();

      return orders.filter(
        order =>
          order.orderNumber.toLowerCase().includes(term) ||
          order.customerName.toLowerCase().includes(term) ||
          order.customerMobile.includes(term) ||
          order.design.description.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching orders:', error);
      throw error;
    }
  }

  /**
   * Get next sequence for order number
   */
  private async getNextSequence(tenantId: string, year: number): Promise<number> {
    try {
      const orderCollection = collection(this.firestore, this.collectionName);
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const q = query(
        orderCollection,
        where('tenantId', '==', tenantId),
        where('createdAt', '>=', yearStart),
        where('createdAt', '<=', yearEnd + 'T23:59:59'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return 1;
      }

      const lastOrder = querySnapshot.docs[0].data() as CustomOrder;
      const match = lastOrder.orderNumber.match(/CO-\d{4}-(\d{4})/);

      if (match) {
        return parseInt(match[1]) + 1;
      }

      return 1;
    } catch (error) {
      console.error('Error getting next sequence:', error);
      return 1;
    }
  }
}
