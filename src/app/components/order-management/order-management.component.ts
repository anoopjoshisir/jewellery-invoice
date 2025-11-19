import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RestaurantOrderService } from '../../core/services/restaurant-order.service';
import { MenuService } from '../../core/services/menu.service';
import { RestaurantTableService } from '../../core/services/restaurant-table.service';
import { KOTService } from '../../core/services/kot.service';
import {
  RestaurantOrder,
  OrderItem,
  OrderType,
  OrderStatus,
  PaymentMethod,
  ORDER_TYPE_ICONS,
  ORDER_STATUS_COLORS,
  PAYMENT_METHOD_LABELS
} from '../../core/models/restaurant-order.model';
import {
  MenuItem,
  MenuCategory,
  MenuItemVariant,
  MenuItemModifier,
  FoodType,
  FOOD_TYPE_ICONS
} from '../../core/models/menu-item.model';
import { RestaurantTable, TableStatus } from '../../core/models/restaurant-table.model';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedVariant?: MenuItemVariant;
  selectedModifiers: MenuItemModifier[];
  specialInstructions: string;
  itemPrice: number;
  totalPrice: number;
}

type ViewMode = 'create' | 'list';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss']
})
export class OrderManagementComponent implements OnInit {
  isLoading = false;
  tenantId = 'tenant_001'; // TODO: Get from auth service

  // View state
  viewMode: ViewMode = 'create';

  // Create order state
  orderType: OrderType = OrderType.DINE_IN;
  selectedTable: RestaurantTable | null = null;
  customerName = '';
  customerPhone = '';
  deliveryAddress = '';

  // Menu data
  categories: MenuCategory[] = [];
  menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  selectedCategory: MenuCategory | null = null;
  searchTerm = '';

  // Tables
  availableTables: RestaurantTable[] = [];

  // Cart
  cart: CartItem[] = [];
  cartTotal = 0;
  cartItemCount = 0;

  // Customization modal
  showCustomizationModal = false;
  customizingItem: MenuItem | null = null;
  customizationForm = {
    quantity: 1,
    selectedVariant: null as MenuItemVariant | null,
    selectedModifiers: [] as MenuItemModifier[],
    specialInstructions: ''
  };

  // Payment modal
  showPaymentModal = false;
  paymentForm = {
    method: PaymentMethod.CASH,
    amount: 0,
    transactionId: '',
    notes: ''
  };
  discountAmount = 0;
  discountCode = '';

  // Order list
  orders: RestaurantOrder[] = [];
  filteredOrders: RestaurantOrder[] = [];
  filterStatus: OrderStatus | 'all' = 'all';
  filterType: OrderType | 'all' = 'all';
  orderSearchTerm = '';

  // Selected order for details
  selectedOrder: RestaurantOrder | null = null;
  showOrderDetailsModal = false;

  // Enums for template
  OrderType = OrderType;
  OrderStatus = OrderStatus;
  PaymentMethod = PaymentMethod;
  FoodType = FoodType;
  ORDER_TYPE_ICONS = ORDER_TYPE_ICONS;
  ORDER_STATUS_COLORS = ORDER_STATUS_COLORS;
  PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;
  FOOD_TYPE_ICONS = FOOD_TYPE_ICONS;

  orderTypes = Object.values(OrderType);
  orderStatuses = Object.values(OrderStatus);
  paymentMethods = Object.values(PaymentMethod);

