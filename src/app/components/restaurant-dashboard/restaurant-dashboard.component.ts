import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RestaurantOrderService } from '../../core/services/restaurant-order.service';
import { KOTService } from '../../core/services/kot.service';
import { RestaurantTableService } from '../../core/services/restaurant-table.service';
import { MenuService } from '../../core/services/menu.service';
import { RestaurantOrder, OrderSummary, OrderStatus, ORDER_TYPE_ICONS, ORDER_STATUS_COLORS } from '../../core/models/restaurant-order.model';
import { KOT, KOTSummary, KOTStatus, KOT_STATUS_COLORS } from '../../core/models/kot.model';
import { TableSummary } from '../../core/models/restaurant-table.model';
import { MenuSummary } from '../../core/models/menu-item.model';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  activeOrders: number;
  pendingKOTs: number;
  tableOccupancy: number;
  averageOrderValue: number;
}

@Component({
  selector: 'app-restaurant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './restaurant-dashboard.component.html',
  styleUrls: ['./restaurant-dashboard.component.scss']
})
export class RestaurantDashboardComponent implements OnInit {
  isLoading = false;
  tenantId = 'tenant_001'; // TODO: Get from auth service

  // Stats
  stats: DashboardStats = {
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    pendingKOTs: 0,
    tableOccupancy: 0,
    averageOrderValue: 0
  };

  // Summaries
  orderSummary: OrderSummary | null = null;
  kotSummary: KOTSummary | null = null;
  tableSummary: TableSummary | null = null;
  menuSummary: MenuSummary | null = null;

  // Active data
  activeOrders: RestaurantOrder[] = [];
  pendingKOTs: KOT[] = [];
  recentOrders: RestaurantOrder[] = [];

  // Enums for template
  OrderStatus = OrderStatus;
  KOTStatus = KOTStatus;
  ORDER_TYPE_ICONS = ORDER_TYPE_ICONS;
  ORDER_STATUS_COLORS = ORDER_STATUS_COLORS;
  KOT_STATUS_COLORS = KOT_STATUS_COLORS;

  constructor(
    private orderService: RestaurantOrderService,
    private kotService: KOTService,
    private tableService: RestaurantTableService,
    private menuService: MenuService
  ) {}

  async ngOnInit() {
    await this.loadDashboard();
  }

  async loadDashboard() {
    try {
      this.isLoading = true;

      // Load all data in parallel
      await Promise.all([
        this.loadOrderData(),
        this.loadKOTData(),
        this.loadTableData(),
        this.loadMenuData()
      ]);

      this.calculateStats();
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadOrderData() {
    // Get today's orders
    const todayOrders = await this.orderService.getTodaysOrders(this.tenantId);

    // Get order summary
    this.orderSummary = await this.orderService.getOrderSummary(this.tenantId);

    // Get active orders
    this.activeOrders = await this.orderService.getActiveOrders(this.tenantId);

    // Get recent orders (last 10)
    this.recentOrders = todayOrders.slice(0, 10);
  }

  private async loadKOTData() {
    // Get KOT summary
    this.kotSummary = await this.kotService.getKOTSummary(this.tenantId);

    // Get pending KOTs
    this.pendingKOTs = await this.kotService.getKOTsByStatus(this.tenantId, KOTStatus.PENDING);
  }

  private async loadTableData() {
    // Get table summary
    this.tableSummary = await this.tableService.getTableSummary(this.tenantId);
  }

  private async loadMenuData() {
    // Get menu summary
    this.menuSummary = await this.menuService.getMenuSummary(this.tenantId);
  }

  private calculateStats() {
    this.stats = {
      todayOrders: this.orderSummary?.totalOrders || 0,
      todayRevenue: this.orderSummary?.totalRevenue || 0,
      activeOrders: this.activeOrders.length,
      pendingKOTs: this.pendingKOTs.length,
      tableOccupancy: this.tableSummary?.occupancyRate || 0,
      averageOrderValue: this.orderSummary?.averageOrderValue || 0
    };
  }

  async refresh() {
    await this.loadDashboard();
  }

  getOrderStatusClass(status: OrderStatus): string {
    return `status-${status}`;
  }

  getKOTStatusClass(status: KOTStatus): string {
    return `status-${status}`;
  }

  getOrderStatusColor(status: OrderStatus): string {
    return ORDER_STATUS_COLORS[status] || '#6b7280';
  }

  getKOTStatusColor(status: KOTStatus): string {
    return KOT_STATUS_COLORS[status] || '#6b7280';
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN');
  }

  getElapsedMinutes(startTime: string): number {
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 60000);
  }

  getOrderTypeIcon(type: string): string {
    return ORDER_TYPE_ICONS[type as keyof typeof ORDER_TYPE_ICONS] || '📋';
  }

  // Quick actions
  navigateToNewOrder() {
    // Navigate to new order page
    console.log('Navigate to new order');
  }

  navigateToTables() {
    // Navigate to table management
    console.log('Navigate to tables');
  }

  navigateToMenu() {
    // Navigate to menu management
    console.log('Navigate to menu');
  }

  navigateToKOTs() {
    // Navigate to KOT management
    console.log('Navigate to KOTs');
  }

  navigateToOrders() {
    // Navigate to order list
    console.log('Navigate to orders');
  }

  async viewOrderDetails(order: RestaurantOrder) {
    // Navigate to order details
    console.log('View order:', order.id);
  }

  async viewKOTDetails(kot: KOT) {
    // Navigate to KOT details
    console.log('View KOT:', kot.id);
  }

  async printKOT(kot: KOT) {
    try {
      const printText = this.kotService.getPrintText(kot, 'My Restaurant');
      console.log('Print KOT:', printText);
      // TODO: Integrate with printer
      alert('KOT sent to printer');
    } catch (error) {
      console.error('Error printing KOT:', error);
      alert('Failed to print KOT');
    }
  }

  async acknowledgeKOT(kot: KOT) {
    try {
      await this.kotService.acknowledgeKOT(kot.id!, 'current_user', 'Current User');
      await this.loadKOTData();
      this.calculateStats();
    } catch (error) {
      console.error('Error acknowledging KOT:', error);
      alert('Failed to acknowledge KOT');
    }
  }
}
