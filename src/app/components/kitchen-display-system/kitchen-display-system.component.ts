import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KOTService } from '../../core/services/kot.service';
import {
  KitchenDisplayItem,
  KitchenStation,
  KOTStatus,
  KITCHEN_STATION_LABELS,
  KOT_STATUS_COLORS
} from '../../core/models/kot.model';

@Component({
  selector: 'app-kitchen-display-system',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen-display-system.component.html',
  styleUrls: ['./kitchen-display-system.component.scss']
})
export class KitchenDisplaySystemComponent implements OnInit, OnDestroy {
  tenantId = 'tenant_001'; // TODO: Get from auth service

  // Data
  displayItems: KitchenDisplayItem[] = [];
  filteredItems: KitchenDisplayItem[] = [];

  // Filters
  selectedStation: KitchenStation | 'all' = 'all';

  // UI state
  isFullscreen = false;
  isLoading = false;
  currentTime = new Date();

  // Auto-refresh
  private refreshInterval: any;
  private clockInterval: any;
  refreshRate = 10; // seconds

  // Enums for template
  KitchenStation = KitchenStation;
  KOTStatus = KOTStatus;
  KITCHEN_STATION_LABELS = KITCHEN_STATION_LABELS;
  KOT_STATUS_COLORS = KOT_STATUS_COLORS;

  stations = Object.values(KitchenStation);

  constructor(private kotService: KOTService) {}

  async ngOnInit() {
    await this.loadDisplayItems();
    this.startAutoRefresh();
    this.startClock();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
    this.stopClock();
  }

  async loadDisplayItems() {
    try {
      this.isLoading = true;

      if (this.selectedStation === 'all') {
        this.displayItems = await this.kotService.getKitchenDisplayItems(this.tenantId);
      } else {
        this.displayItems = await this.kotService.getKitchenDisplayItems(
          this.tenantId,
          this.selectedStation
        );
      }

      this.applyFilters();
    } catch (error) {
      console.error('Error loading display items:', error);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    // Filter out served and cancelled KOTs
    let result = this.displayItems.filter(
      item => item.status !== KOTStatus.SERVED && item.status !== KOTStatus.CANCELLED
    );

    // Sort by urgency (urgent first), then by time (oldest first)
    result.sort((a, b) => {
      // First sort by urgency
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;

      // Then by elapsed time (oldest first)
      return b.elapsedMinutes - a.elapsedMinutes;
    });

    this.filteredItems = result;
  }

  selectStation(station: KitchenStation | 'all') {
    this.selectedStation = station;
    this.loadDisplayItems();
  }

  async acknowledgeItem(item: KitchenDisplayItem) {
    try {
      await this.kotService.acknowledgeKOT(
        item.kotId,
        'kitchen_user',
        'Kitchen Staff'
      );
      await this.loadDisplayItems();
    } catch (error) {
      console.error('Error acknowledging KOT:', error);
    }
  }

  async startPreparing(item: KitchenDisplayItem) {
    try {
      await this.kotService.startPreparing(
        item.kotId,
        'kitchen_user',
        'Kitchen Staff'
      );
      await this.loadDisplayItems();
    } catch (error) {
      console.error('Error starting preparation:', error);
    }
  }

  async markReady(item: KitchenDisplayItem) {
    try {
      await this.kotService.markReady(
        item.kotId,
        'kitchen_user',
        'Kitchen Staff'
      );
      await this.loadDisplayItems();
    } catch (error) {
      console.error('Error marking ready:', error);
    }
  }

  toggleFullscreen() {
    if (!this.isFullscreen) {
      // Enter fullscreen
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    this.isFullscreen = !this.isFullscreen;
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadDisplayItems();
    }, this.refreshRate * 1000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  startClock() {
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  async refresh() {
    await this.loadDisplayItems();
  }

  // Helpers
  getStationLabel(station: KitchenStation): string {
    return KITCHEN_STATION_LABELS[station] || station;
  }

  getStatusColor(status: KOTStatus): string {
    return KOT_STATUS_COLORS[status] || '#6b7280';
  }

  getUrgencyClass(item: KitchenDisplayItem): string {
    if (item.elapsedMinutes >= 20) return 'critical';
    if (item.elapsedMinutes >= 15) return 'urgent';
    if (item.elapsedMinutes >= 10) return 'warning';
    return 'normal';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getTimeDisplay(elapsedMinutes: number): string {
    if (elapsedMinutes < 60) {
      return `${elapsedMinutes}m`;
    }
    const hours = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    return `${hours}h ${mins}m`;
  }

  getStationCount(station: KitchenStation): number {
    return this.displayItems.filter(item => item.station === station).length;
  }
}