  constructor(
    private orderService: RestaurantOrderService,
    private menuService: MenuService,
    private tableService: RestaurantTableService,
    private kotService: KOTService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.isLoading = true;

      await Promise.all([
        this.loadCategories(),
        this.loadMenuItems(),
        this.loadTables(),
        this.loadOrders()
      ]);

      this.applyMenuFilters();
      this.applyOrderFilters();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadCategories() {
    const allCategories = await this.menuService.getAllCategories(this.tenantId);
    this.categories = this.menuService.getRootCategories(allCategories);
  }

  async loadMenuItems() {
    this.menuItems = await this.menuService.getAvailableItems(this.tenantId);
  }

  async loadTables() {
    this.availableTables = await this.tableService.getAvailableTables(this.tenantId);
  }

  async loadOrders() {
    this.orders = await this.orderService.getTodaysOrders(this.tenantId);
  }

  // Order type change
  onOrderTypeChange() {
    this.selectedTable = null;
    this.customerName = '';
    this.customerPhone = '';
    this.deliveryAddress = '';
  }

  // Category selection
  selectCategory(category: MenuCategory | null) {
    this.selectedCategory = category;
    this.applyMenuFilters();
  }

  applyMenuFilters() {
    let result = [...this.menuItems];

    // Category filter
    if (this.selectedCategory) {
      result = result.filter(item => item.categoryId === this.selectedCategory!.id);
    }

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    this.filteredItems = result;
  }

  onMenuSearchChange() {
    this.applyMenuFilters();
  }

  // Cart operations
  openCustomizationModal(item: MenuItem) {
    this.customizingItem = item;
    this.customizationForm = {
      quantity: 1,
      selectedVariant: null,
      selectedModifiers: [],
      specialInstructions: ''
    };
    this.showCustomizationModal = true;
  }

  addToCart() {
    if (!this.customizingItem) return;

    const item = this.customizingItem;
    const variant = this.customizationForm.selectedVariant;
    const modifiers = this.customizationForm.selectedModifiers;

    // Calculate item price
    let itemPrice = item.basePrice;
    if (variant) {
      itemPrice += variant.priceAdjustment;
    }
    modifiers.forEach(mod => {
      itemPrice += mod.price;
    });

    const totalPrice = itemPrice * this.customizationForm.quantity;

    const cartItem: CartItem = {
      menuItem: item,
      quantity: this.customizationForm.quantity,
      selectedVariant: variant || undefined,
      selectedModifiers: [...modifiers],
      specialInstructions: this.customizationForm.specialInstructions,
      itemPrice,
      totalPrice
    };

    this.cart.push(cartItem);
    this.updateCartTotals();
    this.closeCustomizationModal();
  }

  removeFromCart(index: number) {
    this.cart.splice(index, 1);
    this.updateCartTotals();
  }

  updateCartItemQuantity(index: number, change: number) {
    const item = this.cart[index];
    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
      this.removeFromCart(index);
      return;
    }

    item.quantity = newQuantity;
    item.totalPrice = item.itemPrice * item.quantity;
    this.updateCartTotals();
  }

