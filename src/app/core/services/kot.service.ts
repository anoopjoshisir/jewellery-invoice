import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy } from '@angular/fire/firestore';
import {
  KOT,
  KOTItem,
  KOTStatus,
  KOTPriority,
  KitchenStation,
  KOTStatusHistory,
  KOTSummary,
  StationSummary,
  KOTPrintData,
  KitchenDisplayItem,
  generateKOTNumber,
  generateKOTDisplayNumber,
  determineKitchenStation,
  groupItemsByStation,
  calculateEstimatedReadyTime,
  getElapsedTime,
  getRemainingTime,
  isKOTOverdue,
  getUrgencyLevel,
  canKOTBeCancelled,
  canKOTBeModified,
  getNextKOTStatus,
  formatKOTPrintText
} from '../models/kot.model';
import { RestaurantOrder, OrderItem, OrderType } from '../models/restaurant-order.model';
import { MenuItem } from '../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class KOTService {
  private kotsCollection = 'kots';
  private kotSequenceDoc = 'kot_sequences';

  constructor(private firestore: Firestore) {}

  // ==================== KOT CRUD ====================

  async createKOT(kot: Omit<KOT, 'id' | 'kotNumber' | 'displayNumber'>): Promise<string> {
    const ref = doc(collection(this.firestore, this.kotsCollection));
    const now = new Date().toISOString();

    // Generate KOT number
    const sequence = await this.getNextSequence();
    const kotNumber = generateKOTNumber(sequence);
    const displayNumber = generateKOTDisplayNumber(sequence);

    // Determine primary station (most items)
    const stationCounts = new Map<KitchenStation, number>();
    kot.items.forEach(item => {
      const count = stationCounts.get(item.kitchenStation) || 0;
      stationCounts.set(item.kitchenStation, count + item.quantity);
    });

    let primaryStation = KitchenStation.HOT_KITCHEN;
    let maxCount = 0;
    stationCounts.forEach((count, station) => {
      if (count > maxCount) {
        maxCount = count;
        primaryStation = station;
      }
    });

    // Calculate estimated ready time
    const estimatedReadyTime = calculateEstimatedReadyTime(kot.items, now);

    const kotData: KOT = {
      ...kot,
      id: ref.id,
      kotNumber,
      displayNumber,
      itemCount: kot.items.reduce((sum, item) => sum + item.quantity, 0),
      primaryStation,
      assignedStations: Array.from(stationCounts.keys()),
      estimatedReadyTime,
      printCount: 0,
      statusHistory: [
        {
          status: kot.status,
          timestamp: now,
          userId: kot.createdBy,
          userName: kot.createdByName,
          notes: 'KOT created'
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    await setDoc(ref, kotData);
    return ref.id;
  }

  async createKOTFromOrder(
    order: RestaurantOrder,
    items: OrderItem[],
    menuItems: Map<string, MenuItem>,
    createdBy: string,
    createdByName: string
  ): Promise<string> {
    // Convert order items to KOT items
    const kotItems: KOTItem[] = items.map(orderItem => {
      const menuItem = menuItems.get(orderItem.menuItemId);
      const station = menuItem
        ? determineKitchenStation(menuItem.name, menuItem.tags)
        : KitchenStation.HOT_KITCHEN;

      return {
        id: orderItem.id,
        menuItemId: orderItem.menuItemId,
        menuItemName: orderItem.menuItemName,
        variantId: orderItem.variantId,
        variantName: orderItem.variantName,
        quantity: orderItem.quantity,
        customizations: orderItem.customizations.map(c => `${c.modifierName} (+₹${c.price})`),
        specialInstructions: orderItem.specialInstructions,
        status: KOTStatus.PENDING,
        kitchenStation: station,
        preparationTime: orderItem.preparationTime,
        isCancelled: false
      };
    });

    const kot: Omit<KOT, 'id' | 'kotNumber' | 'displayNumber'> = {
      tenantId: order.tenantId,
      orderId: order.id!,
      orderNumber: order.orderNumber,
      orderType: order.type,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      guestCount: order.guestCount,
      items: kotItems,
      itemCount: kotItems.reduce((sum, item) => sum + item.quantity, 0),
      primaryStation: KitchenStation.HOT_KITCHEN, // Will be calculated in createKOT
      assignedStations: [],
      status: KOTStatus.PENDING,
      priority: KOTPriority.NORMAL,
      createdBy,
      createdByName,
      isModification: false,
      isCancelled: false,
      statusHistory: [],
      updatedAt: new Date().toISOString()
    };

    // Add special requests and allergies
    if (order.specialRequests) {
      kot.specialRequests = order.specialRequests;
    }
    if (order.allergies && order.allergies.length > 0) {
      kot.allergies = order.allergies;
    }

    return await this.createKOT(kot);
  }

  async getKOTById(id: string): Promise<KOT | null> {
    const docRef = doc(this.firestore, this.kotsCollection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as KOT) : null;
  }

  async getKOTByNumber(kotNumber: string): Promise<KOT | null> {
    const q = query(
      collection(this.firestore, this.kotsCollection),
      where('kotNumber', '==', kotNumber)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as KOT);
  }

  async getKOTsByTenant(tenantId: string): Promise<KOT[]> {
    const q = query(
      collection(this.firestore, this.kotsCollection),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as KOT);
  }

  async getKOTsByOrder(orderId: string): Promise<KOT[]> {
    const q = query(
      collection(this.firestore, this.kotsCollection),
      where('orderId', '==', orderId),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as KOT);
  }

  async getKOTsByStatus(tenantId: string, status: KOTStatus): Promise<KOT[]> {
    const q = query(
      collection(this.firestore, this.kotsCollection),
      where('tenantId', '==', tenantId),
      where('status', '==', status),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as KOT);
  }

  async getKOTsByStation(tenantId: string, station: KitchenStation): Promise<KOT[]> {
    const q = query(
      collection(this.firestore, this.kotsCollection),
      where('tenantId', '==', tenantId),
      where('assignedStations', 'array-contains', station),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as KOT);
  }

  async getActiveKOTs(tenantId: string): Promise<KOT[]> {
    const kots = await this.getKOTsByTenant(tenantId);
    return kots.filter(kot =>
      !kot.isCancelled &&
      [KOTStatus.PENDING, KOTStatus.ACKNOWLEDGED, KOTStatus.PREPARING, KOTStatus.READY].includes(kot.status)
    );
  }

  async getTodaysKOTs(tenantId: string): Promise<KOT[]> {
    const kots = await this.getKOTsByTenant(tenantId);
    const today = new Date().toISOString().split('T')[0];
    return kots.filter(kot => kot.createdAt.startsWith(today));
  }

  async updateKOT(id: string, updates: Partial<KOT>): Promise<void> {
    const docRef = doc(this.firestore, this.kotsCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteKOT(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.kotsCollection, id);
    await deleteDoc(docRef);
  }

  // ==================== KOT STATUS ====================

  async updateKOTStatus(kotId: string, status: KOTStatus, userId: string, userName: string, notes?: string): Promise<void> {
    const kot = await this.getKOTById(kotId);
    if (!kot) throw new Error('KOT not found');

    const now = new Date().toISOString();
    const statusHistory: KOTStatusHistory[] = [
      ...kot.statusHistory,
      {
        status,
        timestamp: now,
        userId,
        userName,
        notes
      }
    ];

    const updates: Partial<KOT> = {
      status,
      statusHistory,
      updatedBy: userId
    };

    // Set timestamps based on status
    switch (status) {
      case KOTStatus.ACKNOWLEDGED:
        updates.acknowledgedAt = now;
        updates.acknowledgedBy = userId;
        break;
      case KOTStatus.PREPARING:
        updates.startedPreparingAt = now;
        updates.preparedBy = userId;
        break;
      case KOTStatus.READY:
        updates.readyAt = now;
        // Update all items to ready
        updates.items = kot.items.map(item => ({
          ...item,
          status: KOTStatus.READY,
          readyAt: now
        }));
        break;
      case KOTStatus.SERVED:
        updates.servedAt = now;
        updates.servedBy = userId;
        break;
    }

    await this.updateKOT(kotId, updates);
  }

  async moveToNextStatus(kotId: string, userId: string, userName: string): Promise<void> {
    const kot = await this.getKOTById(kotId);
    if (!kot) throw new Error('KOT not found');

    const nextStatus = getNextKOTStatus(kot.status);
    if (!nextStatus) {
      throw new Error('KOT is already at final status');
    }

    await this.updateKOTStatus(kotId, nextStatus, userId, userName);
  }

  async acknowledgeKOT(kotId: string, userId: string, userName: string): Promise<void> {
    await this.updateKOTStatus(kotId, KOTStatus.ACKNOWLEDGED, userId, userName);
  }

  async startPreparing(kotId: string, userId: string, userName: string): Promise<void> {
    await this.updateKOTStatus(kotId, KOTStatus.PREPARING, userId, userName);
  }

  async markReady(kotId: string, userId: string, userName: string): Promise<void> {
    await this.updateKOTStatus(kotId, KOTStatus.READY, userId, userName);
  }

  async markServed(kotId: string, userId: string, userName: string): Promise<void> {
    await this.updateKOTStatus(kotId, KOTStatus.SERVED, userId, userName);
  }

  async cancelKOT(kotId: string, reason: string, cancelledBy: string, cancelledByName: string): Promise<void> {
    const kot = await this.getKOTById(kotId);
    if (!kot) throw new Error('KOT not found');

    if (!canKOTBeCancelled(kot)) {
      throw new Error('KOT cannot be cancelled in current status');
    }

    await this.updateKOTStatus(kotId, KOTStatus.CANCELLED, cancelledBy, cancelledByName, reason);
    await this.updateKOT(kotId, {
      isCancelled: true,
      cancelledAt: new Date().toISOString(),
      cancelledBy,
      cancellationReason: reason
    });
  }

  // ==================== KOT ITEMS ====================

  async updateItemStatus(kotId: string, itemId: string, status: KOTStatus, userId: string): Promise<void> {
    const kot = await this.getKOTById(kotId);
    if (!kot) throw new Error('KOT not found');

    const now = new Date().toISOString();
    const items = kot.items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, status };

        if (status === KOTStatus.PREPARING) {
          updated.startedAt = now;
        } else if (status === KOTStatus.READY) {
          updated.readyAt = now;
        }

        return updated;
      }
      return item;
    });

    // Check if all items are ready
    const allReady = items.every(item => item.status === KOTStatus.READY);
    const updates: Partial<KOT> = { items };

    if (allReady && kot.status !== KOTStatus.READY) {
      updates.status = KOTStatus.READY;
      updates.readyAt = now;
    }

    await this.updateKOT(kotId, updates);
  }

  async cancelItem(kotId: string, itemId: string, reason: string, cancelledBy: string): Promise<void> {
    const kot = await this.getKOTById(kotId);
    if (!kot) throw new Error('KOT not found');

    if (!canKOTBeModified(kot)) {
      throw new Error('KOT cannot be modified in current status');
    }

    const now = new Date().toISOString();
    const items = kot.items.map(item =>
      item.id === itemId
        ? {
            ...item,
            isCancelled: true,
            cancelledAt: now,
            cancellationReason: reason,
            status: KOTStatus.CANCELLED
          }
        : item
    );

    await this.updateKOT(kotId, { items, updatedBy: cancelledBy });
  }

  // ==================== PRIORITY ====================

  async updatePriority(kotId: string, priority: KOTPriority, updatedBy: string): Promise<void> {
    await this.updateKOT(kotId, { priority, updatedBy });
  }

  async markAsUrgent(kotId: string, updatedBy: string): Promise<void> {
    await this.updatePriority(kotId, KOTPriority.URGENT, updatedBy);
  }

  // ==================== PRINTING ====================

  async recordPrint(kotId: string): Promise<void> {
    const kot = await this.getKOTById(kotId);
    if (!kot) throw new Error('KOT not found');

    const now = new Date().toISOString();
    await this.updateKOT(kotId, {
      printCount: kot.printCount + 1,
      lastPrintedAt: now,
      printedAt: kot.printedAt || now
    });
  }

  async getPrintData(kotId: string, restaurantName: string): Promise<KOTPrintData> {
    const kot = await this.getKOTById(kotId);
    if (!kot) throw new Error('KOT not found');

    const itemsByStation = groupItemsByStation(kot.items);

    return {
      kot,
      restaurantName,
      printTime: new Date().toISOString(),
      printedBy: 'System',
      itemsByStation,
      showPrices: false,
      showPreparationTime: true,
      fontSize: 'medium',
      copies: 1
    };
  }

  getPrintText(kot: KOT, restaurantName: string): string {
    return formatKOTPrintText(kot, restaurantName);
  }

  // ==================== KITCHEN DISPLAY ====================

  async getKitchenDisplayItems(tenantId: string, station?: KitchenStation): Promise<KitchenDisplayItem[]> {
    let kots: KOT[];

    if (station) {
      kots = await this.getKOTsByStation(tenantId, station);
    } else {
      kots = await this.getActiveKOTs(tenantId);
    }

    return kots
      .filter(kot => !kot.isCancelled)
      .map(kot => {
        const elapsedTime = getElapsedTime(kot.createdAt);
        const estimatedTimeRemaining = kot.estimatedReadyTime
          ? getRemainingTime(kot.estimatedReadyTime)
          : 0;
        const isOverdue = kot.estimatedReadyTime
          ? isKOTOverdue(kot.estimatedReadyTime)
          : false;
        const urgencyLevel = getUrgencyLevel(kot);

        return {
          kot,
          elapsedTime,
          estimatedTimeRemaining,
          isOverdue,
          urgencyLevel
        };
      })
      .sort((a, b) => {
        // Sort by urgency first, then by elapsed time
        const urgencyOrder = { critical: 0, warning: 1, normal: 2 };
        if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
          return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
        }
        return b.elapsedTime - a.elapsedTime;
      });
  }

  // ==================== SUMMARIES ====================

  async getKOTSummary(tenantId: string): Promise<KOTSummary> {
    const kots = await this.getTodaysKOTs(tenantId);
    const activeKots = kots.filter(kot => !kot.isCancelled);

    const summary: KOTSummary = {
      totalKOTs: activeKots.length,
      pendingKOTs: 0,
      preparingKOTs: 0,
      readyKOTs: 0,
      servedKOTs: 0,
      cancelledKOTs: kots.filter(kot => kot.isCancelled).length,
      averagePreparationTime: 0,
      overdueKOTs: 0
    };

    let totalPrepTime = 0;
    let preparedCount = 0;
    let oldestElapsed = 0;

    activeKots.forEach(kot => {
      // Count by status
      switch (kot.status) {
        case KOTStatus.PENDING:
          summary.pendingKOTs++;
          break;
        case KOTStatus.ACKNOWLEDGED:
        case KOTStatus.PREPARING:
          summary.preparingKOTs++;
          break;
        case KOTStatus.READY:
          summary.readyKOTs++;
          break;
        case KOTStatus.SERVED:
          summary.servedKOTs++;
          break;
      }

      // Calculate average prep time
      if (kot.readyAt && kot.createdAt) {
        const prepTime = (new Date(kot.readyAt).getTime() - new Date(kot.createdAt).getTime()) / 60000;
        totalPrepTime += prepTime;
        preparedCount++;
      }

      // Find oldest pending
      if (kot.status === KOTStatus.PENDING || kot.status === KOTStatus.ACKNOWLEDGED) {
        const elapsed = getElapsedTime(kot.createdAt);
        if (elapsed > oldestElapsed) {
          oldestElapsed = elapsed;
          summary.oldestPendingKOT = kot;
        }
      }

      // Count overdue
      if (kot.estimatedReadyTime && isKOTOverdue(kot.estimatedReadyTime)) {
        summary.overdueKOTs++;
      }
    });

    summary.averagePreparationTime = preparedCount > 0
      ? Math.round(totalPrepTime / preparedCount)
      : 0;

    return summary;
  }

  async getStationSummary(tenantId: string, station: KitchenStation): Promise<StationSummary> {
    const kots = await this.getKOTsByStation(tenantId, station);
    const activeKots = kots.filter(kot => !kot.isCancelled && kot.status !== KOTStatus.SERVED);

    let pendingKOTs = 0;
    let preparingKOTs = 0;
    let readyKOTs = 0;
    let totalPrepTime = 0;
    let preparedCount = 0;

    activeKots.forEach(kot => {
      switch (kot.status) {
        case KOTStatus.PENDING:
        case KOTStatus.ACKNOWLEDGED:
          pendingKOTs++;
          break;
        case KOTStatus.PREPARING:
          preparingKOTs++;
          break;
        case KOTStatus.READY:
          readyKOTs++;
          break;
      }

      if (kot.readyAt && kot.createdAt) {
        const prepTime = (new Date(kot.readyAt).getTime() - new Date(kot.createdAt).getTime()) / 60000;
        totalPrepTime += prepTime;
        preparedCount++;
      }
    });

    const averagePreparationTime = preparedCount > 0
      ? Math.round(totalPrepTime / preparedCount)
      : 0;

    // Calculate current load (simple metric based on active KOTs)
    const maxCapacity = 20; // Assume each station can handle 20 KOTs
    const currentLoad = Math.min(100, Math.round((activeKots.length / maxCapacity) * 100));

    return {
      station,
      pendingKOTs,
      preparingKOTs,
      readyKOTs,
      averagePreparationTime,
      currentLoad
    };
  }

  // ==================== HELPERS ====================

  private async getNextSequence(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const sequenceId = `kot_${today}`;

    const docRef = doc(this.firestore, this.kotSequenceDoc, sequenceId);
    const docSnap = await getDoc(docRef);

    let sequence = 1;
    if (docSnap.exists()) {
      sequence = (docSnap.data()['sequence'] || 0) + 1;
    }

    await setDoc(docRef, { sequence, lastUpdated: new Date().toISOString() });
    return sequence;
  }
}
