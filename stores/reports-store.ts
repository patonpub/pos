'use client'

import { create } from 'zustand'
import { 
  getSalesReport, 
  getProducts,
  getExpenses,
  type Product, 
  type SaleWithItems,
  type Expense
} from '@/lib/database'
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"

interface ReportData {
  salesData: { date: string; sales: number; profit: number }[]
  categoryData: { name: string; value: number; color: string }[]
  topProducts: { name: string; sales: number; revenue: number; profit: number }[]
  inventoryAlerts: { product: string; currentStock: number; minLevel: number; status: string }[]
  totalRevenue: number
  totalSales: number
  grossProfit: number
  avgOrderValue: number
  monthlyData: { month: string; revenue: number; profit: number }[]
}

interface CachedData {
  products: Product[]
  expenses: Expense[]
  salesReports: { [key: string]: SaleWithItems[] }
  lastFetch: { [key: string]: number }
}

interface ReportsState {
  reportData: ReportData | null
  loading: boolean
  error: string | null
  cachedData: CachedData
  colors: string[]
}

interface ReportsActions {
  fetchReportData: (startDate: string, endDate: string) => Promise<void>
  clearCache: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

type ReportsStore = ReportsState & ReportsActions

const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6B9D", "#A2DE96"]
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useReportsStore = create<ReportsStore>((set, get) => ({
  // State
  reportData: null,
  loading: false,
  error: null,
  cachedData: {
    products: [],
    expenses: [],
    salesReports: {},
    lastFetch: {}
  },
  colors,

  // Actions
  fetchReportData: async (startDate: string, endDate: string) => {
    try {
      set({ loading: true, error: null })
      
      const state = get()
      const now = Date.now()
      const cacheKey = `${startDate}-${endDate}`
      
      // Check if we have cached data that's still fresh
      const lastFetch = state.cachedData.lastFetch[cacheKey]
      const isCacheValid = lastFetch && (now - lastFetch) < CACHE_DURATION
      
      let salesReport: SaleWithItems[]
      let allProducts: Product[]
      let expenses: Expense[]
      let exactSalesCount: number

      // Use cached data if available and fresh
      if (isCacheValid && state.cachedData.salesReports[cacheKey]) {
        salesReport = state.cachedData.salesReports[cacheKey]
        allProducts = state.cachedData.products
        expenses = state.cachedData.expenses
        // Get exact count even with cached data
        const { count } = await (await import('@/lib/supabase')).supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('status', 'completed')
        exactSalesCount = count || 0
      } else {
        // Fetch fresh data in parallel - including sales count
        const [salesData, productsData, expensesData, salesCountData] = await Promise.all([
          getSalesReport(startDate, endDate),
          getProducts(),
          getExpenses(),
          // Get exact count of sales for accurate totalSales metric
          (async () => {
            const { count } = await (await import('@/lib/supabase')).supabase
              .from('sales')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', startDate)
              .lte('created_at', endDate)
              .eq('status', 'completed')
            return count || 0
          })()
        ])

        salesReport = salesData
        allProducts = productsData
        expenses = expensesData
        exactSalesCount = salesCountData
        
        // Update cache
        set(state => ({
          cachedData: {
            ...state.cachedData,
            products: allProducts,
            expenses,
            salesReports: {
              ...state.cachedData.salesReports,
              [cacheKey]: salesReport
            },
            lastFetch: {
              ...state.cachedData.lastFetch,
              [cacheKey]: now
            }
          }
        }))
      }
      
      // Calculate daily sales data
      const salesByDate: { [key: string]: { sales: number; profit: number } } = {}
      let totalRevenue = 0
      let totalCost = 0
      
      salesReport.forEach(sale => {
        const date = format(new Date(sale.created_at), 'MMM d')
        const saleProfit = sale.sale_items.reduce((sum, item) => {
          const product = allProducts.find(p => p.id === item.product_id)
          if (product) {
            return sum + ((item.unit_price - product.cost_price) * item.quantity)
          }
          return sum
        }, 0)
        
        if (!salesByDate[date]) {
          salesByDate[date] = { sales: 0, profit: 0 }
        }
        salesByDate[date].sales += sale.total_amount
        salesByDate[date].profit += saleProfit
        
        totalRevenue += sale.total_amount
        totalCost += sale.sale_items.reduce((sum, item) => {
          const product = allProducts.find(p => p.id === item.product_id)
          return sum + (product ? product.cost_price * item.quantity : 0)
        }, 0)
      })
      
      const salesData = Object.entries(salesByDate).map(([date, data]) => ({
        date,
        sales: data.sales,
        profit: data.profit
      }))
      
      // Calculate category data
      const categoryRevenue: { [key: string]: number } = {}
      salesReport.forEach(sale => {
        sale.sale_items.forEach(item => {
          const product = allProducts.find(p => p.id === item.product_id)
          if (product) {
            categoryRevenue[product.category] = (categoryRevenue[product.category] || 0) + item.total_price
          }
        })
      })
      
      const totalCategoryRevenue = Object.values(categoryRevenue).reduce((sum, val) => sum + val, 0)
      const categoryData = Object.entries(categoryRevenue).map(([name, value], index) => ({
        name,
        value: totalCategoryRevenue > 0 ? Math.round((value / totalCategoryRevenue) * 100) : 0,
        color: colors[index % colors.length]
      }))
      
      // Calculate top products
      const productStats: { [key: string]: { name: string; sales: number; revenue: number; profit: number } } = {}
      salesReport.forEach(sale => {
        sale.sale_items.forEach(item => {
          const product = allProducts.find(p => p.id === item.product_id)
          if (product) {
            if (!productStats[item.product_id]) {
              productStats[item.product_id] = {
                name: product.name,
                sales: 0,
                revenue: 0,
                profit: 0
              }
            }
            productStats[item.product_id].sales += item.quantity
            productStats[item.product_id].revenue += item.total_price
            productStats[item.product_id].profit += (item.unit_price - product.cost_price) * item.quantity
          }
        })
      })
      
      const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
      
      // Calculate inventory alerts
      const inventoryAlerts = allProducts
        .filter(product => product.stock_quantity <= product.min_stock_level)
        .map(product => ({
          product: product.name,
          currentStock: product.stock_quantity,
          minLevel: product.min_stock_level,
          status: product.stock_quantity === 0 ? 'critical' : product.stock_quantity < product.min_stock_level ? 'critical' : 'low'
        }))
        .slice(0, 10)
      
      // Calculate monthly data (last 4 months) - use cached data when possible
      const monthlyData = []
      for (let i = 3; i >= 0; i--) {
        const monthStart = startOfMonth(subDays(new Date(), i * 30))
        const monthEnd = endOfMonth(subDays(new Date(), i * 30))
        const monthKey = `${monthStart.toISOString()}-${monthEnd.toISOString()}`
        
        let monthSales: SaleWithItems[]
        
        // Check if we have this month's data cached
        if (state.cachedData.salesReports[monthKey] && 
            state.cachedData.lastFetch[monthKey] && 
            (now - state.cachedData.lastFetch[monthKey]) < CACHE_DURATION) {
          monthSales = state.cachedData.salesReports[monthKey]
        } else {
          monthSales = await getSalesReport(
            monthStart.toISOString(),
            monthEnd.toISOString()
          )
          
          // Cache month data
          set(state => ({
            cachedData: {
              ...state.cachedData,
              salesReports: {
                ...state.cachedData.salesReports,
                [monthKey]: monthSales
              },
              lastFetch: {
                ...state.cachedData.lastFetch,
                [monthKey]: now
              }
            }
          }))
        }
        
        const monthRevenue = monthSales.reduce((sum, sale) => sum + sale.total_amount, 0)
        const monthProfit = monthSales.reduce((sum, sale) => {
          return sum + sale.sale_items.reduce((itemSum, item) => {
            const product = allProducts.find(p => p.id === item.product_id)
            if (product) {
              return itemSum + ((item.unit_price - product.cost_price) * item.quantity)
            }
            return itemSum
          }, 0)
        }, 0)
        
        monthlyData.push({
          month: format(monthStart, 'MMM'),
          revenue: monthRevenue,
          profit: monthProfit
        })
      }
      
      const grossProfit = totalRevenue - totalCost
      const avgOrderValue = exactSalesCount > 0 ? totalRevenue / exactSalesCount : 0

      const reportData: ReportData = {
        salesData,
        categoryData,
        topProducts,
        inventoryAlerts,
        totalRevenue,
        totalSales: exactSalesCount,
        grossProfit,
        avgOrderValue,
        monthlyData
      }
      
      set({ reportData, loading: false })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load report data'
      set({ error: errorMessage, loading: false })
      throw err
    }
  },

  clearCache: () => {
    set({
      cachedData: {
        products: [],
        expenses: [],
        salesReports: {},
        lastFetch: {}
      }
    })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },
}))