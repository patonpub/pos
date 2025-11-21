'use client'

import { create } from 'zustand'
import { 
  getSales, 
  getSale, 
  createSale, 
  updateSale, 
  deleteSale,
  bulkDeleteSales,
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  bulkDeletePurchases,
  getPurchasesBySupplier,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  bulkDeleteExpenses,
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  bulkDeleteAssets,
  getDebtors,
  getDebtor,
  createDebtor,
  updateDebtor,
  deleteDebtor,
  bulkDeleteDebtors,
  getBreakages,
  createBreakage,
  updateBreakage,
  deleteBreakage,
  bulkDeleteBreakages,
  getSalesReport,
  getInventoryReport,
  getDashboardStatsOptimized,
  getDebtorStats,
  getBreakageStats,
  getPurchaseStats,
  type Sale,
  type SaleItem,
  type SaleWithItems,
  type Purchase,
  type PurchaseItem,
  type PurchaseWithItems,
  type Expense,
  type Asset,
  type Debtor,
  type DebtorItem,
  type DebtorWithItems,
  type Breakage,
  type Product
} from '@/lib/database'

interface SalesState {
  sales: SaleWithItems[]
  purchases: PurchaseWithItems[]
  expenses: Expense[]
  assets: Asset[]
  debtors: DebtorWithItems[]
  breakages: (Breakage & { products?: { name: string } })[]
  loading: boolean
  dashboardStats: {
    totalRevenue: number
    totalSales: number
    totalDebtors: number
    totalProfit: number
    cashSales: number
    mpesaSales: number
    topProduct: string
    topProductQuantity: number
  } | null
  debtorStats: {
    totalDebtors: number
    outstandingDebtors: number
    overdueDebtors: number
    dueSoon: number
  } | null
  breakageStats: {
    totalBreakages: number
    totalLoss: number
    approvedLoss: number
    pending: number
  } | null
  purchaseStats: {
    totalPurchases: number
    totalValue: number
    itemsPurchased: number
    totalCost: number
  } | null
}

interface SalesActions {
  // Sales
  fetchSales: (startDate?: string, endDate?: string) => Promise<void>
  fetchSale: (id: string) => Promise<SaleWithItems>
  addSale: (sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>, items: Omit<SaleItem, 'id' | 'sale_id' | 'created_at'>[]) => Promise<void>
  editSale: (id: string, updates: Partial<Sale>) => Promise<void>
  removeSale: (id: string) => Promise<void>
  bulkRemoveSales: (ids: string[]) => Promise<void>
  
  // Purchases
  fetchPurchases: (startDate?: string, endDate?: string) => Promise<void>
  fetchPurchasesBySupplier: (supplierId: string) => Promise<PurchaseWithItems[]>
  addPurchase: (purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>, items: Omit<PurchaseItem, 'id' | 'purchase_id' | 'created_at'>[]) => Promise<void>
  editPurchase: (id: string, updates: Partial<Purchase>) => Promise<void>
  removePurchase: (id: string) => Promise<void>
  bulkRemovePurchases: (ids: string[]) => Promise<void>
  
  // Expenses
  fetchExpenses: (startDate?: string, endDate?: string) => Promise<void>
  addExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  editExpense: (id: string, updates: Partial<Expense>) => Promise<void>
  removeExpense: (id: string) => Promise<void>
  bulkRemoveExpenses: (ids: string[]) => Promise<void>
  
