import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy } from '@angular/fire/firestore';
import {
  MenuCategory,
  MenuItem,
  MenuItemVariant,
  MenuItemModifier,
  MenuItemStatus,
  MenuSection,
  MenuSummary,
  CategoryWithItems,
  isItemAvailableNow,
  calculateItemPrice
} from '../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private categoriesCollection = 'menu_categories';
  private itemsCollection = 'menu_items';
  private sectionsCollection = 'menu_sections';

  constructor(private firestore: Firestore) {}

  // ==================== CATEGORIES ====================

  async createCategory(category: Omit<MenuCategory, 'id'>): Promise<string> {
    const ref = doc(collection(this.firestore, this.categoriesCollection));
    const now = new Date().toISOString();

    const data: MenuCategory = {
      ...category,
      id: ref.id,
      itemCount: 0,
      createdAt: category.createdAt || now,
      updatedAt: now
    };

    await setDoc(ref, data);
    return ref.id;
  }

  async getCategoryById(id: string): Promise<MenuCategory | null> {
    const docRef = doc(this.firestore, this.categoriesCollection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as MenuCategory) : null;
  }

  async getCategoriesByTenant(tenantId: string): Promise<MenuCategory[]> {
    const q = query(
      collection(this.firestore, this.categoriesCollection),
      where('tenantId', '==', tenantId),
      orderBy('displayOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MenuCategory);
  }

  async getRootCategories(tenantId: string): Promise<MenuCategory[]> {
    const q = query(
      collection(this.firestore, this.categoriesCollection),
      where('tenantId', '==', tenantId),
      where('level', '==', 0),
      orderBy('displayOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MenuCategory);
  }

  async getSubcategories(parentCategoryId: string): Promise<MenuCategory[]> {
    const q = query(
      collection(this.firestore, this.categoriesCollection),
      where('parentCategoryId', '==', parentCategoryId),
      orderBy('displayOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MenuCategory);
  }

  async updateCategory(id: string, updates: Partial<MenuCategory>): Promise<void> {
    const docRef = doc(this.firestore, this.categoriesCollection, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteCategory(id: string): Promise<void> {
    // Check if category has items
    const items = await this.getItemsByCategory(id);
    if (items.length > 0) {
      throw new Error('Cannot delete category with items. Please remove or reassign items first.');
    }

    // Check if category has subcategories
    const subcategories = await this.getSubcategories(id);
    if (subcategories.length > 0) {
      throw new Error('Cannot delete category with subcategories. Please delete subcategories first.');
    }

    const docRef = doc(this.firestore, this.categoriesCollection, id);
    await deleteDoc(docRef);
  }

  async updateItemCount(categoryId: string): Promise<void> {
    const items = await this.getItemsByCategory(categoryId);
    await this.updateCategory(categoryId, { itemCount: items.length });
  }

  // ==================== MENU ITEMS ====================

  async createItem(item: Omit<MenuItem, 'id'>): Promise<string> {
    const ref = doc(collection(this.firestore, this.itemsCollection));
    const now = new Date().toISOString();

    const data: MenuItem = {
      ...item,
      id: ref.id,
      orderCount: 0,
      createdAt: item.createdAt || now,
      updatedAt: now
    };

    await setDoc(ref, data);

    // Update category item count
    await this.updateItemCount(item.categoryId);

    return ref.id;
  }

  async getItemById(id: string): Promise<MenuItem | null> {
    const docRef = doc(this.firestore, this.itemsCollection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as MenuItem) : null;
  }

  async getItemsByTenant(tenantId: string): Promise<MenuItem[]> {
    const q = query(
      collection(this.firestore, this.itemsCollection),
      where('tenantId', '==', tenantId),
      orderBy('displayOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MenuItem);
  }

  async getItemsByCategory(categoryId: string): Promise<MenuItem[]> {
    const q = query(
      collection(this.firestore, this.itemsCollection),
      where('categoryId', '==', categoryId),
      orderBy('displayOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MenuItem);
  }

  async getAvailableItems(tenantId: string): Promise<MenuItem[]> {
    const items = await this.getItemsByTenant(tenantId);
    return items.filter(item => isItemAvailableNow(item));
  }

  async getFeaturedItems(tenantId: string): Promise<MenuItem[]> {
    const q = query(
      collection(this.firestore, this.itemsCollection),
      where('tenantId', '==', tenantId),
      where('isFeatured', '==', true),
      where('isActive', '==', true),
      where('isVisible', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MenuItem);
  }

  async getPopularItems(tenantId: string, limit: number = 10): Promise<MenuItem[]> {
    const items = await this.getItemsByTenant(tenantId);
    return items
      .filter(item => item.isActive && item.isVisible)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, limit);
  }

  async getBestSellers(tenantId: string): Promise<MenuItem[]> {
    const q = query(
      collection(this.firestore, this.itemsCollection),
      where('tenantId', '==', tenantId),
      where('isBestSeller', '==', true),
      where('isActive', '==', true),
      where('isVisible', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MenuItem);
  }

  async getNewItems(tenantId: string): Promise<MenuItem[]> {
    const q = query(
      collection(this.firestore, this.itemsCollection),
      where('tenantId', '==', tenantId),
      where('isNew', '==', true),
      where('isActive', '==', true),
      where('isVisible', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MenuItem);
  }

  async searchItems(tenantId: string, searchTerm: string): Promise<MenuItem[]> {
    const items = await this.getItemsByTenant(tenantId);
    const term = searchTerm.toLowerCase();

    return items.filter(item => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.displayName.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.tags.some(tag => tag.toLowerCase().includes(term)) ||
        item.searchKeywords.some(kw => kw.toLowerCase().includes(term))
      );
    });
  }

  async updateItem(id: string, updates: Partial<MenuItem>): Promise<void> {
    const docRef = doc(this.firestore, this.itemsCollection, id);

    // If category is being changed, update item counts
    const oldItem = await this.getItemById(id);
    if (oldItem && updates.categoryId && updates.categoryId !== oldItem.categoryId) {
      await this.updateItemCount(oldItem.categoryId);
      await this.updateItemCount(updates.categoryId);
    }

    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteItem(id: string): Promise<void> {
    const item = await this.getItemById(id);
    const docRef = doc(this.firestore, this.itemsCollection, id);
    await deleteDoc(docRef);

    // Update category item count
    if (item) {
      await this.updateItemCount(item.categoryId);
    }
  }

  async updateItemAvailability(id: string, isAvailable: boolean, updatedBy: string): Promise<void> {
    await this.updateItem(id, { isAvailable, updatedBy });
  }

  async updateItemStatus(id: string, status: MenuItemStatus, updatedBy: string): Promise<void> {
    await this.updateItem(id, { status, updatedBy });
  }

  async updateItemStock(id: string, quantity: number, updatedBy: string): Promise<void> {
    await this.updateItem(id, { availableQuantity: quantity, updatedBy });
  }

  async decrementStock(id: string, quantity: number): Promise<void> {
    const item = await this.getItemById(id);
    if (!item || item.availableQuantity === undefined) return;

    const newQuantity = Math.max(0, item.availableQuantity - quantity);
    await this.updateItem(id, {
      availableQuantity: newQuantity,
      isAvailable: newQuantity > 0,
      status: newQuantity === 0 ? MenuItemStatus.OUT_OF_STOCK : item.status
    });
  }

  async incrementOrderCount(id: string): Promise<void> {
    const item = await this.getItemById(id);
    if (!item) return;

    await this.updateItem(id, { orderCount: item.orderCount + 1 });
  }

  // ==================== VARIANTS ====================

  async addVariant(itemId: string, variant: MenuItemVariant): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    const variants = [...item.variants, variant];
    await this.updateItem(itemId, { variants });
  }

  async updateVariant(itemId: string, variantId: string, updates: Partial<MenuItemVariant>): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    const variants = item.variants.map(v =>
      v.id === variantId ? { ...v, ...updates } : v
    );
    await this.updateItem(itemId, { variants });
  }

  async removeVariant(itemId: string, variantId: string): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    const variants = item.variants.filter(v => v.id !== variantId);
    await this.updateItem(itemId, { variants });
  }

  // ==================== MODIFIERS ====================

  async addModifier(itemId: string, modifier: MenuItemModifier): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    const modifiers = [...item.modifiers, modifier];
    await this.updateItem(itemId, { modifiers });
  }

  async updateModifier(itemId: string, modifierId: string, updates: Partial<MenuItemModifier>): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    const modifiers = item.modifiers.map(m =>
      m.id === modifierId ? { ...m, ...updates } : m
    );
    await this.updateItem(itemId, { modifiers });
  }

  async removeModifier(itemId: string, modifierId: string): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) throw new Error('Item not found');

    const modifiers = item.modifiers.filter(m => m.id !== modifierId);
    await this.updateItem(itemId, { modifiers });
  }

  // ==================== MENU SECTIONS ====================

  async createSection(section: Omit<MenuSection, 'id'>): Promise<string> {
    const ref = doc(collection(this.firestore, this.sectionsCollection));
    const now = new Date().toISOString();

    const data: MenuSection = {
      ...section,
      id: ref.id,
      createdAt: section.createdAt || now,
      updatedAt: now
    };

    await setDoc(ref, data);
    return ref.id;
  }

  async getSectionById(id: string): Promise<MenuSection | null> {
    const docRef = doc(this.firestore, this.sectionsCollection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as MenuSection) : null;
  }

  async getSectionsByTenant(tenantId: string): Promise<MenuSection[]> {
    const q = query(
      collection(this.firestore, this.sectionsCollection),
      where('tenantId', '==', tenantId),
      orderBy('displayOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MenuSection);
  }

  async updateSection(id: string, updates: Partial<MenuSection>): Promise<void> {
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

  // ==================== SUMMARIES ====================

  async getMenuSummary(tenantId: string): Promise<MenuSummary> {
    const categories = await this.getCategoriesByTenant(tenantId);
    const items = await this.getItemsByTenant(tenantId);
    const popularItems = await this.getPopularItems(tenantId, 5);
    const newItems = await this.getNewItems(tenantId);
    const bestSellers = await this.getBestSellers(tenantId);

    const availableItems = items.filter(item => isItemAvailableNow(item));
    const outOfStockItems = items.filter(item => item.status === MenuItemStatus.OUT_OF_STOCK);

    return {
      totalCategories: categories.filter(c => c.level === 0).length,
      totalItems: items.length,
      availableItems: availableItems.length,
      outOfStockItems: outOfStockItems.length,
      popularItems,
      newItems,
      bestSellers
    };
  }

  async getCategoryWithItems(categoryId: string): Promise<CategoryWithItems | null> {
    const category = await this.getCategoryById(categoryId);
    if (!category) return null;

    const items = await this.getItemsByCategory(categoryId);
    const subcategories = await this.getSubcategories(categoryId);

    const subcategoryWithItems: CategoryWithItems[] = [];
    for (const subcat of subcategories) {
      const subcatItems = await this.getItemsByCategory(subcat.id!);
      subcategoryWithItems.push({
        category: subcat,
        items: subcatItems
      });
    }

    return {
      category,
      items,
      subcategories: subcategoryWithItems.length > 0 ? subcategoryWithItems : undefined
    };
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpdateAvailability(itemIds: string[], isAvailable: boolean, updatedBy: string): Promise<void> {
    const promises = itemIds.map(id => this.updateItemAvailability(id, isAvailable, updatedBy));
    await Promise.all(promises);
  }

  async bulkUpdateStatus(itemIds: string[], status: MenuItemStatus, updatedBy: string): Promise<void> {
    const promises = itemIds.map(id => this.updateItemStatus(id, status, updatedBy));
    await Promise.all(promises);
  }

  async bulkDelete(itemIds: string[]): Promise<void> {
    const promises = itemIds.map(id => this.deleteItem(id));
    await Promise.all(promises);
  }

  // ==================== HELPER METHODS ====================

  calculatePrice(itemId: string, variantId?: string, modifierIds: string[] = []): number {
    // This would typically be called with the item object, not fetched
    // For service method, we'll need to fetch the item first
    throw new Error('Use calculateItemPrice from the model instead');
  }

  async reorderCategories(categoryIds: string[]): Promise<void> {
    const promises = categoryIds.map((id, index) =>
      this.updateCategory(id, { displayOrder: index })
    );
    await Promise.all(promises);
  }

  async reorderItems(itemIds: string[]): Promise<void> {
    const promises = itemIds.map((id, index) =>
      this.updateItem(id, { displayOrder: index })
    );
    await Promise.all(promises);
  }
}
