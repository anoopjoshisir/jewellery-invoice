import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RestaurantTableService } from '../../core/services/restaurant-table.service';
import {
  RestaurantTable,
  Floor,
  Section,
  TableReservation,
  TableStatus,
  ReservationStatus,
  FloorSummary,
  getTableStatusColor,
  getTableStatusLabel,
  getReservationStatusColor
} from '../../core/models/restaurant-table.model';

interface TableFormData {
  tableNumber: string;
  displayName: string;
  capacity: number;
  sectionId: string;
  floorId: string;
  shape: string;
  features: string[];
}

interface ReservationFormData {
  tableId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  guestCount: number;
  reservationDate: string;
  reservationTime: string;
  specialRequests: string;
}

@Component({
  selector: 'app-table-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './table-management.component.html',
  styleUrls: ['./table-management.component.scss']
})
export class TableManagementComponent implements OnInit {
  isLoading = false;
  tenantId = 'tenant_001'; // TODO: Get from auth service
  currentUserId = 'user_001';
  currentUserName = 'Current User';

  // Data
  floors: Floor[] = [];
  selectedFloor: Floor | null = null;
  floorSummary: FloorSummary | null = null;
  allTables: RestaurantTable[] = [];
  reservations: TableReservation[] = [];

  // Views
  currentView: 'floor-plan' | 'list' | 'reservations' = 'floor-plan';

  // Modals
  showTableModal = false;
  showReservationModal = false;
  showTableDetailModal = false;
  selectedTable: RestaurantTable | null = null;

  // Forms
  tableForm: TableFormData = this.getEmptyTableForm();
  reservationForm: ReservationFormData = this.getEmptyReservationForm();
  isEditMode = false;

  // Filters
  filterStatus: TableStatus | 'all' = 'all';
  searchTerm = '';

  // Enums for template
  TableStatus = TableStatus;
  ReservationStatus = ReservationStatus;

  constructor(private tableService: RestaurantTableService) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.isLoading = true;

      // Load floors
      this.floors = await this.tableService.getFloorsByTenant(this.tenantId);

      // Select first floor by default
      if (this.floors.length > 0 && !this.selectedFloor) {
        this.selectedFloor = this.floors[0];
      }

      // Load data for selected floor
      if (this.selectedFloor) {
        await this.loadFloorData();
      }

      // Load reservations
      await this.loadReservations();

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadFloorData() {
    if (!this.selectedFloor?.id) return;

    try {
      this.floorSummary = await this.tableService.getFloorSummary(this.selectedFloor.id);
      this.allTables = await this.tableService.getTablesByFloor(this.selectedFloor.id);
    } catch (error) {
      console.error('Error loading floor data:', error);
    }
  }

