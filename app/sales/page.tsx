"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { DateFilter } from "@/components/date-filter"
import { useDateFilter } from "@/contexts/date-filter-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, ShoppingCart, DollarSign, Receipt, Eye, AlertTriangle, TrendingUp, Upload, RefreshCw, Edit, Trash2, Minus, Banknote, Smartphone, Wallet, Printer } from "lucide-react"
import { NewSaleForm } from "@/components/new-sale-form"
import { SalesImport } from "@/components/sales-import"
import { ReceiptTemplate } from "@/components/receipt-template"
import { POSInterface } from "@/components/pos-interface"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { getSales, getDashboardStats, updateSale, deleteSale, bulkDeleteSales, updateSaleItems, getProducts, getTodaysFloat, setTodaysFloat, getBusinessSettings } from "@/lib/database"
import type { SaleWithItems, Product, SaleItem, BusinessSettings } from "@/lib/database-types"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useConfirm } from "@/hooks/use-confirm"
import { useReactToPrint } from "react-to-print"

const paymentMethods = ["All", "cash", "mpesa"]
const statusOptions = ["All", "completed", "pending", "cancelled"]

function SalesContent() {
  const { user, profile, isOwner } = useAuth()
  const { getFormattedDateRange, dateRange } = useDateFilter()
  const [sales, setSales] = useState<SaleWithItems[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("All")
  const [selectedStatus, setSelectedStatus] = useState("All")
  const [isNewSaleDialogOpen, setIsNewSaleDialogOpen] = useState(false)
  const [isSalesImportDialogOpen, setIsSalesImportDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null)
  const [editingSale, setEditingSale] = useState<SaleWithItems | null>(null)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [editItems, setEditItems] = useState<(SaleItem & { products: { name: string } })[]>([])
  const [newItem, setNewItem] = useState({ product_id: '', quantity: 1 })
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const { confirm, ConfirmDialog } = useConfirm()
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    totalDebtors: 0,
    totalProfit: 0,
    cashSales: 0,
    mpesaSales: 0,
    topProduct: 'No sales',
    topProductQuantity: 0
  })
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [cashFloat, setCashFloat] = useState(0)
  const [mpesaFloat, setMpesaFloat] = useState(0)
  const [floatDialogOpen, setFloatDialogOpen] = useState(false)
  const [selectedFloatCard, setSelectedFloatCard] = useState<any>(null)
  const [floatInputValue, setFloatInputValue] = useState("")
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  const loadStats = useCallback(async () => {
    try {
      setIsStatsLoading(true)
      const { startDate, endDate } = getFormattedDateRange()
      const statsData = await getDashboardStats(startDate, endDate)
      setStats(statsData)
    } catch (error) {
      console.error("Failed to load stats:", error)
      toast.error("Failed to load sales stats")
    } finally {
      setIsStatsLoading(false)
    }
  }, [getFormattedDateRange])

  const loadBusinessSettings = async () => {
    try {
      const settings = await getBusinessSettings()
      setBusinessSettings(settings)
    } catch (error) {
      console.error("Failed to load business settings:", error)
    }
  }

  const loadSales = useCallback(async () => {
    try {
      setIsLoading(true)
      const { startDate, endDate } = getFormattedDateRange()
      const salesData = await getSales(startDate, endDate)
      setSales(salesData)
    } catch (error) {
      console.error("Failed to load sales:", error)
      toast.error("Failed to load sales data")
    } finally {
      setIsLoading(false)
    }
  }, [getFormattedDateRange])

  // Load today's float amounts from database
  const loadTodaysFloat = useCallback(async () => {
    try {
      const todaysFloat = await getTodaysFloat()
      setCashFloat(todaysFloat.cash_float)
      setMpesaFloat(todaysFloat.mpesa_float)
    } catch (error) {
      console.error("Failed to load today's float:", error)
      // Keep default values (0,0) on error
    }
  }, [])

  useEffect(() => {
    loadTodaysFloat()
    loadBusinessSettings()
  }, [])

  useEffect(() => {
    loadSales()
    loadStats()
  }, [loadSales, loadStats])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await getProducts()
        setAvailableProducts(products)
      } catch (error) {
        console.error("Failed to load products:", error)
      }
    }
    loadProducts()
  }, [])


  const handleEditSale = (sale: SaleWithItems) => {
    setEditingSale(sale)
    setEditItems([...sale.sale_items])
    setNewItem({ product_id: '', quantity: 1 })
    setProductSearchTerm("")
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadSales(), loadStats()])
    } catch (error) {
      console.error("Failed to refresh sales:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: selectedSale ? `Receipt-${selectedSale.sale_number}` : 'Receipt',
  })

  const toggleSale = (saleId: string) => {
    setExpandedSales(prev => {
      const newSet = new Set(prev)
      if (newSet.has(saleId)) {
        newSet.delete(saleId)
      } else {
        newSet.add(saleId)
      }
      return newSet
    })
  }

  const handleFloatCardClick = (card: any) => {
    if (card.isFloat) {
      if (profile?.role !== 'owner') {
        toast.error('Only owners can set float amounts')
        return
      }
      setSelectedFloatCard(card)
      setFloatInputValue(card.title === "Cash Float" ? cashFloat.toString() : mpesaFloat.toString())
      setFloatDialogOpen(true)
    }
  }

  const handleFloatSave = async () => {
    if (!user || profile?.role !== 'owner') {
      toast.error('Only owners can set float amounts')
      return
    }

    try {
      const value = parseFloat(floatInputValue) || 0
      const cashValue = selectedFloatCard?.title === "Cash Float" ? value : cashFloat
      const mpesaValue = selectedFloatCard?.title === "M-Pesa Float" ? value : mpesaFloat

      await setTodaysFloat(cashValue, mpesaValue, user.id)

      // Update local state
      if (selectedFloatCard?.title === "Cash Float") {
        setCashFloat(value)
      } else if (selectedFloatCard?.title === "M-Pesa Float") {
        setMpesaFloat(value)
      }

      toast.success("Float amount updated successfully")
    } catch (error) {
      console.error("Failed to save float:", error)
      toast.error("Failed to update float amount")
    } finally {
      setFloatDialogOpen(false)
      setSelectedFloatCard(null)
      setFloatInputValue("")
    }
  }

  // Filter sales based on search, payment method, and status (date filtering is done server-side)
  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.sale_items.some(item => 
        item.products.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    const matchesPaymentMethod = selectedPaymentMethod === "All" || sale.payment_method === selectedPaymentMethod
    const matchesStatus = selectedStatus === "All" || sale.status === selectedStatus
    
    return matchesSearch && matchesPaymentMethod && matchesStatus
  })


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="min-w-[100px] justify-center">Completed</Badge>
      case "pending":
        return <Badge variant="secondary" className="min-w-[100px] justify-center">Pending</Badge>
      case "cancelled":
        return <Badge variant="destructive" className="min-w-[100px] justify-center">Cancelled</Badge>
      default:
        return <Badge variant="outline" className="min-w-[100px] justify-center">{status}</Badge>
    }
  }

  const updateSaleStatus = async (saleId: string, newStatus: string) => {
    try {
      await updateSale(saleId, { status: newStatus })
      toast.success("Sale status updated successfully!")
      loadSales()
    } catch (error) {
      console.error("Failed to update sale status:", error)
      toast.error("Failed to update sale status")
    }
  }

  const handleDeleteSale = async (saleId: string) => {
    const confirmed = await confirm({
      title: "Delete Sale",
      description: "Are you sure you want to delete this sale? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      await deleteSale(saleId)
      toast.success("Sale deleted successfully!")
      await Promise.all([loadSales(), loadStats()])
    } catch (error) {
      console.error("Failed to delete sale:", error)
      toast.error("Failed to delete sale")
    }
  }

  const handleBulkDeleteSales = async () => {
    if (selectedSales.size === 0) return
    
    const selectedCount = selectedSales.size
    const confirmed = await confirm({
      title: "Delete Multiple Sales",
      description: `Are you sure you want to delete ${selectedCount} selected sales? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      const selectedIds = Array.from(selectedSales)
      await bulkDeleteSales(selectedIds)
      setSelectedSales(new Set())
      toast.success(`${selectedCount} sales deleted successfully!`)
      await Promise.all([loadSales(), loadStats()])
    } catch (error) {
      console.error("Failed to delete sales:", error)
      toast.error("Failed to delete sales. Please try again.")
    }
  }

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case "cash":
        return <Badge variant="outline" className="min-w-[80px] justify-center text-black border-[#fed8b1]" style={{backgroundColor: '#fed8b1'}}>Cash</Badge>
      case "mpesa":
        return <Badge variant="default" className="min-w-[80px] justify-center">M-Pesa</Badge>
      default:
        return <Badge variant="outline" className="min-w-[80px] justify-center">{method}</Badge>
    }
  }

  return (
    <DashboardLayout currentPage="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-balance">Sales Management</h1>
              <p className="text-muted-foreground">Process sales and view transaction history</p>
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
              <Dialog open={isNewSaleDialogOpen} onOpenChange={setIsNewSaleDialogOpen}>
                <DialogTrigger asChild>
                  <Button className={`w-full ${isOwner ? 'sm:w-auto' : 'sm:w-full xl:text-lg xl:h-14'}`}>
                    <Plus className={`mr-2 ${isOwner ? 'h-4 w-4' : 'h-5 w-5 xl:h-6 xl:w-6'}`} />
                    New Sale
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Process New Sale</DialogTitle>
                    <DialogDescription>Add products to cart and complete the sale transaction.</DialogDescription>
                  </DialogHeader>
                  <NewSaleForm onClose={() => setIsNewSaleDialogOpen(false)} onSuccess={() => { loadSales(); loadStats(); }} />
                </DialogContent>
              </Dialog>
              {isOwner && (
                <Dialog open={isSalesImportDialogOpen} onOpenChange={setIsSalesImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" />
                      Import Sales
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Import Sales from CSV/Excel</DialogTitle>
                      <DialogDescription>Upload a file to bulk import sales data into your system.</DialogDescription>
                    </DialogHeader>
                    <SalesImport onClose={() => setIsSalesImportDialogOpen(false)} onSuccess={() => { loadSales(); loadStats(); }} />
                  </DialogContent>
                </Dialog>
              )}
              <DateFilter className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-2 sm:items-center" />
              <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="w-full sm:w-auto">
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Owner Only */}
        {isOwner && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(() => {
            const salesCards = [
              // First row: Total Sales, Total Revenue, Total Debtors, Total Profit
              {
                title: "Total Sales",
                value: isStatsLoading ? "Loading..." : stats.totalSales.toString(),
                description: "Number of transactions",
                icon: ShoppingCart,
                iconColor: "text-blue-600",
                numberColor: "number-blue",
              },
              {
                title: "Total Revenue",
                value: isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.totalRevenue).toLocaleString()}`,
                description: "Revenue from sales",
                icon: DollarSign,
                iconColor: "text-green-600",
                numberColor: "number-green",
              },
              {
                title: "Total Debtors",
                value: isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.totalDebtors).toLocaleString()}`,
                description: "Outstanding debts",
                icon: AlertTriangle,
                iconColor: "text-amber-600",
                numberColor: "number-amber",
              },
              {
                title: "Total Profit",
                value: isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.totalProfit).toLocaleString()}`,
                description: "Profit from sales",
                icon: TrendingUp,
                iconColor: "text-purple-600",
                numberColor: "number-purple",
              },
              // Second row: Cash Float, M-Pesa Float, Cash Sales, M-Pesa Sales
              {
                title: "Cash Float",
                value: `KSh ${Math.round(cashFloat).toLocaleString()}`,
                description: "Starting cash amount",
                icon: Wallet,
                iconColor: "text-orange-600",
                numberColor: "number-orange",
                isFloat: true,
              },
              {
                title: "M-Pesa Float",
                value: `KSh ${Math.round(mpesaFloat).toLocaleString()}`,
                description: "Starting M-Pesa amount",
                icon: Smartphone,
                iconColor: "text-green-500",
                numberColor: "number-green",
                isFloat: true,
              },
              {
                title: "Cash Sales",
                value: isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.cashSales).toLocaleString()}`,
                description: "Revenue from cash payments",
                icon: Banknote,
                iconColor: "text-yellow-600",
                numberColor: "number-yellow",
              },
              {
                title: "M-Pesa Sales",
                value: isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.mpesaSales).toLocaleString()}`,
                description: "Revenue from M-Pesa payments",
                icon: Smartphone,
                iconColor: "text-blue-500",
                numberColor: "number-blue",
              },
            ]

            return salesCards.map((card) => {
              const Icon = card.icon
              return (
                <Card
                  key={card.title}
                  className={`${card.isFloat ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${isStatsLoading && !card.isFloat ? 'opacity-75' : ''}`}
                  onClick={() => card.isFloat && handleFloatCardClick(card)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${card.numberColor || 'number-highlight'}`}>
                      {card.value}
                    </div>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              )
            })
          })()}
          </div>
        )}

        {/* Sales History */}
        <Card>
          <CardHeader>
            <CardTitle>Sales History</CardTitle>
            <CardDescription>View and manage all sales transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by sale number or product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method === "All" ? "All Methods" : method.charAt(0).toUpperCase() + method.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "All" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isOwner && selectedSales.size > 0 && (
              <div className="flex gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
                <Button variant="outline" size="sm">
                  Print Receipts ({selectedSales.size})
                </Button>
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteSales}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedSales.size})
                </Button>
              </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden sm:block border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {isOwner && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSales.size === filteredSales.length && filteredSales.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSales(new Set(filteredSales.map(s => s.id)))
                            } else {
                              setSelectedSales(new Set())
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead className="uppercase">Sale #</TableHead>
                    <TableHead className="uppercase">Products</TableHead>
                    <TableHead className="uppercase">Amount</TableHead>
                    <TableHead className="uppercase">Payment</TableHead>
                    <TableHead className="uppercase">Status</TableHead>
                    <TableHead className="uppercase">Date</TableHead>
                    <TableHead className="text-right uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="space-y-3">
                          Loading sales...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        {isOwner && (
                          <TableCell>
                            <Checkbox
                              checked={selectedSales.has(sale.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedSales)
                                if (checked) {
                                  newSelected.add(sale.id)
                                } else {
                                  newSelected.delete(sale.id)
                                }
                                setSelectedSales(newSelected)
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium">{sale.sale_number}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {sale.sale_items.map((item, index) => (
                              <div key={index} className={index > 0 ? "text-sm text-muted-foreground" : "font-medium"}>
                                {item.products.name} x{item.quantity}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium number-primary">KSh {Math.round(sale.total_amount).toLocaleString()}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getPaymentMethodBadge(sale.payment_method)}</TableCell>
                        <TableCell>
                          <Select
                            value={sale.status}
                            onValueChange={(value) => updateSaleStatus(sale.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{format(new Date(sale.created_at), "MMM dd, yyyy")}</div>
                            <div className="text-sm text-muted-foreground">{format(new Date(sale.created_at), "HH:mm")}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSale(sale)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSale(sale)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSale(sale.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                    </Card>
                  ))}
                </>
              ) : (
                filteredSales.map((sale) => {
                  const isExpanded = expandedSales.has(sale.id)
                  return (
                    <Card key={sale.id} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <Checkbox
                              checked={selectedSales.has(sale.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedSales)
                                if (checked) {
                                  newSelected.add(sale.id)
                                } else {
                                  newSelected.delete(sale.id)
                                }
                                setSelectedSales(newSelected)
                              }}
                            />
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => toggleSale(sale.id)}>
                          {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      <div className="cursor-pointer" onClick={() => toggleSale(sale.id)}>
                        <div className="font-medium text-sm">{sale.sale_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {sale.sale_items.length} item{sale.sale_items.length > 1 ? 's' : ''} • <span className="number-primary">KSh {Math.round(sale.total_amount).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Products</div>
                            {sale.sale_items.map((item, index) => (
                              <div key={index} className="text-sm">
                                {item.products.name} x{item.quantity}
                              </div>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Payment</div>
                              {getPaymentMethodBadge(sale.payment_method)}
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Status</div>
                              <Select
                                value={sale.status}
                                onValueChange={(value) => updateSaleStatus(sale.id, value)}
                              >
                                <SelectTrigger className="w-full h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Date</div>
                            <div className="text-sm">{format(new Date(sale.created_at), "MMM dd, yyyy HH:mm")}</div>
                          </div>
                          
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" onClick={() => setSelectedSale(sale)} className="flex-1">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {isOwner && (
                              <Button variant="outline" size="sm" onClick={() => handleEditSale(sale)} className="flex-1">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            )}
                            {isOwner && (
                              <Button variant="outline" size="sm" onClick={() => handleDeleteSale(sale.id)} className="flex-1">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })
              )}
            </div>

            {filteredSales.length === 0 && (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No sales found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Sale Dialog */}
        <Dialog open={!!editingSale} onOpenChange={(open) => !open && (setEditingSale(null), setProductSearchTerm(""))}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Edit Sale - {editingSale?.sale_number}</DialogTitle>
              <DialogDescription>
                Update sale information and manage products
              </DialogDescription>
            </DialogHeader>
            {editingSale && (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* Basic Sale Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Customer Name</label>
                    <Input
                      value={editingSale.customer_name}
                      onChange={(e) => setEditingSale({
                        ...editingSale,
                        customer_name: e.target.value
                      })}
                      placeholder="Customer name"
                      className="h-9"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Customer Phone</label>
                    <Input
                      value={editingSale.customer_phone || ""}
                      onChange={(e) => setEditingSale({
                        ...editingSale,
                        customer_phone: e.target.value
                      })}
                      placeholder="Customer phone"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                    <Select 
                      value={editingSale.payment_method} 
                      onValueChange={(value) => setEditingSale({
                        ...editingSale,
                        payment_method: value
                      })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <Select 
                      value={editingSale.status} 
                      onValueChange={(value) => setEditingSale({
                        ...editingSale,
                        status: value
                      })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Products in Sale */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base font-medium">Products in Sale</h3>
                    <Badge variant="secondary" className="text-sm w-fit">
                      Total: <span className="number-primary">KSh {Math.round(editItems.reduce((sum, item) => sum + item.total_price, 0)).toLocaleString()}</span>
                    </Badge>
                  </div>

                  {/* Current Items - Mobile Optimized */}
                  <div className="space-y-2">
                    {editItems.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-background">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.products.name}</div>
                            <div className="text-sm text-muted-foreground">
                              <span className="number-primary">KSh {Math.round(item.unit_price).toLocaleString()}</span> × {item.quantity} = <span className="number-primary">KSh {Math.round(item.total_price).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 1
                                const newItems = [...editItems]
                                newItems[index] = {
                                  ...newItems[index],
                                  quantity: newQuantity,
                                  total_price: newQuantity * newItems[index].unit_price
                                }
                                setEditItems(newItems)
                              }}
                              className="w-16 h-8 text-center"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newItems = editItems.filter((_, i) => i !== index)
                                setEditItems(newItems)
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {editItems.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                        No products in this sale. Add products below.
                      </div>
                    )}
                  </div>

                  {/* Add New Product */}
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <h4 className="font-medium mb-2 text-sm">Add Product</h4>
                    <div className="space-y-2">
                      {/* Product Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={productSearchTerm}
                          onChange={(e) => {
                            setProductSearchTerm(e.target.value)
                            setNewItem({ ...newItem, product_id: '' })
                          }}
                          className="pl-10 h-9"
                        />
                      </div>

                      {/* Search Results */}
                      {productSearchTerm ? (
                        (() => {
                          const filteredProducts = availableProducts
                            .filter(product =>
                              product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) &&
                              product.stock_quantity > 0
                            )
                            .slice(0, 3)

                          return filteredProducts.length > 0 ? (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {filteredProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className={`flex items-center justify-between p-2 border rounded hover:bg-muted/50 cursor-pointer ${newItem.product_id === product.id ? 'bg-muted border-primary' : ''}`}
                                  onClick={() => {
                                    setNewItem({ ...newItem, product_id: product.id })
                                    setProductSearchTerm(product.name)
                                  }}
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      KSh {Math.round(product.unit_price).toLocaleString()} • Stock: {product.stock_quantity} {product.unit}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-2 text-sm text-muted-foreground">
                              No products found matching "{productSearchTerm}"
                            </div>
                          )
                        })()
                      ) : (
                        <div className="text-center py-2 text-sm text-muted-foreground">
                          Type to search for products...
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="1"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                            placeholder="Qty"
                            className="h-9"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (!newItem.product_id) {
                              toast.error("Please select a product")
                              return
                            }
                            
                            const selectedProduct = availableProducts.find(p => p.id === newItem.product_id)
                            if (!selectedProduct) return
                            
                            if (newItem.quantity > selectedProduct.stock_quantity) {
                              toast.error(`Not enough stock. Available: ${selectedProduct.stock_quantity}`)
                              return
                            }

                            const newSaleItem = {
                              id: `temp-${Date.now()}`,
                              sale_id: editingSale.id,
                              product_id: newItem.product_id,
                              quantity: newItem.quantity,
                              unit_price: selectedProduct.unit_price,
                              total_price: newItem.quantity * selectedProduct.unit_price,
                              created_at: new Date().toISOString(),
                              products: { name: selectedProduct.name }
                            }
                            
                            setEditItems([...editItems, newSaleItem])
                            setNewItem({ product_id: '', quantity: 1 })
                            setProductSearchTerm("")
                          }}
                          className="h-9 px-3"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
                {/* Action Buttons - Fixed at bottom */}
                <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-3 border-t mt-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditingSale(null)
                      setProductSearchTerm("")
                    }} 
                    className="flex-1 h-9"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={async () => {
                      try {
                        // Calculate new total
                        const newTotal = editItems.reduce((sum, item) => sum + item.total_price, 0)
                        
                        // Update sale info
                        await updateSale(editingSale.id, {
                          customer_name: editingSale.customer_name,
                          customer_phone: editingSale.customer_phone,
                          payment_method: editingSale.payment_method,
                          status: editingSale.status,
                          total_amount: newTotal
                        })

                        // Update sale items and inventory
                        const newItems = editItems.map(item => ({
                          product_id: item.product_id,
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          total_price: item.total_price
                        }))
                        
                        await updateSaleItems(editingSale.id, newItems, editingSale.sale_items)
                        
                        toast.success("Sale updated successfully!")
                        setEditingSale(null)
                        setProductSearchTerm("")
                        await Promise.all([loadSales(), loadStats()])
                      } catch (error) {
                        console.error("Failed to update sale:", error)
                        toast.error("Failed to update sale")
                      }
                    }} 
                    className="flex-1 h-9"
                  >
                    Update Sale
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Sale Details Dialog */}
        <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sale Details - {selectedSale?.sale_number}</DialogTitle>
              <DialogDescription>
                Transaction completed on {selectedSale && format(new Date(selectedSale.created_at), "MMM dd, yyyy 'at' HH:mm")}
              </DialogDescription>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Customer Information</h4>
                    <p className="text-sm text-muted-foreground">{selectedSale.customer_name}</p>
                    {selectedSale.customer_phone && (
                      <p className="text-sm text-muted-foreground">{selectedSale.customer_phone}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">Payment Details</h4>
                    <p className="text-sm text-muted-foreground">
                      Method: {selectedSale.payment_method.charAt(0).toUpperCase() + selectedSale.payment_method.slice(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">Status: {selectedSale.status}</p>
                  </div>
                </div>

                {isOwner && selectedSale.user_profiles && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium">Recorded By</h4>
                    <p className="text-sm text-muted-foreground">{selectedSale.user_profiles.email}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Items Purchased</h4>
                  <div className="border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="uppercase">Product</TableHead>
                          <TableHead className="uppercase">Qty</TableHead>
                          <TableHead className="uppercase">Price</TableHead>
                          <TableHead className="text-right uppercase">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSale.sale_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.products.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="number-primary">KSh {Math.round(item.unit_price).toLocaleString()}</TableCell>
                            <TableCell className="text-right number-primary">KSh {Math.round(item.total_price).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Subtotal:</span>
                    <span className="number-highlight">KSh {Math.round(selectedSale.total_amount).toLocaleString()}</span>
                  </div>
                  {selectedSale.tax_amount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Tax:</span>
                      <span>KSh {Math.round(selectedSale.tax_amount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="number-highlight">KSh {Math.round(selectedSale.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                {/* Print Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handlePrint} disabled={!businessSettings}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Receipt
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Hidden Receipt Template for Printing */}
        <div style={{ display: 'none' }}>
          {selectedSale && businessSettings && (
            <ReceiptTemplate
              ref={receiptRef}
              sale={selectedSale}
              businessSettings={businessSettings}
            />
          )}
        </div>

        <ConfirmDialog />

        {/* Float Dialog */}
        <Dialog open={floatDialogOpen} onOpenChange={setFloatDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set {selectedFloatCard?.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="floatAmount">Amount (KSh)</Label>
                <Input
                  id="floatAmount"
                  type="number"
                  value={floatInputValue}
                  onChange={(e) => setFloatInputValue(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFloatDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleFloatSave}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default function SalesPage() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['owner', 'employee']}>
      {profile?.role === 'employee' ? (
        <POSInterface />
      ) : (
        <SalesContent />
      )}
    </ProtectedRoute>
  )
}