  updateCartTotals() {
    this.cartItemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    this.cartTotal = this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  clearCart() {
    if (!confirm('Are you sure you want to clear the cart?')) {
      return;
    }
    this.cart = [];
    this.updateCartTotals();
  }

  closeCustomizationModal() {
    this.showCustomizationModal = false;
    this.customizingItem = null;
  }

  toggleModifier(modifier: MenuItemModifier) {
    const index = this.customizationForm.selectedModifiers.findIndex(m => m.id === modifier.id);
    if (index >= 0) {
      this.customizationForm.selectedModifiers.splice(index, 1);
    } else {
      this.customizationForm.selectedModifiers.push(modifier);
    }
  }

  isModifierSelected(modifier: MenuItemModifier): boolean {
    return this.customizationForm.selectedModifiers.some(m => m.id === modifier.id);
  }

  // Order creation
  openPaymentModal() {
    if (this.cart.length === 0) {
      alert('Cart is empty. Please add items first.');
      return;
    }

    if (this.orderType === OrderType.DINE_IN && !this.selectedTable) {
      alert('Please select a table for dine-in orders.');
      return;
    }

    if (this.orderType === OrderType.DELIVERY && (!this.customerName || !this.deliveryAddress)) {
      alert('Please provide customer name and delivery address.');
      return;
    }

    this.paymentForm = {
      method: PaymentMethod.CASH,
      amount: this.cartTotal - this.discountAmount,
      transactionId: '',
      notes: ''
    };
    this.showPaymentModal = true;
  }

  async createOrder() {
    try {
      // Build order items
      const orderItems: OrderItem[] = this.cart.map((cartItem, index) => ({
        id: `item_${Date.now()}_${index}`,
        menuItemId: cartItem.menuItem.id!,
        name: cartItem.menuItem.name,
        quantity: cartItem.quantity,
        unitPrice: cartItem.menuItem.basePrice,
        variantName: cartItem.selectedVariant?.name,
        variantPrice: cartItem.selectedVariant?.priceAdjustment || 0,
        modifiers: cartItem.selectedModifiers.map(mod => ({
          name: mod.name,
          price: mod.price
        })),
        specialInstructions: cartItem.specialInstructions,
        totalPrice: cartItem.totalPrice,
        status: 'pending' as const
      }));

      // Calculate totals
      const subtotal = this.cartTotal;
      const taxAmount = subtotal * 0.05; // 5% tax
      const totalAmount = subtotal + taxAmount - this.discountAmount;

      // Build order
      const order: Omit<RestaurantOrder, 'id' | 'orderNumber' | 'displayNumber'> = {
        tenantId: this.tenantId,
        type: this.orderType,
        status: OrderStatus.PENDING,
        items: orderItems,
        itemCount: this.cartItemCount,
        tableId: this.selectedTable?.id,
        tableNumber: this.selectedTable?.tableNumber,
        customerName: this.customerName || undefined,
        customerPhone: this.customerPhone || undefined,
        deliveryAddress: this.deliveryAddress || undefined,
        subtotal,
        taxAmount,
        taxPercentage: 5,
        discountAmount: this.discountAmount,
        discountCode: this.discountCode || undefined,
        totalAmount,
        paidAmount: 0,
        paymentStatus: 'pending',
        payments: [],
        statusHistory: [{
          status: OrderStatus.PENDING,
          timestamp: new Date().toISOString(),
          userId: 'current_user',
          userName: 'Current User'
        }],
        createdBy: 'current_user',
        createdByName: 'Current User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create order
      const orderId = await this.orderService.createOrder(order);

      // Add payment
      await this.orderService.addPayment(orderId, {
        method: this.paymentForm.method,
        amount: this.paymentForm.amount,
        transactionId: this.paymentForm.transactionId || undefined,
        notes: this.paymentForm.notes || undefined,
        timestamp: new Date().toISOString()
      });

      // Update table status if dine-in
      if (this.orderType === OrderType.DINE_IN && this.selectedTable) {
        await this.tableService.assignOrderToTable(
          this.selectedTable.id!,
          orderId,
          'current_user',
          'Current User'
        );
      }

      // Clear form
      this.cart = [];
      this.updateCartTotals();
      this.discountAmount = 0;
      this.discountCode = '';
      this.selectedTable = null;
      this.customerName = '';
      this.customerPhone = '';
      this.deliveryAddress = '';
      this.closePaymentModal();

      alert('Order created successfully!');
      await this.loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order');
    }
  }

  closePaymentModal() {
    this.showPaymentModal = false;
  }

  applyDiscount() {
    const discount = parseFloat(prompt('Enter discount amount (₹):') || '0');
    if (discount >= 0 && discount <= this.cartTotal) {
      this.discountAmount = discount;
      this.discountCode = prompt('Enter discount code (optional):') || '';
    }
  }

  // Order list
  switchToOrderList() {
    this.viewMode = 'list';
  }

  switchToCreateOrder() {
    this.viewMode = 'create';
  }

  applyOrderFilters() {
    let result = [...this.orders];

    // Status filter
    if (this.filterStatus !== 'all') {
      result = result.filter(order => order.status === this.filterStatus);
    }

    // Type filter
    if (this.filterType !== 'all') {
      result = result.filter(order => order.type === this.filterType);
    }

    // Search filter
    if (this.orderSearchTerm) {
      const term = this.orderSearchTerm.toLowerCase();
      result = result.filter(order =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName?.toLowerCase().includes(term) ||
        order.tableNumber?.toLowerCase().includes(term)
      );
    }

    this.filteredOrders = result;
  }

  onOrderFilterChange() {
    this.applyOrderFilters();
  }

  viewOrderDetails(order: RestaurantOrder) {
    this.selectedOrder = order;
    this.showOrderDetailsModal = true;
  }

  closeOrderDetailsModal() {
    this.showOrderDetailsModal = false;
    this.selectedOrder = null;
  }

  async updateOrderStatus(order: RestaurantOrder, status: OrderStatus) {
    try {
      await this.orderService.updateOrderStatus(
        order.id!,
        status,
        'current_user',
        'Current User'
      );
      await this.loadOrders();
      this.applyOrderFilters();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  }

  async cancelOrder(order: RestaurantOrder) {
    if (!confirm(`Are you sure you want to cancel order ${order.orderNumber}?`)) {
      return;
    }

    const reason = prompt('Enter cancellation reason:');
    if (!reason) {
      return;
    }

    try {
      await this.orderService.cancelOrder(
        order.id!,
        'current_user',
        'Current User',
        reason
      );
      await this.loadOrders();
      this.applyOrderFilters();
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order');
    }
  }

  // Helpers
  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN');
  }

  getOrderTypeIcon(type: OrderType): string {
    return ORDER_TYPE_ICONS[type] || '📋';
  }

  getOrderStatusColor(status: OrderStatus): string {
    return ORDER_STATUS_COLORS[status] || '#6b7280';
  }

  getPaymentMethodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method] || method;
  }

  getFoodTypeIcon(foodType: FoodType): string {
    return FOOD_TYPE_ICONS[foodType] || '🍽️';
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }
}
