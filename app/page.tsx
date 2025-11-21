"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useSalesStore } from "@/stores/sales-store"
import { useDateFilter } from "@/contexts/date-filter-context"
import { LoginForm } from "@/components/login-form"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateFilter } from "@/components/date-filter"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, Eye, RefreshCw, PiggyBank, Plus, Minus, Banknote, Smartphone, Wallet } from "lucide-react"
import { DateRange } from "react-day-picker"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { getSales, getTodaysFloat, setTodaysFloat } from "@/lib/database"
import type { SaleWithItems } from "@/lib/database-types"
import { format } from "date-fns"
import { toast } from "sonner"

function DashboardContent() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { dashboardStats, fetchDashboardStats, loading } = useSalesStore()
  const { getFormattedDateRange, dateRange } = useDateFilter()
  const [recentSales, setRecentSales] = useState<SaleWithItems[]>([])
  const [salesLoading, setSalesLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set())
  const [cashFloat, setCashFloat] = useState(0)
  const [mpesaFloat, setMpesaFloat] = useState(0)
  const [floatDialogOpen, setFloatDialogOpen] = useState(false)
  const [selectedFloatCard, setSelectedFloatCard] = useState<any>(null)
  const [floatInputValue, setFloatInputValue] = useState("")

  const loadStats = useCallback(async () => {
    try {
      const { startDate, endDate } = getFormattedDateRange()
      await fetchDashboardStats(startDate, endDate)
    } catch (error) {
      console.error("Failed to load dashboard stats:", error)
    }
  }, [getFormattedDateRange, fetchDashboardStats])

  const loadRecentSales = useCallback(async () => {
    try {
      setSalesLoading(true)
      const { startDate, endDate } = getFormattedDateRange()
      const sales = await getSales(startDate, endDate)
      // Get the 10 most recent sales
      const sortedSales = sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRecentSales(sortedSales.slice(0, 10))
    } catch (error) {
      console.error("Failed to load recent sales:", error)
    } finally {
      setSalesLoading(false)
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
  }, [])

  useEffect(() => {
    loadStats()
    loadRecentSales()
  }, [loadStats, loadRecentSales])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadStats(), loadRecentSales()])
    } catch (error) {
      console.error("Failed to refresh dashboard:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const toggleTransaction = (transactionId: string) => {
    setExpandedTransactions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId)
      } else {
        newSet.add(transactionId)
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
    } else {
      router.push(card.route)
    }
  }

  const handleFloatSave = async () => {
    if (!user || profile?.role !== 'owner') {
      alert('Only owners can set float amounts')
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

  const stats = dashboardStats || {
    totalRevenue: 0,
    totalSales: 0,
    totalDebtors: 0,
    totalProfit: 0,
    cashSales: 0,
    mpesaSales: 0,
    topProduct: 'No sales',
    topProductQuantity: 0
  }

  const dashboardCards = [
    // First row: Total Sales, Total Revenue, Total Debtors, Total Profit
    {
      title: "Total Sales",
      value: loading ? <Skeleton className="h-8 w-16" /> : stats.totalSales.toString(),
      description: "Number of transactions",
      icon: ShoppingCart,
      iconColor: "text-blue-600",
      numberColor: "number-blue",
      route: "/sales",
    },
    {
      title: "Total Revenue",
      value: loading ? <Skeleton className="h-8 w-24" /> : `KSh ${Math.round(stats.totalRevenue).toLocaleString()}`,
      description: "Revenue from sales",
      icon: DollarSign,
      iconColor: "text-green-600",
      numberColor: "number-green",
      route: "/sales",
    },
    {
      title: "Total Debtors",
      value: loading ? <Skeleton className="h-8 w-24" /> : `KSh ${Math.round(stats.totalDebtors).toLocaleString()}`,
      description: "Outstanding debts",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
      numberColor: "number-amber",
      route: "/debtors",
    },
    {
      title: "Total Profit",
      value: loading ? <Skeleton className="h-8 w-24" /> : `KSh ${Math.round(stats.totalProfit).toLocaleString()}`,
      description: "Profit from sales",
      icon: PiggyBank,
      iconColor: "text-purple-600",
      numberColor: "number-purple",
      route: "/sales",
    },
    // Second row: Cash Float, M-Pesa Float, Cash Sales, M-Pesa Sales
    {
      title: "Cash Float",
      value: `KSh ${Math.round(cashFloat).toLocaleString()}`,
      description: "Starting cash amount",
      icon: Wallet,
      iconColor: "text-orange-600",
      numberColor: "number-orange",
      route: "/sales",
      isFloat: true,
    },
    {
      title: "M-Pesa Float",
      value: `KSh ${Math.round(mpesaFloat).toLocaleString()}`,
      description: "Starting M-Pesa amount",
      icon: Smartphone,
      iconColor: "text-green-500",
      numberColor: "number-green",
      route: "/sales",
      isFloat: true,
    },
    {
      title: "Cash Sales",
      value: loading ? <Skeleton className="h-8 w-24" /> : `KSh ${Math.round(stats.cashSales).toLocaleString()}`,
      description: "Revenue from cash payments",
      icon: Banknote,
      iconColor: "text-yellow-600",
      numberColor: "number-yellow",
      route: "/sales",
    },
    {
      title: "M-Pesa Sales",
      value: loading ? <Skeleton className="h-8 w-24" /> : `KSh ${Math.round(stats.mpesaSales).toLocaleString()}`,
      description: "Revenue from M-Pesa payments",
      icon: Smartphone,
      iconColor: "text-blue-500",
      numberColor: "number-blue",
      route: "/sales",
    },
  ]

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-balance">Welcome back!</h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your shop today.</p>
        </div>
        <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
          <DateFilter className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-2 sm:items-center" />
          <Button onClick={handleRefresh} disabled={refreshing || loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {dashboardCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className={`cursor-pointer hover:shadow-md transition-shadow ${loading && !card.isFloat ? 'opacity-75' : ''}`}
              onClick={() => handleFloatCardClick(card)}
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
        })}
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest transactions in your store</CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push('/sales')} className="w-full sm:w-auto" disabled={salesLoading}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden sm:block border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="uppercase min-w-[100px]">Sale #</TableHead>
                  <TableHead className="uppercase min-w-[120px]">Products</TableHead>
                  <TableHead className="uppercase min-w-[100px]">Amount</TableHead>
                  <TableHead className="uppercase min-w-[90px] hidden sm:table-cell">Payment</TableHead>
                  <TableHead className="uppercase min-w-[90px]">Status</TableHead>
                  <TableHead className="uppercase min-w-[120px] hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right uppercase min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-8" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : recentSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-center">
                        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No transactions yet</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Start by creating your first sale.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSales.map((sale) => (
                    <TableRow key={sale.id}>
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
                        <div className="font-medium number-primary">KSh {Math.round(sale.total_amount).toLocaleString()}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{getPaymentMethodBadge(sale.payment_method)}</TableCell>
                      <TableCell>{getStatusBadge(sale.status)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <div className="font-medium">{format(new Date(sale.created_at), "MMM dd, yyyy")}</div>
                          <div className="text-sm text-muted-foreground">{format(new Date(sale.created_at), "HH:mm")}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/sales')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {salesLoading ? (
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
            ) : recentSales.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No transactions yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Start by creating your first sale.</p>
              </div>
            ) : (
              recentSales.map((sale) => {
                const isExpanded = expandedTransactions.has(sale.id)
                return (
                  <Card key={sale.id} className="p-4">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleTransaction(sale.id)}>
                      <div>
                        <div className="font-medium text-sm">{sale.sale_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {sale.sale_items.length} item{sale.sale_items.length > 1 ? 's' : ''} • <span className="number-primary">KSh {Math.round(sale.total_amount).toLocaleString()}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>
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
                            {getStatusBadge(sale.status)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Date</div>
                          <div className="text-sm">{format(new Date(sale.created_at), "MMM dd, yyyy HH:mm")}</div>
                        </div>
                        
                        <Button variant="outline" size="sm" onClick={() => router.push('/sales')} className="w-full mt-2">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

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
  )
}

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  // Redirect employees to sales page
  useEffect(() => {
    if (!loading && profile?.role === 'employee') {
      router.push('/sales')
    }
  }, [loading, profile, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return <LoginForm />
  }

  // Don't render dashboard for employees (they'll be redirected)
  if (profile.role === 'employee') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to Sales...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout currentPage="dashboard">
      <DashboardContent />
    </DashboardLayout>
  )
}