  // Assets
  fetchAssets: () => Promise<void>
  addAsset: (asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  editAsset: (id: string, updates: Partial<Asset>) => Promise<void>
  removeAsset: (id: string) => Promise<void>
  bulkRemoveAssets: (ids: string[]) => Promise<void>
  
  // Debtors
  fetchDebtors: (startDate?: string, endDate?: string) => Promise<void>
  fetchDebtor: (id: string) => Promise<DebtorWithItems>
  addDebtor: (debtor: Omit<Debtor, 'id' | 'created_at' | 'updated_at'>, items?: Omit<DebtorItem, 'id' | 'debtor_id' | 'created_at'>[]) => Promise<void>
  editDebtor: (id: string, updates: Partial<Debtor>) => Promise<void>
  removeDebtor: (id: string) => Promise<void>
  bulkRemoveDebtors: (ids: string[]) => Promise<void>
  
  // Breakages
  fetchBreakages: (startDate?: string, endDate?: string) => Promise<void>
  addBreakage: (breakage: Omit<Breakage, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  editBreakage: (id: string, updates: Partial<Breakage>) => Promise<void>
  removeBreakage: (id: string) => Promise<void>
  bulkRemoveBreakages: (ids: string[]) => Promise<void>
  
  // Reports & Stats
  fetchDashboardStats: (startDate?: string, endDate?: string) => Promise<void>
  fetchDebtorStats: (startDate?: string, endDate?: string) => Promise<void>
  fetchBreakageStats: (startDate?: string, endDate?: string) => Promise<void>
  fetchPurchaseStats: (startDate?: string, endDate?: string) => Promise<void>
  fetchSalesReport: (startDate: string, endDate: string) => Promise<SaleWithItems[]>
  fetchInventoryReport: () => Promise<Product[]>
  
  // Utility
  setLoading: (loading: boolean) => void
}

type SalesStore = SalesState & SalesActions

export const useSalesStore = create<SalesStore>((set, get) => ({
  // State
  sales: [],
  purchases: [],
  expenses: [],
  assets: [],
  debtors: [],
  breakages: [],
  loading: false,
  dashboardStats: null,
  debtorStats: null,
  breakageStats: null,
  purchaseStats: null,

  // Sales Actions
  fetchSales: async (startDate?: string, endDate?: string) => {
    try {
      set({ loading: true })
      const sales = await getSales(startDate, endDate)
      set({ sales, loading: false })
    } catch (error) {
      console.error('Error fetching sales:', error)
      set({ loading: false })
      throw error
    }
  },

  fetchSale: async (id: string) => {
    try {
      const sale = await getSale(id)
      return sale
    } catch (error) {
      console.error('Error fetching sale:', error)
      throw error
    }
  },

  addSale: async (saleData, items) => {
    try {
      set({ loading: true })
      const newSale = await createSale(saleData, items)
      // Refresh sales to get complete data with items
      await get().fetchSales()
    } catch (error) {
      console.error('Error creating sale:', error)
      set({ loading: false })
      throw error
    }
  },

  editSale: async (id: string, updates) => {
    try {
      set({ loading: true })
      await updateSale(id, updates)
      // Refresh sales to get updated data
      await get().fetchSales()
    } catch (error) {
      console.error('Error updating sale:', error)
      set({ loading: false })
      throw error
    }
  },

  removeSale: async (id: string) => {
    try {
      set({ loading: true })
      await deleteSale(id)
      const currentSales = get().sales
      const filteredSales = currentSales.filter(s => s.id !== id)
      set({ 
        sales: filteredSales,
        loading: false 
      })
    } catch (error) {
      console.error('Error deleting sale:', error)
      set({ loading: false })
      throw error
    }
  },

  bulkRemoveSales: async (ids: string[]) => {
    try {
      set({ loading: true })
      await bulkDeleteSales(ids)
      const currentSales = get().sales
      const filteredSales = currentSales.filter(s => !ids.includes(s.id))
      set({ 
        sales: filteredSales,
        loading: false 
      })
    } catch (error) {
      console.error('Error bulk deleting sales:', error)
      set({ loading: false })
      throw error
    }
  },

  // Purchase Actions
  fetchPurchases: async (startDate?: string, endDate?: string) => {
    try {
      set({ loading: true })
      const purchases = await getPurchases(startDate, endDate)
      set({ purchases, loading: false })
    } catch (error) {
      console.error('Error fetching purchases:', error)
      set({ loading: false })
      throw error
    }
  },

  fetchPurchasesBySupplier: async (supplierId: string) => {
    try {
      const purchases = await getPurchasesBySupplier(supplierId)
      return purchases
    } catch (error) {
      console.error('Error fetching purchases by supplier:', error)
      throw error
    }
  },

  addPurchase: async (purchaseData, items) => {
    try {
      set({ loading: true })
      await createPurchase(purchaseData, items)
      // Refresh purchases to get complete data
      await get().fetchPurchases()
    } catch (error) {
      console.error('Error creating purchase:', error)
      set({ loading: false })
      throw error
    }
  },

  editPurchase: async (id: string, updates) => {
    try {
      set({ loading: true })
      await updatePurchase(id, updates)
      // Refresh purchases to get updated data
      await get().fetchPurchases()
    } catch (error) {
      console.error('Error updating purchase:', error)
      set({ loading: false })
      throw error
    }
  },

  removePurchase: async (id: string) => {
    try {
      set({ loading: true })
      await deletePurchase(id)
      const currentPurchases = get().purchases
      const filteredPurchases = currentPurchases.filter(p => p.id !== id)
      set({ 
        purchases: filteredPurchases,
        loading: false 
      })
    } catch (error) {
      console.error('Error deleting purchase:', error)
      set({ loading: false })
      throw error
    }
  },

  bulkRemovePurchases: async (ids: string[]) => {
    try {
      set({ loading: true })
      await bulkDeletePurchases(ids)
      const currentPurchases = get().purchases
      const filteredPurchases = currentPurchases.filter(p => !ids.includes(p.id))
      set({ 
        purchases: filteredPurchases,
        loading: false 
      })
    } catch (error) {
      console.error('Error bulk deleting purchases:', error)
      set({ loading: false })
      throw error
    }
  },

  // Expense Actions
  fetchExpenses: async (startDate?: string, endDate?: string) => {
    try {
      set({ loading: true })
      const expenses = await getExpenses(startDate, endDate)
      set({ expenses, loading: false })
    } catch (error) {
      console.error('Error fetching expenses:', error)
      set({ loading: false })
      throw error
    }
  },

  addExpense: async (expenseData) => {
    try {
      set({ loading: true })
      const newExpense = await createExpense(expenseData)
      const currentExpenses = get().expenses
      set({ 
        expenses: [newExpense, ...currentExpenses],
        loading: false 
      })
    } catch (error) {
      console.error('Error creating expense:', error)
      set({ loading: false })
      throw error
    }
  },

  editExpense: async (id: string, updates) => {
    try {
      set({ loading: true })
      const updatedExpense = await updateExpense(id, updates)
      const currentExpenses = get().expenses
      const updatedExpenses = currentExpenses.map(e => 
        e.id === id ? updatedExpense : e
      )
      set({ 
        expenses: updatedExpenses,
        loading: false 
      })
    } catch (error) {
      console.error('Error updating expense:', error)
      set({ loading: false })
      throw error
    }
  },

  removeExpense: async (id: string) => {
    try {
      set({ loading: true })
      await deleteExpense(id)
      const currentExpenses = get().expenses
      const filteredExpenses = currentExpenses.filter(e => e.id !== id)
      set({ 
        expenses: filteredExpenses,
        loading: false 
      })
    } catch (error) {
      console.error('Error deleting expense:', error)
      set({ loading: false })
      throw error
    }
  },

  bulkRemoveExpenses: async (ids: string[]) => {
    try {
      set({ loading: true })
      await bulkDeleteExpenses(ids)
      const currentExpenses = get().expenses
      const filteredExpenses = currentExpenses.filter(e => !ids.includes(e.id))
      set({ 
        expenses: filteredExpenses,
        loading: false 
      })
    } catch (error) {
      console.error('Error bulk deleting expenses:', error)
      set({ loading: false })
      throw error
    }
  },

  // Asset Actions
  fetchAssets: async () => {
    try {
      set({ loading: true })
      const assets = await getAssets()
      set({ assets, loading: false })
    } catch (error) {
      console.error('Error fetching assets:', error)
      set({ loading: false })
      throw error
    }
  },

  addAsset: async (assetData) => {
    try {
      set({ loading: true })
      const newAsset = await createAsset(assetData)
      const currentAssets = get().assets
      set({ 
        assets: [newAsset, ...currentAssets],
        loading: false 
      })
    } catch (error) {
      console.error('Error creating asset:', error)
      set({ loading: false })
      throw error
    }
  },

  editAsset: async (id: string, updates) => {
    try {
      set({ loading: true })
      const updatedAsset = await updateAsset(id, updates)
      const currentAssets = get().assets
      const updatedAssets = currentAssets.map(a => 
        a.id === id ? updatedAsset : a
      )
      set({ 
        assets: updatedAssets,
        loading: false 
      })
    } catch (error) {
      console.error('Error updating asset:', error)
      set({ loading: false })
      throw error
    }
  },

  removeAsset: async (id: string) => {
    try {
      set({ loading: true })
      await deleteAsset(id)
      const currentAssets = get().assets
      const filteredAssets = currentAssets.filter(a => a.id !== id)
      set({ 
        assets: filteredAssets,
        loading: false 
      })
    } catch (error) {
      console.error('Error deleting asset:', error)
      set({ loading: false })
      throw error
    }
  },

  bulkRemoveAssets: async (ids: string[]) => {
    try {
      set({ loading: true })
      await bulkDeleteAssets(ids)
      const currentAssets = get().assets
      const filteredAssets = currentAssets.filter(a => !ids.includes(a.id))
      set({ 
        assets: filteredAssets,
        loading: false 
      })
    } catch (error) {
      console.error('Error bulk deleting assets:', error)
      set({ loading: false })
      throw error
    }
  },

  // Debtor Actions
  fetchDebtors: async (startDate?: string, endDate?: string) => {
    try {
      set({ loading: true })
      const debtors = await getDebtors(startDate, endDate)
      set({ debtors, loading: false })
    } catch (error) {
      console.error('Error fetching debtors:', error)
      set({ loading: false })
      throw error
    }
  },

  fetchDebtor: async (id: string) => {
    try {
      const debtor = await getDebtor(id)
      return debtor
    } catch (error) {
      console.error('Error fetching debtor:', error)
      throw error
    }
  },

  addDebtor: async (debtorData, items = []) => {
    try {
      set({ loading: true })
      await createDebtor(debtorData, items)
      // Refresh debtors to get complete data
      await get().fetchDebtors()
    } catch (error) {
      console.error('Error creating debtor:', error)
      set({ loading: false })
      throw error
    }
  },

  editDebtor: async (id: string, updates) => {
    try {
      set({ loading: true })
      await updateDebtor(id, updates)
      // Refresh debtors to get updated data
      await get().fetchDebtors()
    } catch (error) {
      console.error('Error updating debtor:', error)
      set({ loading: false })
      throw error
    }
  },

  removeDebtor: async (id: string) => {
    try {
      set({ loading: true })
      await deleteDebtor(id)
      const currentDebtors = get().debtors
      const filteredDebtors = currentDebtors.filter(d => d.id !== id)
      set({ 
        debtors: filteredDebtors,
        loading: false 
      })
    } catch (error) {
      console.error('Error deleting debtor:', error)
      set({ loading: false })
      throw error
    }
  },

  bulkRemoveDebtors: async (ids: string[]) => {
    try {
      set({ loading: true })
      await bulkDeleteDebtors(ids)
      const currentDebtors = get().debtors
      const filteredDebtors = currentDebtors.filter(d => !ids.includes(d.id))
      set({ 
        debtors: filteredDebtors,
        loading: false 
      })
    } catch (error) {
      console.error('Error bulk deleting debtors:', error)
      set({ loading: false })
      throw error
    }
  },

  // Breakage Actions
  fetchBreakages: async (startDate?: string, endDate?: string) => {
    try {
      set({ loading: true })
      const breakages = await getBreakages(startDate, endDate)
      set({ breakages, loading: false })
    } catch (error) {
      console.error('Error fetching breakages:', error)
      set({ loading: false })
      throw error
    }
  },

  addBreakage: async (breakageData) => {
    try {
      set({ loading: true })
      await createBreakage(breakageData)
      // Refresh breakages to get complete data
      await get().fetchBreakages()
    } catch (error) {
      console.error('Error creating breakage:', error)
      set({ loading: false })
      throw error
    }
  },

  editBreakage: async (id: string, updates) => {
    try {
      set({ loading: true })
      await updateBreakage(id, updates)
      // Refresh breakages to get updated data
      await get().fetchBreakages()
    } catch (error) {
      console.error('Error updating breakage:', error)
      set({ loading: false })
      throw error
    }
  },

  removeBreakage: async (id: string) => {
    try {
      set({ loading: true })
      await deleteBreakage(id)
      const currentBreakages = get().breakages
      const filteredBreakages = currentBreakages.filter(b => b.id !== id)
      set({ 
        breakages: filteredBreakages,
        loading: false 
      })
    } catch (error) {
      console.error('Error deleting breakage:', error)
      set({ loading: false })
      throw error
    }
  },

  bulkRemoveBreakages: async (ids: string[]) => {
    try {
      set({ loading: true })
      await bulkDeleteBreakages(ids)
      const currentBreakages = get().breakages
      const filteredBreakages = currentBreakages.filter(b => !ids.includes(b.id))
      set({ 
        breakages: filteredBreakages,
        loading: false 
      })
    } catch (error) {
      console.error('Error bulk deleting breakages:', error)
      set({ loading: false })
      throw error
    }
  },

  // Stats Actions
  fetchDashboardStats: async (startDate?: string, endDate?: string) => {
    try {
      const stats = await getDashboardStatsOptimized(startDate, endDate)
      set({ dashboardStats: stats })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
  },

  fetchDebtorStats: async (startDate?: string, endDate?: string) => {
    try {
      const stats = await getDebtorStats(startDate, endDate)
      set({ debtorStats: stats })
    } catch (error) {
      console.error('Error fetching debtor stats:', error)
      throw error
    }
  },

  fetchBreakageStats: async (startDate?: string, endDate?: string) => {
    try {
      const stats = await getBreakageStats(startDate, endDate)
      set({ breakageStats: stats })
    } catch (error) {
      console.error('Error fetching breakage stats:', error)
      throw error
    }
  },

  fetchPurchaseStats: async (startDate?: string, endDate?: string) => {
    try {
      const stats = await getPurchaseStats(startDate, endDate)
      set({ purchaseStats: stats })
    } catch (error) {
      console.error('Error fetching purchase stats:', error)
      throw error
    }
  },

  fetchSalesReport: async (startDate: string, endDate: string) => {
    try {
      const report = await getSalesReport(startDate, endDate)
      return report
    } catch (error) {
      console.error('Error fetching sales report:', error)
      throw error
    }
  },

  fetchInventoryReport: async () => {
    try {
      const report = await getInventoryReport()
      return report
    } catch (error) {
      console.error('Error fetching inventory report:', error)
      throw error
    }
  },

  // Utility
  setLoading: (loading: boolean) => {
    set({ loading })
  },
}))