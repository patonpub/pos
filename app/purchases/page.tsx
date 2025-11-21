"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { DateFilter } from "@/components/date-filter"
import { useDateFilter } from "@/contexts/date-filter-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, Minus, Search, ShoppingBag, DollarSign, Package, Eye, TrendingUp, RefreshCw, Edit, Trash2 } from "lucide-react"
import { NewPurchaseForm } from "@/components/new-purchase-form"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { getPurchases, getSuppliers, updatePurchase, deletePurchase, bulkDeletePurchases, getPurchaseStats } from "@/lib/database"
import type { PurchaseWithItems, Supplier } from "@/lib/database-types"
import { Skeleton } from "@/components/ui/skeleton"
import { useConfirm } from "@/hooks/use-confirm"
import { toast } from "sonner"

const statusOptions = ["All", "pending", "completed", "cancelled"]

function PurchasesContent() {
  const { isOwner } = useAuth()
  const { getFormattedDateRange, dateRange } = useDateFilter()
  const searchParams = useSearchParams()
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState("All")
  const [selectedStatus, setSelectedStatus] = useState("All")
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithItems | null>(null)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseWithItems | null>(null)
  const [selectedPurchases, setSelectedPurchases] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalValue: 0,
    itemsPurchased: 0,
    totalCost: 0
  })
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const loadStats = useCallback(async () => {
    try {
      setIsStatsLoading(true)
      const { startDate, endDate } = getFormattedDateRange()
      const statsData = await getPurchaseStats(startDate, endDate)
      setStats(statsData)
    } catch (error) {
      console.error("Failed to load stats:", error)
    } finally {
      setIsStatsLoading(false)
    }
  }, [getFormattedDateRange])

  const loadPurchases = useCallback(async () => {
    try {
      setLoading(true)
      const { startDate, endDate } = getFormattedDateRange()
      const purchasesData = await getPurchases(startDate, endDate)
      setPurchases(purchasesData)
    } catch (error) {
      console.error('Error loading purchases:', error)
    } finally {
      setLoading(false)
    }
  }, [getFormattedDateRange])

  useEffect(() => {
    loadPurchases()
    loadStats()
  }, [loadPurchases, loadStats])

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const suppliersData = await getSuppliers()
        setSuppliers(suppliersData)
      } catch (error) {
        console.error('Error loading suppliers:', error)
      }
    }
    loadSuppliers()
  }, [])

  // Check for reorder parameter and open dialog if present
  useEffect(() => {
    const reorderProduct = searchParams.get('reorder')
    if (reorderProduct) {
      setIsNewPurchaseDialogOpen(true)
    }
  }, [searchParams])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadPurchases(), loadStats()])
    } catch (error) {
      console.error("Failed to refresh purchases:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleDeletePurchase = async (purchaseId: string) => {
    const confirmed = await confirm({
      title: "Delete Purchase",
      description: "Are you sure you want to delete this purchase? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      await deletePurchase(purchaseId)
      toast.success("Purchase deleted successfully!")
      loadPurchases()
      loadStats()
    } catch (error: any) {
      console.error("Failed to delete purchase:", error)
      toast.error(error?.message || "Failed to delete purchase")
    }
  }

  const handleBulkDeletePurchases = async () => {
    if (selectedPurchases.size === 0) return
    
    const selectedCount = selectedPurchases.size
    const confirmed = await confirm({
      title: "Delete Multiple Purchases",
      description: `Are you sure you want to delete ${selectedCount} selected purchases? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      const selectedIds = Array.from(selectedPurchases)
      await bulkDeletePurchases(selectedIds)
      toast.success(`Successfully deleted ${selectedCount} purchases`)
      setSelectedPurchases(new Set())
      loadPurchases()
      loadStats()
    } catch (error: any) {
      console.error("Failed to delete purchases:", error)
      toast.error("Failed to delete selected purchases")
    }
  }

  // Filter purchases based on search, supplier, and status (date filtering is done server-side)
  const filteredPurchases = purchases.filter((purchase) => {
    const supplierName = purchase.suppliers?.name || ''
    const matchesSearch =
      purchase.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSupplier = selectedSupplier === "All" || supplierName === selectedSupplier
    const matchesStatus = selectedStatus === "All" || purchase.status === selectedStatus
    
    return matchesSearch && matchesSupplier && matchesStatus
  })


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="min-w-[100px] justify-center">Completed</Badge>
      case "pending":
        return <Badge variant="outline" className="min-w-[100px] justify-center">Pending</Badge>
      case "cancelled":
        return <Badge variant="destructive" className="min-w-[100px] justify-center">Cancelled</Badge>
      default:
        return <Badge variant="outline" className="min-w-[100px] justify-center">{status}</Badge>
    }
  }

  const updatePurchaseStatus = async (purchaseId: string, newStatus: string) => {
    try {
      await updatePurchase(purchaseId, { status: newStatus as 'pending' | 'completed' | 'cancelled' })
      // Reload data to reflect changes
      loadPurchases()
      loadStats() // Reload stats after status change
    } catch (error) {
      console.error('Error updating purchase status:', error)
    }
  }

  return (
    <DashboardLayout currentPage="purchases">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-balance">Purchase Management</h1>
              <p className="text-muted-foreground">Manage inventory purchases and supplier orders</p>
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
              {isOwner && (
                <Dialog open={isNewPurchaseDialogOpen} onOpenChange={setIsNewPurchaseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      New Purchase Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Purchase Order</DialogTitle>
                      <DialogDescription>Create a new purchase order to restock inventory from suppliers.</DialogDescription>
                    </DialogHeader>
                    <NewPurchaseForm
                      onClose={() => {
                        setIsNewPurchaseDialogOpen(false)
                        loadPurchases() // Reload data after creating purchase
                        loadStats() // Reload stats after creating purchase
                      }}
                      reorderProduct={searchParams.get('reorder') || undefined}
                    />
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-blue">
                {isStatsLoading ? "Loading..." : stats.totalPurchases.toString()}
              </div>
              <p className="text-xs text-muted-foreground">Number of purchase orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-green">
                {isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.totalValue).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Total purchase value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Purchased</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-purple">
                {isStatsLoading ? "Loading..." : stats.itemsPurchased.toString()}
              </div>
              <p className="text-xs text-muted-foreground">Total items bought</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-orange">
                {isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.totalCost).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Total cost incurred</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>View and manage all purchase orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by purchase number or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.name}>
                      {supplier.name}
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

            {selectedPurchases.size > 0 && (
              <div className="flex gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
                {isOwner && (
                  <Button variant="outline" size="sm">
                    Mark as Received ({selectedPurchases.size})
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
                {isOwner && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDeletePurchases}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedPurchases.size})
                  </Button>
                )}
              </div>
            )}

            {/* Purchase Orders Table - Desktop */}
            <div className="border hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedPurchases.size === filteredPurchases.length && filteredPurchases.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPurchases(new Set(filteredPurchases.map(p => p.id)))
                          } else {
                            setSelectedPurchases(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="uppercase">Purchase #</TableHead>
                    <TableHead className="uppercase">Supplier</TableHead>
                    <TableHead className="uppercase">Amount</TableHead>
                    <TableHead className="uppercase">Status</TableHead>
                    <TableHead className="uppercase">Purchase Date</TableHead>
                    <TableHead className="text-right uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="space-y-3">
                          Loading purchases...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedPurchases.has(purchase.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedPurchases)
                              if (checked) {
                                newSelected.add(purchase.id)
                              } else {
                                newSelected.delete(purchase.id)
                              }
                              setSelectedPurchases(newSelected)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{purchase.purchase_number}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{purchase.suppliers?.name || 'Unknown'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">KSh {Math.round(purchase.total_amount).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{purchase.purchase_items?.length || 0} items</div>
                        </TableCell>
                      <TableCell>
                        <Select
                          value={purchase.status}
                          onValueChange={(value) => updatePurchaseStatus(purchase.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{format(new Date(purchase.created_at), "MMM dd, yyyy")}</div>
                          <div className="text-sm text-muted-foreground">
                            Created {format(new Date(purchase.created_at), "MMM dd")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPurchase(purchase)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => setEditingPurchase(purchase)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePurchase(purchase.id)}>
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

            {/* Purchase Orders Cards - Mobile */}
            <div className="sm:hidden space-y-4">
              {filteredPurchases.map((purchase) => (
                <div key={purchase.id} className="border rounded-lg bg-white">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedPurchases.has(purchase.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedPurchases)
                            if (checked) {
                              newSelected.add(purchase.id)
                            } else {
                              newSelected.delete(purchase.id)
                            }
                            setSelectedPurchases(newSelected)
                          }}
                        />
                        <button
                          onClick={() => toggleItem(purchase.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedItems.has(purchase.id) ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleItem(purchase.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-base">{purchase.purchase_number}</div>
                          <div className="text-sm text-muted-foreground">{purchase.suppliers?.name || 'Unknown'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-base">KSh {Math.round(purchase.total_amount).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{purchase.purchase_items?.length || 0} items</div>
                        </div>
                      </div>
                    </div>

                    {expandedItems.has(purchase.id) && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-1">Purchase Details</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Status: 
                                <Select
                                  value={purchase.status}
                                  onValueChange={(value) => updatePurchaseStatus(purchase.id, value)}
                                >
                                  <SelectTrigger className="w-28 h-6 ml-2 inline-flex">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>Items: {purchase.purchase_items?.length || 0}</div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">Dates</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Purchase: {format(new Date(purchase.created_at), "MMM dd, yyyy")}</div>
                              <div>Created: {format(new Date(purchase.created_at), "MMM dd")}</div>
                            </div>
                          </div>
                        </div>
                        
                        {purchase.purchase_items && purchase.purchase_items.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Items</h4>
                            <div className="space-y-2">
                              {purchase.purchase_items.slice(0, 3).map((item, index) => (
                                <div key={item.id || index} className="flex justify-between text-sm">
                                  <span>{item.products?.name || 'Unknown Product'}</span>
                                  <span>{item.quantity} × KSh {Math.round(item.unit_price).toLocaleString()}</span>
                                </div>
                              ))}
                              {purchase.purchase_items.length > 3 && (
                                <div className="text-sm text-muted-foreground">...and {purchase.purchase_items.length - 3} more items</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPurchase(purchase)}>
                            <Eye className="h-4 w-4 mr-1" />View
                          </Button>
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => setEditingPurchase(purchase)}>
                              <Edit className="h-4 w-4 mr-1" />Edit
                            </Button>
                          )}
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePurchase(purchase.id)}>
                              <Trash2 className="h-4 w-4 mr-1" />Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredPurchases.length === 0 && (
              <div className="text-center py-8">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No purchase orders found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Details Dialog */}
        <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Purchase Order - {selectedPurchase?.purchase_number}</DialogTitle>
              <DialogDescription>
                Order placed on {selectedPurchase && format(new Date(selectedPurchase.created_at), "MMM dd, yyyy 'at' HH:mm")}
              </DialogDescription>
            </DialogHeader>
            {selectedPurchase && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Supplier Information</h4>
                    <p className="text-sm text-muted-foreground">{selectedPurchase.suppliers?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      Purchase Date: {format(new Date(selectedPurchase.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Order Status</h4>
                    <div className="mt-1">{getStatusBadge(selectedPurchase.status)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Items Ordered</h4>
                  <div className="border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="uppercase">Product</TableHead>
                          <TableHead className="uppercase">Qty</TableHead>
                          <TableHead className="uppercase">Unit Cost</TableHead>
                          <TableHead className="text-right uppercase">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPurchase.purchase_items?.map((item, index) => (
                          <TableRow key={item.id || index}>
                            <TableCell>{item.products?.name || 'Unknown Product'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>KSh {Math.round(item.unit_price).toLocaleString()}</TableCell>
                            <TableCell className="text-right">KSh {Math.round(item.total_price).toLocaleString()}</TableCell>
                          </TableRow>
                        )) || []}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>KSh {Math.round(selectedPurchase.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                {selectedPurchase.status === "pending" && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => updatePurchaseStatus(selectedPurchase.id, "completed")}>
                      Mark as Completed
                    </Button>
                    <Button variant="outline" onClick={() => updatePurchaseStatus(selectedPurchase.id, "cancelled")}>
                      Cancel Order
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Purchase Dialog */}
        <Dialog open={!!editingPurchase} onOpenChange={() => setEditingPurchase(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order - {editingPurchase?.purchase_number}</DialogTitle>
              <DialogDescription>Update purchase order details and items.</DialogDescription>
            </DialogHeader>
            {editingPurchase && (
              <NewPurchaseForm 
                initialData={editingPurchase}
                onClose={() => {
                  setEditingPurchase(null)
                  loadPurchases()
                  loadStats()
                }} 
              />
            )}
          </DialogContent>
        </Dialog>
        <ConfirmDialog />
      </div>
    </DashboardLayout>
  )
}

export default function PurchasesPage() {
  return (
    <ProtectedRoute allowedRoles={['owner', 'employee']}>
      <PurchasesContent />
    </ProtectedRoute>
  )
}
