"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { DateFilter } from "@/components/date-filter"
import { useDateFilter } from "@/contexts/date-filter-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Minus, Search, AlertTriangle, TrendingDown, Calendar, Edit, Trash2, Package, Eye, CheckCircle, RefreshCw } from "lucide-react"
import { DateRange } from "react-day-picker"
import { getBreakages, createBreakage, updateBreakage, deleteBreakage, bulkDeleteBreakages, getProducts, getBreakageStats } from "@/lib/database"
import { useAuth } from "@/contexts/auth-context"
import type { Breakage, Product } from "@/lib/database-types"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useConfirm } from "@/hooks/use-confirm"

interface BreakageWithProduct extends Breakage {
  products?: { name: string }
}

interface BreakageCartItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  unit: string
  stock_quantity: number
}

interface NewBreakageForm {
  reason: string
  category: string
  location: string
  reported_by: string
}

const categories = ["All", "Delivery Damage", "Expiration", "Handling Damage", "Product Defect", "Packaging Damage", "Theft", "Other"]
const statusOptions = ["All", "approved", "pending", "investigating", "rejected"]

function BreakagesContent() {
  const { user, profile, isOwner } = useAuth()
  const { getFormattedDateRange, dateRange } = useDateFilter()
  const [breakages, setBreakages] = useState<BreakageWithProduct[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedStatus, setSelectedStatus] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedBreakage, setSelectedBreakage] = useState<BreakageWithProduct | null>(null)
  const [editingBreakage, setEditingBreakage] = useState<BreakageWithProduct | null>(null)
  const [selectedBreakages, setSelectedBreakages] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [breakageCart, setBreakageCart] = useState<BreakageCartItem[]>([])
  const [formData, setFormData] = useState<NewBreakageForm>({
    reason: '',
    category: 'Other',
    location: '',
    reported_by: profile?.full_name || ''
  })
  const [editFormData, setEditFormData] = useState<NewBreakageForm>({
    reason: '',
    category: 'Other',
    location: '',
    reported_by: ''
  })
  const [stats, setStats] = useState({
    totalBreakages: 0,
    totalLoss: 0,
    approvedLoss: 0,
    pending: 0
  })
  const [isStatsLoading, setIsStatsLoading] = useState(true)
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
      const statsData = await getBreakageStats(startDate, endDate)
      setStats(statsData)
    } catch (error) {
      console.error("Failed to load stats:", error)
      toast.error("Failed to load breakage stats")
    } finally {
      setIsStatsLoading(false)
    }
  }, [getFormattedDateRange])

  const loadBreakages = useCallback(async () => {
    try {
      setLoading(true)
      const { startDate, endDate } = getFormattedDateRange()
      const breakagesData = await getBreakages(startDate, endDate)
      setBreakages(breakagesData as BreakageWithProduct[])
    } catch (error) {
      console.error('Error loading breakages:', error)
      toast.error('Failed to load breakages')
    } finally {
      setLoading(false)
    }
  }, [getFormattedDateRange])

  useEffect(() => {
    loadBreakages()
    loadStats()
  }, [loadBreakages, loadStats])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await getProducts()
        setProducts(productsData)
      } catch (error) {
        console.error('Error loading products:', error)
        toast.error('Failed to load products')
      }
    }
    loadProducts()
  }, [])

  useEffect(() => {
    if (profile?.full_name) {
      setFormData(prev => ({ ...prev, reported_by: profile.full_name }))
    }
  }, [profile])


  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadBreakages(), loadStats()])
    } catch (error) {
      console.error("Failed to refresh breakages:", error)
    } finally {
      setRefreshing(false)
    }
  }

  // Filter products for the breakage form search
  const filteredProductsForBreakage = products.filter((product) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.id.toLowerCase().includes(productSearchTerm.toLowerCase())
  ).slice(0, 10) // Limit to 10 results for better performance

  // Filter breakages based on search, category, and status (date filtering is done server-side)
  const filteredBreakages = breakages.filter((breakage) => {
    const productName = breakage.products?.name || ''
    const matchesSearch =
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      breakage.reported_by.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || breakage.category === selectedCategory
    const matchesStatus = selectedStatus === "All" || breakage.status === selectedStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 min-w-[110px] justify-center">Approved</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 min-w-[110px] justify-center">Pending</Badge>
      case "investigating":
        return <Badge className="bg-blue-100 text-blue-800 min-w-[110px] justify-center">Investigating</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 min-w-[110px] justify-center">Rejected</Badge>
      default:
        return <Badge variant="outline" className="min-w-[110px] justify-center">{status}</Badge>
    }
  }

  const updateBreakageStatus = async (breakageId: string, newStatus: string) => {
    try {
      await updateBreakage(breakageId, { status: newStatus as any })
      await loadBreakages()
      loadStats() // Reload stats after status change
      
      // If this breakage is currently being viewed in the details dialog, update its state
      if (selectedBreakage && selectedBreakage.id === breakageId) {
        setSelectedBreakage({
          ...selectedBreakage,
          status: newStatus as any,
          updated_at: new Date().toISOString()
        })
      }
      
      toast.success('Breakage status updated successfully')
    } catch (error) {
      console.error('Error updating breakage status:', error)
      toast.error('Failed to update breakage status')
    }
  }

  const handleEditBreakage = (breakage: BreakageWithProduct) => {
    setEditingBreakage(breakage)
    setEditFormData({
      reason: breakage.reason || '',
      category: breakage.category,
      location: breakage.location || '',
      reported_by: breakage.reported_by
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmitEditBreakage = async () => {
    if (!editingBreakage) return
    
    try {
      await updateBreakage(editingBreakage.id, {
        reason: editFormData.reason,
        category: editFormData.category,
        location: editFormData.location,
        reported_by: editFormData.reported_by
      })
      
      await loadBreakages()
      setIsEditDialogOpen(false)
      setEditingBreakage(null)
      toast.success('Breakage updated successfully')
    } catch (error) {
      console.error('Error updating breakage:', error)
      toast.error('Failed to update breakage')
    }
  }

  const handleDeleteBreakage = async (breakageId: string) => {
    const confirmed = await confirm({
      title: "Delete Breakage",
      description: "Are you sure you want to delete this breakage report? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      await deleteBreakage(breakageId)
      await loadBreakages()
      loadStats() // Reload stats after deletion
      toast.success('Breakage deleted successfully')
    } catch (error: any) {
      console.error('Error deleting breakage:', error)
      toast.error(error?.message || 'Failed to delete breakage')
    }
  }

  const handleBulkDeleteBreakages = async () => {
    if (selectedBreakages.size === 0) return
    
    const selectedCount = selectedBreakages.size
    const confirmed = await confirm({
      title: "Delete Multiple Breakages",
      description: `Are you sure you want to delete ${selectedCount} selected breakage reports? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      const selectedIds = Array.from(selectedBreakages)
      await bulkDeleteBreakages(selectedIds)
      toast.success(`Successfully deleted ${selectedCount} breakage reports`)
      setSelectedBreakages(new Set())
      loadBreakages()
      loadStats()
    } catch (error: any) {
      console.error("Failed to delete breakages:", error)
      toast.error("Failed to delete selected breakages")
    }
  }

  const handleSubmitBreakage = async () => {
    if (!user) return
    
    if (breakageCart.length === 0) {
      toast.error('Please add at least one product to the breakage report')
      return
    }
    
    try {
      const today = new Date()
      const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
      
      // Create a separate breakage record for each product in the cart
      const breakagePromises = breakageCart.map(item => 
        createBreakage({
          product_id: item.product_id,
          quantity: item.quantity,
          cost: item.total_cost,
          reason: formData.reason,
          category: formData.category,
          location: formData.location,
          reported_by: formData.reported_by,
          date: todayString,
          user_id: user.id,
          status: 'pending'
        })
      )
      
      await Promise.all(breakagePromises)
      
      await loadBreakages()
      loadStats() // Reload stats after creating breakages
      setIsAddDialogOpen(false)
      
      // Clear the form and cart
      setFormData({
        reason: '',
        category: 'Other',
        location: '',
        reported_by: profile?.full_name || ''
      })
      setBreakageCart([])
      setProductSearchTerm("")
      
      toast.success(`${breakageCart.length} breakage(s) reported successfully`)
    } catch (error) {
      console.error('Error creating breakages:', error)
      toast.error('Failed to report breakages')
    }
  }

  const addToBreakageCart = (product: Product) => {
    const existingItem = breakageCart.find(item => item.product_id === product.id)
    
    if (existingItem) {
      // Update existing item quantity
      setBreakageCart(breakageCart.map(item =>
        item.product_id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              total_cost: (item.quantity + 1) * item.unit_cost
            }
          : item
      ))
    } else {
      // Add new item to cart
      const newItem: BreakageCartItem = {
        id: `${Date.now()}-${product.id}`,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_cost: product.cost_price,
        total_cost: product.cost_price,
        unit: product.unit,
        stock_quantity: product.stock_quantity
      }
      setBreakageCart([...breakageCart, newItem])
    }
    setProductSearchTerm("")
  }

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setBreakageCart(breakageCart.filter(item => item.id !== itemId))
    } else {
      setBreakageCart(breakageCart.map(item =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              total_cost: newQuantity * item.unit_cost
            }
          : item
      ))
    }
  }

  const removeFromCart = (itemId: string) => {
    setBreakageCart(breakageCart.filter(item => item.id !== itemId))
  }

  const getTotalBreakageCost = () => {
    return breakageCart.reduce((sum, item) => sum + item.total_cost, 0)
  }

  return (
    <DashboardLayout currentPage="breakages">
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-balance">Breakage Management</h1>
              <p className="text-muted-foreground">Track and manage product damages and losses</p>
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
              {isOwner && (
                <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                  setIsAddDialogOpen(open)
                  if (!open) {
                    setProductSearchTerm("")
                    setBreakageCart([])
                  }
                }}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Report Breakage
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Report New Breakage</DialogTitle>
                <DialogDescription>Report a damaged or lost product for tracking and accounting.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Product Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Products to Report</label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products to add to breakage report..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {productSearchTerm && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredProductsForBreakage.length > 0 ? (
                          filteredProductsForBreakage.map((product) => (
                            <div
                              key={product.id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                              onClick={() => addToBreakageCart(product)}
                            >
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Stock: {product.stock_quantity} • Cost: KSh {product.cost_price.toLocaleString()}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No products found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Breakage Cart */}
                {breakageCart.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Products to Report ({breakageCart.length})</label>
                    <div className="border rounded-md">
                      <div className="max-h-48 overflow-y-auto">
                        {breakageCart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                            <div className="flex-1">
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-sm text-muted-foreground">
                                KSh {item.unit_cost.toLocaleString()} × {item.quantity} = KSh {item.total_cost.toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-muted/50 font-medium">
                        Total Loss: KSh {getTotalBreakageCost().toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.slice(1).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input 
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Where did this occur?" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason for Breakage</label>
                  <Textarea 
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Describe what happened..." 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reported By</label>
                  <Input 
                    value={formData.reported_by}
                    onChange={(e) => setFormData(prev => ({ ...prev, reported_by: e.target.value }))}
                    placeholder="Your name" 
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => {
                    setIsAddDialogOpen(false)
                    setProductSearchTerm("")
                    setBreakageCart([])
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitBreakage} disabled={breakageCart.length === 0}>
                    Report {breakageCart.length > 0 ? `${breakageCart.length} ` : ''}Breakage{breakageCart.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Breakages</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isStatsLoading ? "Loading..." : stats.totalBreakages.toString()}
              </div>
              <p className="text-xs text-muted-foreground">Number of breakage reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loss</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.totalLoss).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Total reported losses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Loss</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.approvedLoss).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Confirmed and approved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {isStatsLoading ? "Loading..." : stats.pending.toString()}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Breakage Reports</CardTitle>
            <CardDescription>Search and filter breakage reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, codes, or reporters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select status" />
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

            {selectedBreakages.size > 0 && (
              <div className="flex gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
                {isOwner && (
                  <Button variant="outline" size="sm">
                    Approve Selected ({selectedBreakages.size})
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
                {isOwner && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDeleteBreakages}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedBreakages.size})
                  </Button>
                )}
              </div>
            )}

            {/* Breakages Table - Desktop */}
            <div className="border hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedBreakages.size === filteredBreakages.length && filteredBreakages.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBreakages(new Set(filteredBreakages.map(b => b.id)))
                          } else {
                            setSelectedBreakages(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="uppercase">Product</TableHead>
                    <TableHead className="uppercase">Quantity</TableHead>
                    <TableHead className="uppercase">Loss Amount</TableHead>
                    <TableHead className="uppercase">Category</TableHead>
                    <TableHead className="uppercase">Reported By</TableHead>
                    <TableHead className="uppercase">Date</TableHead>
                    <TableHead className="uppercase">Status</TableHead>
                    <TableHead className="text-right uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="space-y-3">
                          Loading breakages...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBreakages.map((breakage) => (
                      <TableRow key={breakage.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedBreakages.has(breakage.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedBreakages)
                              if (checked) {
                                newSelected.add(breakage.id)
                              } else {
                                newSelected.delete(breakage.id)
                              }
                              setSelectedBreakages(newSelected)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{breakage.products?.name || 'Unknown Product'}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{breakage.quantity}</TableCell>
                        <TableCell className="font-medium text-red-600">KSh {Math.round(breakage.cost).toLocaleString()}</TableCell>
                        <TableCell>{breakage.category}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{breakage.reported_by}</div>
                            <div className="text-sm text-muted-foreground">{breakage.location || 'No location specified'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(breakage.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Select
                            value={breakage.status}
                            onValueChange={(value) => updateBreakageStatus(breakage.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="investigating">Investigating</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedBreakage(breakage)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBreakage(breakage)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBreakage(breakage.id)}
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

            {/* Breakages Cards - Mobile */}
            <div className="sm:hidden space-y-4">
              {filteredBreakages.map((breakage) => (
                <div key={breakage.id} className="border rounded-lg bg-white">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedBreakages.has(breakage.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedBreakages)
                            if (checked) {
                              newSelected.add(breakage.id)
                            } else {
                              newSelected.delete(breakage.id)
                            }
                            setSelectedBreakages(newSelected)
                          }}
                        />
                        <button
                          onClick={() => toggleItem(breakage.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedItems.has(breakage.id) ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleItem(breakage.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-base">{breakage.products?.name || 'Unknown Product'}</div>
                          <div className="text-sm text-muted-foreground">{breakage.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-base text-red-600">KSh {Math.round(breakage.cost).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Qty: {breakage.quantity}</div>
                        </div>
                      </div>
                    </div>

                    {expandedItems.has(breakage.id) && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-1">Incident Details</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Reported by: {breakage.reported_by}</div>
                              <div>Location: {breakage.location || 'Not specified'}</div>
                              <div>Date: {new Date(breakage.date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">Loss Information</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Quantity: {breakage.quantity}</div>
                              <div>Cost: KSh {Math.round(breakage.cost).toLocaleString()}</div>
                              <div>Status: 
                                <Select
                                  value={breakage.status}
                                  onValueChange={(value) => updateBreakageStatus(breakage.id, value)}
                                >
                                  <SelectTrigger className="w-24 h-6 ml-2 inline-flex">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="investigating">Investigating</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {breakage.reason && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Reason</h4>
                            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                              {breakage.reason}
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <strong>Created:</strong> {new Date(breakage.created_at).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>Updated:</strong> {new Date(breakage.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedBreakage(breakage)}>
                            <Eye className="h-4 w-4 mr-1" />View
                          </Button>
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleEditBreakage(breakage)}>
                              <Edit className="h-4 w-4 mr-1" />Edit
                            </Button>
                          )}
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteBreakage(breakage.id)}>
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

            {filteredBreakages.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No breakage reports found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breakage Details Dialog */}
        <Dialog open={!!selectedBreakage} onOpenChange={() => setSelectedBreakage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Breakage Report Details</DialogTitle>
              <DialogDescription>
                Reported on {selectedBreakage && new Date(selectedBreakage.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            {selectedBreakage && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Product Information</h4>
                    <p className="text-sm text-muted-foreground">Product: {selectedBreakage.products?.name || 'Unknown Product'}</p>
                    <p className="text-sm text-muted-foreground">Quantity Lost: {selectedBreakage.quantity}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Cost: KSh {Math.round(selectedBreakage.cost).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Report Details</h4>
                    <p className="text-sm text-muted-foreground">Category: {selectedBreakage.category}</p>
                    <p className="text-sm text-muted-foreground">Status: {getStatusBadge(selectedBreakage.status)}</p>
                    <p className="text-sm text-muted-foreground">
                      Date: {new Date(selectedBreakage.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Incident Details</h4>
                  <div className="border p-3 rounded bg-muted/50 space-y-2">
                    <p className="text-sm"><strong>Location:</strong> {selectedBreakage.location || 'Not specified'}</p>
                    <p className="text-sm"><strong>Reported by:</strong> {selectedBreakage.reported_by}</p>
                    {selectedBreakage.reason && (
                      <div>
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm">{selectedBreakage.reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Created:</span>
                    <span>{new Date(selectedBreakage.created_at).toLocaleDateString()} at {new Date(selectedBreakage.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Last Updated:</span>
                    <span>{new Date(selectedBreakage.updated_at).toLocaleDateString()} at {new Date(selectedBreakage.updated_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  {selectedBreakage.status === 'pending' && (
                    <Button onClick={() => updateBreakageStatus(selectedBreakage.id, 'approved')}>
                      Approve Report
                    </Button>
                  )}
                  {selectedBreakage.status !== 'investigating' && (
                    <Button variant="outline" onClick={() => updateBreakageStatus(selectedBreakage.id, 'investigating')}>
                      Mark as Investigating
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Breakage Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditingBreakage(null)
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Breakage Report</DialogTitle>
              <DialogDescription>
                Update the breakage report details for {editingBreakage?.products?.name || 'Unknown Product'}
              </DialogDescription>
            </DialogHeader>
            {editingBreakage && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Product Information (Read-only)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Product:</span> {editingBreakage.products?.name || 'Unknown Product'}
                    </div>
                    <div>
                      <span className="font-medium">Quantity:</span> {editingBreakage.quantity}
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span> KSh {Math.round(editingBreakage.cost).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {new Date(editingBreakage.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select 
                      value={editFormData.category} 
                      onValueChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.slice(1).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input 
                      value={editFormData.location}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Where did this occur?" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason for Breakage</label>
                  <Textarea 
                    value={editFormData.reason}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Describe what happened..." 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reported By</label>
                  <Input 
                    value={editFormData.reported_by}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, reported_by: e.target.value }))}
                    placeholder="Reporter name" 
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingBreakage(null)
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitEditBreakage}>
                    Update Breakage
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        <ConfirmDialog />
      </div>
    </DashboardLayout>
  )
}

export default function BreakagesPage() {
  return (
    <ProtectedRoute allowedRoles={['owner', 'employee']}>
      <BreakagesContent />
    </ProtectedRoute>
  )
}