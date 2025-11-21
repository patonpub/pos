'use client'

import { create } from 'zustand'
import { 
  getProducts, 
  getProduct, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  bulkDeleteProducts,
  searchProducts,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  bulkDeleteSuppliers,
  getInventoryStats,
  type Product,
  type Supplier
} from '@/lib/database'

interface ProductsState {
  products: Product[]
  suppliers: Supplier[]
  loading: boolean
  searchResults: Product[]
  inventoryStats: {
    inventoryValue: number
    potentialValue: number
    totalItems: number
    newProducts: number
  } | null
}

interface ProductsActions {
  // Products
  fetchProducts: (startDate?: string, endDate?: string) => Promise<void>
  fetchProduct: (id: string) => Promise<Product>
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  editProduct: (id: string, updates: Partial<Product>) => Promise<void>
  removeProduct: (id: string) => Promise<void>
  bulkRemoveProducts: (ids: string[]) => Promise<void>
  searchProductsByName: (query: string) => Promise<void>
  clearSearchResults: () => void
  
  // Suppliers
  fetchSuppliers: () => Promise<void>
  addSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  editSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>
  removeSupplier: (id: string) => Promise<void>
  bulkRemoveSuppliers: (ids: string[]) => Promise<void>
  
  // Stats
  fetchInventoryStats: (startDate?: string, endDate?: string) => Promise<void>
  
  // Utility
  setLoading: (loading: boolean) => void
}

type ProductsStore = ProductsState & ProductsActions

export const useProductsStore = create<ProductsStore>((set, get) => ({
  // State
  products: [],
  suppliers: [],
  loading: false,
  searchResults: [],
  inventoryStats: null,

  // Product Actions
  fetchProducts: async (startDate?: string, endDate?: string) => {
    try {
      set({ loading: true })
      const products = await getProducts(startDate, endDate)
      set({ products, loading: false })
    } catch (error) {
      console.error('Error fetching products:', error)
      set({ loading: false })
      throw error
    }
  },

  fetchProduct: async (id: string) => {
    try {
      const product = await getProduct(id)
      return product
    } catch (error) {
      console.error('Error fetching product:', error)
      throw error
    }
  },

  addProduct: async (productData) => {
    try {
      set({ loading: true })
      const newProduct = await createProduct(productData)
      const currentProducts = get().products
      set({ 
        products: [newProduct, ...currentProducts],
        loading: false 
      })
    } catch (error) {
      console.error('Error creating product:', error)
      set({ loading: false })
      throw error
    }
  },

  editProduct: async (id: string, updates) => {
    try {
      set({ loading: true })
      const updatedProduct = await updateProduct(id, updates)
      const currentProducts = get().products
      const updatedProducts = currentProducts.map(p => 
        p.id === id ? updatedProduct : p
      )
      set({ 
        products: updatedProducts,
        loading: false 
      })
    } catch (error) {
      console.error('Error updating product:', error)
      set({ loading: false })
      throw error
    }
  },

  removeProduct: async (id: string) => {
    try {
      set({ loading: true })
      await deleteProduct(id)
      const currentProducts = get().products
      const filteredProducts = currentProducts.filter(p => p.id !== id)
      set({ 
        products: filteredProducts,
        loading: false 
      })
    } catch (error) {
      console.error('Error deleting product:', error)
      set({ loading: false })
      throw error
    }
  },

  bulkRemoveProducts: async (ids: string[]) => {
    try {
      set({ loading: true })
      const results = await bulkDeleteProducts(ids)
      
      // Always refresh the products list to get the current state
      // This ensures products that couldn't be deleted remain visible
      await get().fetchProducts()
      
      set({ loading: false })
      return results
    } catch (error) {
      console.error('Error bulk deleting products:', error)
      set({ loading: false })
      throw error
    }
  },

  searchProductsByName: async (query: string) => {
    try {
      const results = await searchProducts(query)
      set({ searchResults: results })
    } catch (error) {
      console.error('Error searching products:', error)
      throw error
    }
  },

  clearSearchResults: () => {
    set({ searchResults: [] })
  },

  // Supplier Actions
  fetchSuppliers: async () => {
    try {
      set({ loading: true })
      const suppliers = await getSuppliers()
      set({ suppliers, loading: false })
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      set({ loading: false })
      throw error
    }
  },

  addSupplier: async (supplierData) => {
    try {
      set({ loading: true })
      const newSupplier = await createSupplier(supplierData)
      const currentSuppliers = get().suppliers
      set({ 
        suppliers: [newSupplier, ...currentSuppliers],
        loading: false 
      })
    } catch (error) {
      console.error('Error creating supplier:', error)
      set({ loading: false })
      throw error
    }
  },

  editSupplier: async (id: string, updates) => {
    try {
      set({ loading: true })
      const updatedSupplier = await updateSupplier(id, updates)
      const currentSuppliers = get().suppliers
      const updatedSuppliers = currentSuppliers.map(s => 
        s.id === id ? updatedSupplier : s
      )
      set({ 
        suppliers: updatedSuppliers,
        loading: false 
      })
    } catch (error) {
      console.error('Error updating supplier:', error)
      set({ loading: false })
      throw error
    }
  },

  removeSupplier: async (id: string) => {
    try {
      set({ loading: true })
      await deleteSupplier(id)
      const currentSuppliers = get().suppliers
      const filteredSuppliers = currentSuppliers.filter(s => s.id !== id)
      set({ 
        suppliers: filteredSuppliers,
        loading: false 
      })
    } catch (error) {
      console.error('Error deleting supplier:', error)
      set({ loading: false })
      throw error
    }
  },

  bulkRemoveSuppliers: async (ids: string[]) => {
    try {
      set({ loading: true })
      const results = await bulkDeleteSuppliers(ids)
      
      // Update the supplier list by removing successfully deleted suppliers
      if (results && typeof results === 'object' && 'deleted' in results) {
        // If we got results with details, refresh the suppliers to get accurate state
        await get().fetchSuppliers()
      } else {
        // If no error was thrown and no results object, assume all were deleted
        const currentSuppliers = get().suppliers
        const filteredSuppliers = currentSuppliers.filter(s => !ids.includes(s.id))
        set({ suppliers: filteredSuppliers })
      }
      
      set({ loading: false })
      return results
    } catch (error) {
      console.error('Error bulk deleting suppliers:', error)
      set({ loading: false })
      throw error
    }
  },

  // Stats Actions
  fetchInventoryStats: async (startDate?: string, endDate?: string) => {
    try {
      const stats = await getInventoryStats(startDate, endDate)
      set({ inventoryStats: stats })
    } catch (error) {
      console.error('Error fetching inventory stats:', error)
      throw error
    }
  },

  // Utility
  setLoading: (loading: boolean) => {
    set({ loading })
  },
}))