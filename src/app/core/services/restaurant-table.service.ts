import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, Timestamp } from '@angular/fire/firestore';
import {
  RestaurantTable,
  Section,
  Floor,
  TableReservation,
  TableStatus,
  ReservationStatus,
  TableSummary,
  SectionSummary,
  FloorSummary
} from '../models/restaurant-table.model';

@Injectable({
  providedIn: 'root'
})
export class RestaurantTableService {
  private tablesCollection = 'restaurant_tables';
  private sectionsCollection = 'restaurant_sections';
  private floorsCollection = 'restaurant_floors';
  private reservationsCollection = 'restaurant_reservations';

  constructor(private firestore: Firestore) {}

  // ==================== TABLES ====================

  async createTable(table: Omit<RestaurantTable, 'id'>): Promise<string> {
    const ref = doc(collection(this.firestore, this.tablesCollection));
    const now = new Date().toISOString();

    const data: RestaurantTable = {
      ...table,
      id: ref.id,
      createdAt: table.createdAt || now,
      updatedAt: now
    };

    await setDoc(ref, data);
    return ref.id;
  }

  async getTableById(id: string): Promise<RestaurantTable | null> {
    const docRef = doc(this.firestore, this.tablesCollection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as RestaurantTable) : null;
  }

  async getTablesByTenant(tenantId: string): Promise<RestaurantTable[]> {
    const q = query(
      collection(this.firestore, this.tablesCollection),
      where('tenantId', '==', tenantId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantTable);
  }

  async getTablesBySection(sectionId: string): Promise<RestaurantTable[]> {
    const q = query(
      collection(this.firestore, this.tablesCollection),
      where('sectionId', '==', sectionId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantTable);
  }

  async getTablesByFloor(floorId: string): Promise<RestaurantTable[]> {
    const q = query(
      collection(this.firestore, this.tablesCollection),
      where('floorId', '==', floorId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantTable);
  }

  async getTablesByStatus(tenantId: string, status: TableStatus): Promise<RestaurantTable[]> {
    const q = query(
      collection(this.firestore, this.tablesCollection),
      where('tenantId', '==', tenantId),
      where('status', '==', status)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantTable);
  }

  async updateTable(id: string, updates: Partial<RestaurantTable>): Promise<void> {
    const docRef = doc(this.firestore, this.tablesCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteTable(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.tablesCollection, id);
    await deleteDoc(docRef);
  }

  async updateTableStatus(id: string, status: TableStatus, updatedBy: string): Promise<void> {
    await this.updateTable(id, { status, updatedBy });
  }

  async assignOrderToTable(tableId: string, orderId: string, updatedBy: string): Promise<void> {
    await this.updateTable(tableId, {
      status: TableStatus.OCCUPIED,
      currentOrderId: orderId,
      updatedBy
    });
  }

  async clearTable(tableId: string, updatedBy: string): Promise<void> {
    await this.updateTable(tableId, {
      status: TableStatus.AVAILABLE,
      currentOrderId: undefined,
      currentReservationId: undefined,
      updatedBy
    });
  }

  async getAvailableTables(tenantId: string): Promise<RestaurantTable[]> {
    const q = query(
      collection(this.firestore, this.tablesCollection),
      where('tenantId', '==', tenantId),
      where('status', '==', TableStatus.AVAILABLE),
      where('isActive', '==', true),
      where('isVisible', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as RestaurantTable);
  }

  async getTableSummary(tenantId: string): Promise<TableSummary> {
    const tables = await this.getTablesByTenant(tenantId);

    const summary: TableSummary = {
      total: tables.length,
      available: 0,
      occupied: 0,
      reserved: 0,
      billed: 0,
      cleaning: 0,
      maintenance: 0,
      occupancyRate: 0
    };

    tables.forEach(table => {
      switch (table.status) {
        case TableStatus.AVAILABLE:
          summary.available++;
          break;
        case TableStatus.OCCUPIED:
          summary.occupied++;
          break;
        case TableStatus.RESERVED:
          summary.reserved++;
          break;
        case TableStatus.BILLED:
          summary.billed++;
          break;
        case TableStatus.CLEANING:
          summary.cleaning++;
          break;
        case TableStatus.MAINTENANCE:
          summary.maintenance++;
          break;
      }
    });

    const usable = summary.total - summary.maintenance;
    summary.occupancyRate = usable > 0 ? Math.round((summary.occupied / usable) * 100) : 0;

    return summary;
  }

  // ==================== SECTIONS ====================

  async createSection(section: Omit<Section, 'id'>): Promise<string> {
    const ref = doc(collection(this.firestore, this.sectionsCollection));
    const now = new Date().toISOString();

    const data: Section = {
      ...section,
      id: ref.id,
      createdAt: section.createdAt || now,
      updatedAt: now
    };

    await setDoc(ref, data);
    return ref.id;
  }

  async getSectionById(id: string): Promise<Section | null> {
    const docRef = doc(this.firestore, this.sectionsCollection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as Section) : null;
  }

  async getSectionsByFloor(floorId: string): Promise<Section[]> {
    const q = query(
      collection(this.firestore, this.sectionsCollection),
      where('floorId', '==', floorId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Section);
  }

  async updateSection(id: string, updates: Partial<Section>): Promise<void> {
    const docRef = doc(this.firestore, this.sectionsCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteSection(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.sectionsCollection, id);
    await deleteDoc(docRef);
  }

  async getSectionSummary(sectionId: string): Promise<SectionSummary | null> {
    const section = await this.getSectionById(sectionId);
    if (!section) return null;

    const tables = await this.getTablesBySection(sectionId);

    const summary: TableSummary = {
      total: tables.length,
      available: 0,
      occupied: 0,
      reserved: 0,
      billed: 0,
      cleaning: 0,
      maintenance: 0,
      occupancyRate: 0
    };

    tables.forEach(table => {
      switch (table.status) {
        case TableStatus.AVAILABLE:
          summary.available++;
          break;
        case TableStatus.OCCUPIED:
          summary.occupied++;
          break;
        case TableStatus.RESERVED:
          summary.reserved++;
          break;
        case TableStatus.BILLED:
          summary.billed++;
          break;
        case TableStatus.CLEANING:
          summary.cleaning++;
          break;
        case TableStatus.MAINTENANCE:
          summary.maintenance++;
          break;
      }
    });

    const usable = summary.total - summary.maintenance;
    summary.occupancyRate = usable > 0 ? Math.round((summary.occupied / usable) * 100) : 0;

    return { section, tables, summary };
  }

  // ==================== FLOORS ====================

  async createFloor(floor: Omit<Floor, 'id'>): Promise<string> {
    const ref = doc(collection(this.firestore, this.floorsCollection));
    const now = new Date().toISOString();

    const data: Floor = {
      ...floor,
      id: ref.id,
      createdAt: floor.createdAt || now,
      updatedAt: now
    };

    await setDoc(ref, data);
    return ref.id;
  }

  async getFloorById(id: string): Promise<Floor | null> {
    const docRef = doc(this.firestore, this.floorsCollection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as Floor) : null;
  }

  async getFloorsByTenant(tenantId: string): Promise<Floor[]> {
    const q = query(
      collection(this.firestore, this.floorsCollection),
      where('tenantId', '==', tenantId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Floor);
  }

  async updateFloor(id: string, updates: Partial<Floor>): Promise<void> {
    const docRef = doc(this.firestore, this.floorsCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteFloor(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.floorsCollection, id);
    await deleteDoc(docRef);
  }

  async getFloorSummary(floorId: string): Promise<FloorSummary | null> {
    const floor = await this.getFloorById(floorId);
    if (!floor) return null;

    const sections = await this.getSectionsByFloor(floorId);
    const sectionSummaries: SectionSummary[] = [];

    let totalSummary: TableSummary = {
      total: 0,
      available: 0,
      occupied: 0,
      reserved: 0,
      billed: 0,
      cleaning: 0,
      maintenance: 0,
      occupancyRate: 0
    };

    for (const section of sections) {
      const sectionSum = await this.getSectionSummary(section.id!);
      if (sectionSum) {
        sectionSummaries.push(sectionSum);

        // Aggregate totals
        totalSummary.total += sectionSum.summary.total;
        totalSummary.available += sectionSum.summary.available;
        totalSummary.occupied += sectionSum.summary.occupied;
        totalSummary.reserved += sectionSum.summary.reserved;
        totalSummary.billed += sectionSum.summary.billed;
        totalSummary.cleaning += sectionSum.summary.cleaning;
        totalSummary.maintenance += sectionSum.summary.maintenance;
      }
    }

    const usable = totalSummary.total - totalSummary.maintenance;
    totalSummary.occupancyRate = usable > 0 ? Math.round((totalSummary.occupied / usable) * 100) : 0;

    return {
      floor,
      sections: sectionSummaries,
      summary: totalSummary
    };
  }

  // ==================== RESERVATIONS ====================

  async createReservation(reservation: Omit<TableReservation, 'id'>): Promise<string> {
    const ref = doc(collection(this.firestore, this.reservationsCollection));
    const now = new Date().toISOString();

    const data: TableReservation = {
      ...reservation,
      id: ref.id,
      createdAt: reservation.createdAt || now,
      updatedAt: now
    };

    await setDoc(ref, data);

    // Update table status if confirmed
    if (reservation.status === ReservationStatus.CONFIRMED) {
      await this.updateTable(reservation.tableId, {
        status: TableStatus.RESERVED,
        currentReservationId: ref.id,
        updatedBy: reservation.createdBy
      });
    }

    return ref.id;
  }

  async getReservationById(id: string): Promise<TableReservation | null> {
    const docRef = doc(this.firestore, this.reservationsCollection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as TableReservation) : null;
  }

  async getReservationsByTenant(tenantId: string): Promise<TableReservation[]> {
    const q = query(
      collection(this.firestore, this.reservationsCollection),
      where('tenantId', '==', tenantId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TableReservation);
  }

  async getReservationsByDate(tenantId: string, date: string): Promise<TableReservation[]> {
    const q = query(
      collection(this.firestore, this.reservationsCollection),
      where('tenantId', '==', tenantId),
      where('reservationDate', '==', date)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TableReservation);
  }

  async getActiveReservations(tenantId: string): Promise<TableReservation[]> {
    const reservations = await this.getReservationsByTenant(tenantId);
    return reservations.filter(r =>
      [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.ARRIVED].includes(r.status)
    );
  }

  async updateReservation(id: string, updates: Partial<TableReservation>): Promise<void> {
    const docRef = doc(this.firestore, this.reservationsCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async confirmReservation(id: string, updatedBy: string): Promise<void> {
    const reservation = await this.getReservationById(id);
    if (!reservation) throw new Error('Reservation not found');

    await this.updateReservation(id, {
      status: ReservationStatus.CONFIRMED,
      confirmationSent: true,
      updatedBy
    });

    await this.updateTable(reservation.tableId, {
      status: TableStatus.RESERVED,
      currentReservationId: id,
      updatedBy
    });
  }

  async cancelReservation(id: string, reason: string, cancelledBy: string): Promise<void> {
    const reservation = await this.getReservationById(id);
    if (!reservation) throw new Error('Reservation not found');

    await this.updateReservation(id, {
      status: ReservationStatus.CANCELLED,
      cancelledAt: new Date().toISOString(),
      cancelledBy,
      cancellationReason: reason
    });

    // Clear table if it was reserved
    if (reservation.tableId) {
      const table = await this.getTableById(reservation.tableId);
      if (table && table.currentReservationId === id) {
        await this.updateTable(reservation.tableId, {
          status: TableStatus.AVAILABLE,
          currentReservationId: undefined,
          updatedBy: cancelledBy
        });
      }
    }
  }

  async markReservationArrived(id: string, updatedBy: string): Promise<void> {
    await this.updateReservation(id, {
      status: ReservationStatus.ARRIVED,
      arrivalTime: new Date().toISOString(),
      updatedBy
    });
  }

  async seatReservation(id: string, updatedBy: string): Promise<void> {
    const reservation = await this.getReservationById(id);
    if (!reservation) throw new Error('Reservation not found');

    await this.updateReservation(id, {
      status: ReservationStatus.SEATED,
      seatedTime: new Date().toISOString(),
      updatedBy
    });

    await this.updateTable(reservation.tableId, {
      status: TableStatus.OCCUPIED,
      updatedBy
    });
  }

  async deleteReservation(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.reservationsCollection, id);
    await deleteDoc(docRef);
  }
}
