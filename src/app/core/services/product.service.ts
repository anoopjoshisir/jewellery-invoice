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
  updateDoc,
  deleteDoc,
  increment,
  writeBatch
} from '@angular/fire/firestore';
import {
  Product,
  StockTransaction,
  ProductSummary,
  ProductCategory,
  StockStatus,
  calculateProductValue
} from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productCollection = 'products';
  private stockTransactionCollection = 'stockTransactions';

  constructor(private firestore: Firestore) {}

  /**
   * Create a new product
   */
  async createProduct(product: Omit<Product, 'id'>): Promise<string> {
    try {
      // Check if SKU already exists
      const existingProduct = await this.getProductBySKU(product.tenantId, product.sku);
      if (existingProduct) {
        throw new Error(`Product with SKU ${product.sku} already exists`);
      }

      const productCollectionRef = collection(this.firestore, this.productCollection);
      const newDocRef = doc(productCollectionRef);

      const productData: Product = {
        ...product,
        id: newDocRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(newDocRef, productData);

      // Record initial stock transaction if quantity > 0
      if (product.stockQuantity > 0) {
        await this.recordStockTransaction({
          tenantId: product.tenantId,
          productId: newDocRef.id,
          productSku: product.sku,
          productName: product.name,
          transactionType: 'IN',
          quantity: product.stockQuantity,
          previousStock: 0,
          newStock: product.stockQuantity,
          referenceType: 'MANUAL',
          transactionDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: product.createdBy,
          createdByName: product.createdByName,
          notes: 'Initial stock'
        });
      }

      return newDocRef.id;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.productCollection, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.productCollection, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<Product | null> {
    try {
      const docRef = doc(this.firestore, this.productCollection, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as Product;
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySKU(tenantId: string, sku: string): Promise<Product | null> {
    try {
      const productCollectionRef = collection(this.firestore, this.productCollection);
      const q = query(
        productCollectionRef,
        where('tenantId', '==', tenantId),
        where('sku', '==', sku),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return querySnapshot.docs[0].data() as Product;
    } catch (error) {
      console.error('Error getting product by SKU:', error);
      throw error;
    }
  }

  /**
   * Get all products for a tenant
   */
  async getAllProducts(tenantId: string): Promise<Product[]> {
    try {
      const productCollectionRef = collection(this.firestore, this.productCollection);
      const q = query(
        productCollectionRef,
        where('tenantId', '==', tenantId),
        where('isActive', '==', true),
        orderBy('name')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Product);
    } catch (error) {
      console.error('Error getting all products:', error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(
    tenantId: string,
    searchTerm: string
  ): Promise<Product[]> {
    try {
      const allProducts = await this.getAllProducts(tenantId);

      const term = searchTerm.toLowerCase();
      return allProducts.filter(
        product =>
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term) ||
          product.description?.toLowerCase().includes(term) ||
          product.barcode?.toLowerCase().includes(term) ||
          product.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    tenantId: string,
    category: ProductCategory
  ): Promise<Product[]> {
    try {
      const productCollectionRef = collection(this.firestore, this.productCollection);
      const q = query(
        productCollectionRef,
        where('tenantId', '==', tenantId),
        where('category', '==', category),
        where('isActive', '==', true),
        orderBy('name')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Product);
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(tenantId: string): Promise<Product[]> {
    try {
      const allProducts = await this.getAllProducts(tenantId);

      return allProducts.filter(
        product =>
          product.stockStatus === StockStatus.LOW_STOCK ||
          product.stockStatus === StockStatus.OUT_OF_STOCK ||
          (product.minStockLevel &&
            product.stockQuantity <= product.minStockLevel)
      );
    } catch (error) {
      console.error('Error getting low stock products:', error);
      throw error;
    }
  }

  /**
   * Update stock quantity
   */
  async updateStock(
    productId: string,
    quantityChange: number,
    transactionType: 'IN' | 'OUT' | 'ADJUSTMENT',
    referenceType?: 'PURCHASE' | 'SALE' | 'INVOICE' | 'ESTIMATE' | 'MANUAL',
    referenceId?: string,
    referenceNumber?: string,
    userId?: string,
    userName?: string,
    notes?: string
  ): Promise<void> {
    try {
      const product = await this.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const previousStock = product.stockQuantity;
      const newStock = previousStock + quantityChange;

      if (newStock < 0) {
        throw new Error('Insufficient stock');
      }

      // Update product stock
      const docRef = doc(this.firestore, this.productCollection, productId);
      await updateDoc(docRef, {
        stockQuantity: newStock,
        stockStatus: this.calculateStockStatus(newStock, product.minStockLevel),
        updatedAt: new Date().toISOString()
      });

      // Record transaction
      await this.recordStockTransaction({
        tenantId: product.tenantId,
        productId,
        productSku: product.sku,
        productName: product.name,
        transactionType,
        quantity: Math.abs(quantityChange),
        previousStock,
        newStock,
        referenceType,
        referenceId,
        referenceNumber,
        transactionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: userId || 'system',
        createdByName: userName || 'System',
        notes
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  /**
   * Record stock transaction
   */
  private async recordStockTransaction(
    transaction: Omit<StockTransaction, 'id'>
  ): Promise<void> {
    try {
      const transactionCollectionRef = collection(
        this.firestore,
        this.stockTransactionCollection
      );
      const newDocRef = doc(transactionCollectionRef);

      const transactionData: StockTransaction = {
        ...transaction,
        id: newDocRef.id
      };

      await setDoc(newDocRef, transactionData);
    } catch (error) {
      console.error('Error recording stock transaction:', error);
      throw error;
    }
  }

  /**
   * Get stock transaction history for a product
   */
  async getStockTransactions(
    productId: string,
    limitCount: number = 50
  ): Promise<StockTransaction[]> {
    try {
      const transactionCollectionRef = collection(
        this.firestore,
        this.stockTransactionCollection
      );
      const q = query(
        transactionCollectionRef,
        where('productId', '==', productId),
        orderBy('transactionDate', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as StockTransaction);
    } catch (error) {
      console.error('Error getting stock transactions:', error);
      throw error;
    }
  }

  /**
   * Get product summary/statistics
   */
  async getProductSummary(tenantId: string): Promise<ProductSummary> {
    try {
      const products = await this.getAllProducts(tenantId);

      const summary: ProductSummary = {
        totalProducts: products.length,
        inStockProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalStockValue: 0,
        categorySummary: {} as Record<ProductCategory, number>
      };

      // Initialize category summary
      Object.values(ProductCategory).forEach(category => {
        summary.categorySummary[category] = 0;
      });

      products.forEach(product => {
        // Stock status counts
        if (product.stockStatus === StockStatus.IN_STOCK) {
          summary.inStockProducts++;
        } else if (product.stockStatus === StockStatus.LOW_STOCK) {
          summary.lowStockProducts++;
        } else if (product.stockStatus === StockStatus.OUT_OF_STOCK) {
          summary.outOfStockProducts++;
        }

        // Category summary
        summary.categorySummary[product.category]++;

        // Total stock value
        const productValue = product.totalValue || calculateProductValue(product);
        summary.totalStockValue += productValue * product.stockQuantity;
      });

      return summary;
    } catch (error) {
      console.error('Error getting product summary:', error);
      throw error;
    }
  }

  /**
   * Calculate stock status based on quantity and min level
   */
  private calculateStockStatus(
    quantity: number,
    minStockLevel?: number
  ): StockStatus {
    if (quantity === 0) {
      return StockStatus.OUT_OF_STOCK;
    } else if (minStockLevel && quantity <= minStockLevel) {
      return StockStatus.LOW_STOCK;
    } else {
      return StockStatus.IN_STOCK;
    }
  }

  /**
   * Bulk update product prices based on new gold rate
   */
  async updatePricesByGoldRate(
    tenantId: string,
    newGoldRate: number
  ): Promise<number> {
    try {
      const products = await this.getAllProducts(tenantId);
      const batch = writeBatch(this.firestore);
      let updateCount = 0;

      products.forEach(product => {
        if (product.metalType && product.netWeight) {
          const docRef = doc(this.firestore, this.productCollection, product.id!);

          const goldValue = product.netWeight * newGoldRate;
          const totalValue = calculateProductValue({
            ...product,
            goldRate: newGoldRate,
            goldValue
          });

          batch.update(docRef, {
            goldRate: newGoldRate,
            goldValue,
            totalValue,
            updatedAt: new Date().toISOString()
          });

          updateCount++;
        }
      });

      await batch.commit();
      return updateCount;
    } catch (error) {
      console.error('Error updating prices by gold rate:', error);
      throw error;
    }
  }
}
