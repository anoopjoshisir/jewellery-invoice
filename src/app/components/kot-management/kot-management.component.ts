import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KOTService } from '../../core/services/kot.service';
import { RestaurantOrderService } from '../../core/services/restaurant-order.service';
import {
  KOT,
  KOTStatus,
  KitchenStation,
  KOT_STATUS_COLORS,
  KITCHEN_STATION_LABELS,
  KOTPrintData
} from '../../core/models/kot.model';
import { RestaurantOrder } from '../../core/models/restaurant-order.model';

@Component({
  selector: 'app-kot-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kot-management.component.html',
  styleUrls: ['./kot-management.component.scss']
})
export class KOTManagementComponent implements OnInit {
  isLoading = false;
  tenantId = 'tenant_001'; // TODO: Get from auth service

  // Data
  kots: KOT[] = [];
  filteredKOTs: KOT[] = [];

  // Filters
  filterStatus: KOTStatus | 'all' = 'all';
  filterStation: KitchenStation | 'all' = 'all';
  searchTerm = '';

  // Selected KOT
  selectedKOT: KOT | null = null;
  showKOTDetailsModal = false;

  // Print preview
  showPrintPreview = false;
  printData: KOTPrintData | null = null;
  printText = '';

  // Enums for template
  KOTStatus = KOTStatus;
  KitchenStation = KitchenStation;
  KOT_STATUS_COLORS = KOT_STATUS_COLORS;
  KITCHEN_STATION_LABELS = KITCHEN_STATION_LABELS;

  kotStatuses = Object.values(KOTStatus);
  kitchenStations = Object.values(KitchenStation);

  constructor(
    private kotService: KOTService,
    private orderService: RestaurantOrderService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.isLoading = true;
      await this.loadKOTs();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading KOTs:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadKOTs() {
    this.kots = await this.kotService.getTodaysKOTs(this.tenantId);
  }

  applyFilters() {
    let result = [...this.kots];

    // Status filter
    if (this.filterStatus !== 'all') {
      result = result.filter(kot => kot.status === this.filterStatus);
    }

    // Station filter
    if (this.filterStation !== 'all') {
      result = result.filter(kot => kot.station === this.filterStation);
    }

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(kot =>
        kot.displayNumber.toLowerCase().includes(term) ||
        kot.orderNumber.toLowerCase().includes(term) ||
        kot.tableNumber?.toLowerCase().includes(term)
      );
    }

    // Sort by created date (newest first)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    this.filteredKOTs = result;
  }

  onFilterChange() {
    this.applyFilters();
  }

  // KOT actions
  async viewKOTDetails(kot: KOT) {
    this.selectedKOT = kot;
    this.showKOTDetailsModal = true;
  }

  closeKOTDetailsModal() {
    this.showKOTDetailsModal = false;
    this.selectedKOT = null;
  }

  async updateKOTStatus(kot: KOT, status: KOTStatus) {
    try {
      await this.kotService.updateKOTStatus(
        kot.id!,
        status,
        'current_user',
        'Current User'
      );
      await this.loadData();
    } catch (error) {
      console.error('Error updating KOT status:', error);
      alert('Failed to update KOT status');
    }
  }

  async acknowledgeKOT(kot: KOT) {
    try {
      await this.kotService.acknowledgeKOT(
        kot.id!,
        'current_user',
        'Current User'
      );
      await this.loadData();
    } catch (error) {
      console.error('Error acknowledging KOT:', error);
      alert('Failed to acknowledge KOT');
    }
  }

  async startPreparing(kot: KOT) {
    try {
      await this.kotService.startPreparing(
        kot.id!,
        'current_user',
        'Current User'
      );
      await this.loadData();
    } catch (error) {
      console.error('Error starting KOT preparation:', error);
      alert('Failed to start preparation');
    }
  }

  async markReady(kot: KOT) {
    try {
      await this.kotService.markReady(
        kot.id!,
        'current_user',
        'Current User'
      );
      await this.loadData();
    } catch (error) {
      console.error('Error marking KOT ready:', error);
      alert('Failed to mark as ready');
    }
  }

  async markServed(kot: KOT) {
    try {
      await this.kotService.markServed(
        kot.id!,
        'current_user',
        'Current User'
      );
      await this.loadData();
    } catch (error) {
      console.error('Error marking KOT served:', error);
      alert('Failed to mark as served');
    }
  }

  async cancelKOT(kot: KOT) {
    if (!confirm(`Are you sure you want to cancel KOT ${kot.displayNumber}?`)) {
      return;
    }

    const reason = prompt('Enter cancellation reason:');
    if (!reason) {
      return;
    }

    try {
      await this.kotService.cancelKOT(
        kot.id!,
        'current_user',
        'Current User',
        reason
      );
      await this.loadData();
    } catch (error) {
      console.error('Error cancelling KOT:', error);
      alert('Failed to cancel KOT');
    }
  }

  async printKOT(kot: KOT) {
    try {
      this.printText = this.kotService.getPrintText(kot, 'My Restaurant');
      console.log('Print KOT:', this.printText);

      // Record print
      await this.kotService.recordPrint(kot.id!, 'current_user', 'Current User');

      // In production, this would send to a thermal printer
      alert('KOT sent to printer');
      await this.loadData();
    } catch (error) {
      console.error('Error printing KOT:', error);
      alert('Failed to print KOT');
    }
  }

  async showPrint(kot: KOT) {
    try {
      this.printData = await this.kotService.getPrintData(kot.id!, 'My Restaurant');
      this.showPrintPreview = true;
    } catch (error) {
      console.error('Error loading print data:', error);
      alert('Failed to load print preview');
    }
  }

  closePrintPreview() {
    this.showPrintPreview = false;
    this.printData = null;
  }

  async reprintKOT(kot: KOT) {
    if (!confirm(`Reprint KOT ${kot.displayNumber}?`)) {
      return;
    }

    await this.printKOT(kot);
  }

  // Helpers
  getKOTStatusColor(status: KOTStatus): string {
    return KOT_STATUS_COLORS[status] || '#6b7280';
  }

  getStationLabel(station: KitchenStation): string {
    return KITCHEN_STATION_LABELS[station] || station;
  }

  getElapsedMinutes(timestamp: string): number {
    const now = new Date();
    const created = new Date(timestamp);
    return Math.floor((now.getTime() - created.getTime()) / 60000);
  }

  isUrgent(kot: KOT): boolean {
    const elapsed = this.getElapsedMinutes(kot.createdAt);
    return elapsed > 15;
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN');
  }

  getStatusButtonText(status: KOTStatus): string {
    const buttons: Record<KOTStatus, string> = {
      [KOTStatus.PENDING]: 'Acknowledge',
      [KOTStatus.ACKNOWLEDGED]: 'Start Preparing',
      [KOTStatus.PREPARING]: 'Mark Ready',
      [KOTStatus.READY]: 'Mark Served',
      [KOTStatus.SERVED]: 'Completed',
      [KOTStatus.CANCELLED]: 'Cancelled'
    };
    return buttons[status] || 'Update Status';
  }

  canUpdateStatus(status: KOTStatus): boolean {
    return status !== KOTStatus.SERVED && status !== KOTStatus.CANCELLED;
  }
}
