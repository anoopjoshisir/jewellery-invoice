import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../core/services/menu.service';
import {
  MenuCategory,
  MenuItem,
  MenuItemVariant,
  MenuItemModifier,
  FoodType,
  SpiceLevel,
  FOOD_TYPE_LABELS,
  FOOD_TYPE_ICONS,
  SPICE_LEVEL_LABELS
} from '../../core/models/menu-item.model';

interface CategoryFormData {
  name: string;
  description: string;
  parentId: string | null;
  displayOrder: number;
  icon: string;
  isActive: boolean;
}

interface ItemFormData {
  name: string;
  description: string;
  categoryId: string;
  foodType: FoodType;
  spiceLevel: SpiceLevel;
  basePrice: number;
  preparationTime: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  allergens: string[];
  tags: string[];
  imageUrl: string;
}

type ViewMode = 'grid' | 'list';
type ModalMode = 'category' | 'item' | 'variant' | 'modifier' | 'item-details';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.scss']
})
export class MenuManagementComponent implements OnInit {
  isLoading = false;
  tenantId = 'tenant_001'; // TODO: Get from auth service

  // View state
  viewMode: ViewMode = 'grid';
  selectedCategory: MenuCategory | null = null;
  searchTerm = '';
  filterFoodType: FoodType | 'all' = 'all';
  filterAvailability: 'all' | 'available' | 'unavailable' = 'all';

  // Data
  categories: MenuCategory[] = [];
  allCategories: MenuCategory[] = []; // For dropdowns
  items: MenuItem[] = [];
  filteredItems: MenuItem[] = [];

  // Modal state
  showModal = false;
  modalMode: ModalMode = 'category';
  isEditMode = false;

  // Category form
  categoryForm: CategoryFormData = this.getEmptyCategoryForm();
  editingCategoryId: string | null = null;

  // Item form
  itemForm: ItemFormData = this.getEmptyItemForm();
  editingItemId: string | null = null;
  currentItemTab: 'basic' | 'pricing' | 'variants' | 'modifiers' = 'basic';

  // Variants and modifiers (for editing item)
  itemVariants: MenuItemVariant[] = [];
  itemModifiers: MenuItemModifier[] = [];
  editingVariant: MenuItemVariant | null = null;
  editingModifier: MenuItemModifier | null = null;

  // Item details modal
  selectedItem: MenuItem | null = null;

  // Enums for template
  FoodType = FoodType;
  SpiceLevel = SpiceLevel;
  FOOD_TYPE_LABELS = FOOD_TYPE_LABELS;
  FOOD_TYPE_ICONS = FOOD_TYPE_ICONS;
  SPICE_LEVEL_LABELS = SPICE_LEVEL_LABELS;

  // Available options
  foodTypes = Object.values(FoodType);
  spiceLevels = Object.values(SpiceLevel);
  allergenOptions = [
    'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts',
    'Wheat', 'Soy', 'Sesame', 'Gluten', 'Mustard', 'Celery'
  ];

  constructor(private menuService: MenuService) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.isLoading = true;

      // Load categories and items in parallel
      await Promise.all([
        this.loadCategories(),
        this.loadItems()
      ]);