  async loadReservations() {
    try {
      this.reservations = await this.tableService.getActiveReservations(this.tenantId);
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  }

  // Floor Management
  async selectFloor(floor: Floor) {
    this.selectedFloor = floor;
    await this.loadFloorData();
  }

  // Table Operations
  openNewTableModal() {
    this.isEditMode = false;
    this.tableForm = this.getEmptyTableForm();
    if (this.selectedFloor) {
      this.tableForm.floorId = this.selectedFloor.id!;
    }
    this.showTableModal = true;
  }

  openEditTableModal(table: RestaurantTable) {
    this.isEditMode = true;
    this.selectedTable = table;
    this.tableForm = {
      tableNumber: table.tableNumber,
      displayName: table.displayName,
      capacity: table.capacity,
      sectionId: table.sectionId,
      floorId: table.floorId,
      shape: table.shape,
      features: table.features
    };
    this.showTableModal = true;
  }

  async saveTable() {
    try {
      if (this.isEditMode && this.selectedTable) {
        await this.tableService.updateTable(this.selectedTable.id!, {
          ...this.tableForm,
          updatedBy: this.currentUserId
        });
      } else {
        await this.tableService.createTable({
          ...this.tableForm,
          tenantId: this.tenantId,
          status: TableStatus.AVAILABLE,
          isActive: true,
          isVisible: true,
          priority: 1,
          features: this.tableForm.features || [],
          createdBy: this.currentUserId,
          createdAt: new Date().toISOString(),
          updatedBy: this.currentUserId,
          updatedAt: new Date().toISOString()
        });
      }

      this.showTableModal = false;
      await this.loadFloorData();
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Failed to save table');
    }
  }

  async deleteTable(table: RestaurantTable) {
    if (!confirm(`Are you sure you want to delete table ${table.tableNumber}?`)) {
      return;
    }

    try {
      await this.tableService.deleteTable(table.id!);
      await this.loadFloorData();
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Failed to delete table');
    }
  }

  async updateTableStatus(table: RestaurantTable, status: TableStatus) {
    try {
      await this.tableService.updateTableStatus(table.id!, status, this.currentUserId);
      await this.loadFloorData();
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Failed to update table status');
    }
  }

  async clearTable(table: RestaurantTable) {
    if (!confirm(`Clear table ${table.tableNumber}?`)) {
      return;
    }

    try {
      await this.tableService.clearTable(table.id!, this.currentUserId);
      await this.loadFloorData();
    } catch (error) {
      console.error('Error clearing table:', error);
      alert('Failed to clear table');
    }
  }

  // Reservation Operations
  openNewReservationModal(table?: RestaurantTable) {
    this.reservationForm = this.getEmptyReservationForm();
    if (table) {
      this.reservationForm.tableId = table.id!;
    }
    this.showReservationModal = true;
  }

  async saveReservation() {
    try {
      await this.tableService.createReservation({
        ...this.reservationForm,
        tenantId: this.tenantId,
        tableNumber: this.allTables.find(t => t.id === this.reservationForm.tableId)?.tableNumber || '',
        status: ReservationStatus.PENDING,
        confirmationSent: false,
        reminderSent: false,
        createdBy: this.currentUserId,
        createdAt: new Date().toISOString(),
        updatedBy: this.currentUserId,
        updatedAt: new Date().toISOString()
      });

      this.showReservationModal = false;
      await this.loadReservations();
      await this.loadFloorData();
    } catch (error) {
      console.error('Error saving reservation:', error);
      alert('Failed to create reservation');
    }
  }

  async confirmReservation(reservation: TableReservation) {
    try {
      await this.tableService.confirmReservation(reservation.id!, this.currentUserId);
      await this.loadReservations();
      await this.loadFloorData();
    } catch (error) {
      console.error('Error confirming reservation:', error);
      alert('Failed to confirm reservation');
    }
  }

  async cancelReservation(reservation: TableReservation) {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;

    try {
      await this.tableService.cancelReservation(reservation.id!, reason, this.currentUserId);
      await this.loadReservations();
      await this.loadFloorData();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Failed to cancel reservation');
    }
  }

  async markArrived(reservation: TableReservation) {
    try {
      await this.tableService.markReservationArrived(reservation.id!, this.currentUserId);
      await this.loadReservations();
    } catch (error) {
      console.error('Error marking arrival:', error);
      alert('Failed to mark as arrived');
    }
  }

  async seatReservation(reservation: TableReservation) {
    try {
      await this.tableService.seatReservation(reservation.id!, this.currentUserId);
      await this.loadReservations();
      await this.loadFloorData();
    } catch (error) {
      console.error('Error seating reservation:', error);
      alert('Failed to seat guests');
    }
  }

  // Table Details Modal
  viewTableDetails(table: RestaurantTable) {
    this.selectedTable = table;
    this.showTableDetailModal = true;
  }

  closeTableDetailModal() {
    this.showTableDetailModal = false;
    this.selectedTable = null;
  }

  // View Management
  switchView(view: 'floor-plan' | 'list' | 'reservations') {
    this.currentView = view;
  }

  // Filters
  get filteredTables(): RestaurantTable[] {
    let tables = this.allTables;

    if (this.filterStatus !== 'all') {
      tables = tables.filter(t => t.status === this.filterStatus);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      tables = tables.filter(t =>
        t.tableNumber.toLowerCase().includes(term) ||
        t.displayName.toLowerCase().includes(term)
      );
    }

    return tables;
  }

  get todaysReservations(): TableReservation[] {
    const today = new Date().toISOString().split('T')[0];
    return this.reservations.filter(r => r.reservationDate === today);
  }

  get upcomingReservations(): TableReservation[] {
    const today = new Date().toISOString().split('T')[0];
    return this.reservations.filter(r => r.reservationDate > today);
  }

  // Helper Methods
  getTableStatusColor(status: TableStatus): string {
    return getTableStatusColor(status);
  }

  getTableStatusLabel(status: TableStatus): string {
    return getTableStatusLabel(status);
  }

  getReservationStatusColor(status: ReservationStatus): string {
    return getReservationStatusColor(status);
  }

  private getEmptyTableForm(): TableFormData {
    return {
      tableNumber: '',
      displayName: '',
      capacity: 4,
      sectionId: '',
      floorId: '',
      shape: 'square',
      features: []
    };
  }

  private getEmptyReservationForm(): ReservationFormData {
    const today = new Date().toISOString().split('T')[0];
    return {
      tableId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      guestCount: 2,
      reservationDate: today,
      reservationTime: '19:00',
      specialRequests: ''
    };
  }

  async refresh() {
    await this.loadData();
  }
}