      this.applyFilters();
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load menu data');
    } finally {
      this.isLoading = false;
    }
  }

  async loadCategories() {
    this.allCategories = await this.menuService.getAllCategories(this.tenantId);
    this.categories = this.menuService.getRootCategories(this.allCategories);
  }

  async loadItems() {
    if (this.selectedCategory) {
      this.items = await this.menuService.getItemsByCategory(this.selectedCategory.id!, this.tenantId);
    } else {
      this.items = await this.menuService.getMenuItems(this.tenantId);
    }
  }

  // Category operations
  selectCategory(category: MenuCategory | null) {
    this.selectedCategory = category;
    this.loadItems();
  }

  openCategoryModal(category?: MenuCategory) {
    this.modalMode = 'category';
    this.isEditMode = !!category;

    if (category) {
      this.editingCategoryId = category.id!;
      this.categoryForm = {
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || null,
        displayOrder: category.displayOrder,
        icon: category.icon || '',
        isActive: category.isActive
      };
    } else {
      this.editingCategoryId = null;
      this.categoryForm = this.getEmptyCategoryForm();
    }

    this.showModal = true;
  }

  async saveCategory() {
    try {
      const categoryData = {
        ...this.categoryForm,
        tenantId: this.tenantId,
        itemCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (this.isEditMode && this.editingCategoryId) {
        await this.menuService.updateCategory(this.editingCategoryId, this.categoryForm);
      } else {
        await this.menuService.createCategory(categoryData);
      }

      await this.loadCategories();
      this.closeModal();
      alert(this.isEditMode ? 'Category updated successfully' : 'Category created successfully');
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  }

  async deleteCategory(category: MenuCategory) {
    if (category.itemCount > 0) {
      alert('Cannot delete category with items. Please move or delete items first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await this.menuService.deleteCategory(category.id!);
      await this.loadCategories();

      if (this.selectedCategory?.id === category.id) {
        this.selectedCategory = null;
        await this.loadItems();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  }

  // Item operations
  openItemModal(item?: MenuItem) {
    this.modalMode = 'item';
    this.isEditMode = !!item;
    this.currentItemTab = 'basic';

    if (item) {
      this.editingItemId = item.id!;
      this.itemForm = {
        name: item.name,
        description: item.description || '',
        categoryId: item.categoryId,
        foodType: item.foodType,
        spiceLevel: item.spiceLevel || SpiceLevel.NONE,
        basePrice: item.basePrice,
        preparationTime: item.preparationTime,
        isAvailable: item.isAvailable,
        isFeatured: item.isFeatured || false,
        isPopular: item.isPopular || false,
        isBestSeller: item.isBestSeller || false,
        isNew: item.isNew || false,
        allergens: item.allergens || [],
        tags: item.tags || [],
        imageUrl: item.imageUrl || ''
      };
      this.itemVariants = item.variants || [];
      this.itemModifiers = item.modifiers || [];
    } else {
      this.editingItemId = null;
      this.itemForm = this.getEmptyItemForm();
      this.itemForm.categoryId = this.selectedCategory?.id || '';
      this.itemVariants = [];
      this.itemModifiers = [];
    }

    this.showModal = true;
  }

  async saveItem() {
    try {
      const itemData = {
        ...this.itemForm,
        tenantId: this.tenantId,
        variants: this.itemVariants,
        modifiers: this.itemModifiers,
        orderCount: 0,
        stock: 1000, // Default stock
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (this.isEditMode && this.editingItemId) {
        await this.menuService.updateItem(this.editingItemId, itemData);
      } else {
        await this.menuService.createItem(itemData);
      }

      await Promise.all([
        this.loadCategories(),
        this.loadItems()
      ]);
      this.closeModal();
      alert(this.isEditMode ? 'Item updated successfully' : 'Item created successfully');
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    }
  }

  async deleteItem(item: MenuItem) {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      await this.menuService.deleteItem(item.id!);
      await Promise.all([
        this.loadCategories(),
        this.loadItems()
      ]);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  }

  async toggleItemAvailability(item: MenuItem) {
    try {
      await this.menuService.updateItemAvailability(item.id!, !item.isAvailable);
      item.isAvailable = !item.isAvailable;
      this.applyFilters();
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability');
    }
  }

  async updateItemStock(item: MenuItem, quantity: number) {
    try {
      await this.menuService.updateItemStock(item.id!, quantity, 'current_user');
      await this.loadItems();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock');
    }
  }

  // Variant operations
  addVariant() {
    this.editingVariant = {
      id: `var_${Date.now()}`,
      name: '',
      priceAdjustment: 0,
      isAvailable: true
    };
  }

  saveVariant() {
    if (!this.editingVariant) return;

    const existingIndex = this.itemVariants.findIndex(v => v.id === this.editingVariant!.id);
    if (existingIndex >= 0) {
      this.itemVariants[existingIndex] = { ...this.editingVariant };
    } else {
      this.itemVariants.push({ ...this.editingVariant });
    }

    this.editingVariant = null;
  }

  editVariant(variant: MenuItemVariant) {
    this.editingVariant = { ...variant };
  }

  removeVariant(variantId: string) {
    this.itemVariants = this.itemVariants.filter(v => v.id !== variantId);
  }

  cancelVariantEdit() {
    this.editingVariant = null;
  }

  // Modifier operations
  addModifier() {
    this.editingModifier = {
      id: `mod_${Date.now()}`,
      name: '',
      price: 0,
      isAvailable: true
    };
  }

  saveModifier() {
    if (!this.editingModifier) return;

    const existingIndex = this.itemModifiers.findIndex(m => m.id === this.editingModifier!.id);
    if (existingIndex >= 0) {
      this.itemModifiers[existingIndex] = { ...this.editingModifier };
    } else {
      this.itemModifiers.push({ ...this.editingModifier });
    }

    this.editingModifier = null;
  }

  editModifier(modifier: MenuItemModifier) {
    this.editingModifier = { ...modifier };
  }

  removeModifier(modifierId: string) {
    this.itemModifiers = this.itemModifiers.filter(m => m.id !== modifierId);
  }

  cancelModifierEdit() {
    this.editingModifier = null;
  }

  // Item details
  viewItemDetails(item: MenuItem) {
    this.selectedItem = item;
    this.modalMode = 'item-details';
    this.showModal = true;
  }

  // Filters and search
  applyFilters() {
    let result = [...this.items];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Food type filter
    if (this.filterFoodType !== 'all') {
      result = result.filter(item => item.foodType === this.filterFoodType);
    }

    // Availability filter
    if (this.filterAvailability === 'available') {
      result = result.filter(item => item.isAvailable);
    } else if (this.filterAvailability === 'unavailable') {
      result = result.filter(item => !item.isAvailable);
    }

    this.filteredItems = result;
  }

  onSearchChange() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  // Helpers
  getEmptyCategoryForm(): CategoryFormData {
    return {
      name: '',
      description: '',
      parentId: null,
      displayOrder: 0,
      icon: '',
      isActive: true
    };
  }

  getEmptyItemForm(): ItemFormData {
    return {
      name: '',
      description: '',
      categoryId: '',
      foodType: FoodType.VEG,
      spiceLevel: SpiceLevel.NONE,
      basePrice: 0,
      preparationTime: 15,
      isAvailable: true,
      isFeatured: false,
      isPopular: false,
      isBestSeller: false,
      isNew: false,
      allergens: [],
      tags: [],
      imageUrl: ''
    };
  }

  closeModal() {
    this.showModal = false;
    this.modalMode = 'category';
    this.isEditMode = false;
    this.editingCategoryId = null;
    this.editingItemId = null;
    this.selectedItem = null;
    this.editingVariant = null;
    this.editingModifier = null;
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  getCategoryName(categoryId: string): string {
    const category = this.allCategories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  getFoodTypeIcon(foodType: FoodType): string {
    return FOOD_TYPE_ICONS[foodType] || '🍽️';
  }

  getFoodTypeLabel(foodType: FoodType): string {
    return FOOD_TYPE_LABELS[foodType] || foodType;
  }

  getSpiceLevelLabel(spiceLevel: SpiceLevel): string {
    return SPICE_LEVEL_LABELS[spiceLevel] || spiceLevel;
  }

  // Allergen management
  toggleAllergen(allergen: string) {
    const index = this.itemForm.allergens.indexOf(allergen);
    if (index >= 0) {
      this.itemForm.allergens.splice(index, 1);
    } else {
      this.itemForm.allergens.push(allergen);
    }
  }

  isAllergenSelected(allergen: string): boolean {
    return this.itemForm.allergens.includes(allergen);
  }

  // Tag management
  addTag(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const tag = input.value.trim();

      if (tag && !this.itemForm.tags.includes(tag)) {
        this.itemForm.tags.push(tag);
        input.value = '';
      }
    }
  }

  removeTag(tag: string) {
    this.itemForm.tags = this.itemForm.tags.filter(t => t !== tag);
  }
}
