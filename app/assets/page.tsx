"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { DateFilter } from "@/components/date-filter"
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
import { Plus, Minus, Search, Package, TrendingUp, Calendar, Edit, Trash2, Monitor, Car, Building, Loader2, Eye, RefreshCw } from "lucide-react"
import { DateRange } from "react-day-picker"
import { getAssets, createAsset, updateAsset, deleteAsset, bulkDeleteAssets } from "@/lib/database"
import { Asset } from "@/lib/database-types"
import { useAuth } from "@/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { useConfirm } from "@/hooks/use-confirm"
import { toast } from "sonner"


const categories = ["All", "Technology", "Vehicle", "Equipment", "Furniture", "Tools", "Machinery"]

function AssetsContent() {
  const { user, isOwner } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedCondition, setSelectedCondition] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    name: "",
    serial_number: "",
    category: "",
    purchase_price: "",
    current_value: "",
    purchase_date: "",
    condition: "good" as const,
    location: "",
    vendor: "",
    warranty_expiry: "",
    description: ""
  })
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

  useEffect(() => {
    if (user) {
      loadAssets()
    }
  }, [user])

  const loadAssets = async () => {
    try {
      setLoading(true)
      const data = await getAssets()
      setAssets(data)
    } catch (error) {
      console.error('Error loading assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadAssets()
    } catch (error) {
      console.error("Failed to refresh assets:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.location && asset.location.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === "All" || asset.category === selectedCategory
    const matchesCondition = selectedCondition === "All" || asset.condition === selectedCondition
    
    // Date range filtering based on purchase_date
    let matchesDateRange = true
    if (dateRange?.from || dateRange?.to) {
      const purchaseDate = new Date(asset.purchase_date)
      if (dateRange.from && dateRange.to) {
        const fromDate = new Date(dateRange.from)
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999) // Include the entire end date
        matchesDateRange = purchaseDate >= fromDate && purchaseDate <= toDate
      } else if (dateRange.from) {
        const fromDate = new Date(dateRange.from)
        matchesDateRange = purchaseDate >= fromDate
      } else if (dateRange.to) {
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        matchesDateRange = purchaseDate <= toDate
      }
    }
    
    return matchesSearch && matchesCategory && matchesCondition && matchesDateRange
  })

  // Calculate asset stats based on date filter or show all by default
  const getFilteredAssetStats = () => {
    let statsFilteredAssets = assets
    let periodLabel = "All Time"
    
    if (dateRange?.from || dateRange?.to) {
      // Apply the same filtering logic as the main filter (based on purchase_date)
      statsFilteredAssets = assets.filter((asset) => {
        const purchaseDate = new Date(asset.purchase_date)
        if (dateRange.from && dateRange.to) {
          const fromDate = new Date(dateRange.from)
          const toDate = new Date(dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          return purchaseDate >= fromDate && purchaseDate <= toDate
        } else if (dateRange.from) {
          const fromDate = new Date(dateRange.from)
          return purchaseDate >= fromDate
        } else if (dateRange.to) {
          const toDate = new Date(dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          return purchaseDate <= toDate
        }
        return true
      })
      
      // Determine period label
      if (dateRange.from && dateRange.to) {
        if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
          periodLabel = dateRange.from.toDateString() === new Date().toDateString() ? "Purchased Today" : "Purchased Selected Day"
        } else {
          periodLabel = "Purchased in Period"
        }
      } else if (dateRange.from) {
        periodLabel = "Purchased From Selected Date"
      } else if (dateRange.to) {
        periodLabel = "Purchased Up to Selected Date"
      }
    }
    
    return { statsFilteredAssets, periodLabel }
  }
  
  const { statsFilteredAssets, periodLabel } = getFilteredAssetStats()
  const totalAssets = assets.length
  const filteredPurchaseValue = statsFilteredAssets.reduce((sum, asset) => sum + asset.purchase_price, 0)
  const filteredCurrentValue = statsFilteredAssets.reduce((sum, asset) => sum + asset.current_value, 0)
  const filteredDepreciation = filteredPurchaseValue - filteredCurrentValue

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case "excellent":
        return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
      case "good":
        return <Badge className="bg-blue-100 text-blue-800">Good</Badge>
      case "fair":
        return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>
      case "poor":
        return <Badge className="bg-red-100 text-red-800">Poor</Badge>
      default:
        return <Badge variant="outline">{condition}</Badge>
    }
  }

  const updateAssetCondition = async (assetId: string, newCondition: string) => {
    try {
      await updateAsset(assetId, { condition: newCondition as Asset['condition'] })
      await loadAssets()
    } catch (error) {
      console.error('Error updating asset condition:', error)
    }
  }

  const handleAddAsset = async () => {
    if (!user || !formData.name || !formData.category || !formData.purchase_price || !formData.purchase_date) {
      return
    }

    try {
      await createAsset({
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        serial_number: formData.serial_number || null,
        purchase_price: parseFloat(formData.purchase_price),
        current_value: parseFloat(formData.current_value) || parseFloat(formData.purchase_price),
        purchase_date: formData.purchase_date,
        condition: formData.condition,
        location: formData.location || null,
        vendor: formData.vendor || null,
        warranty_expiry: formData.warranty_expiry || null,
        user_id: user.id
      })
      
      setIsAddDialogOpen(false)
      setFormData({
        name: "",
        serial_number: "",
        category: "",
        purchase_price: "",
        current_value: "",
        purchase_date: "",
        condition: "good" as const,
        location: "",
        vendor: "",
        warranty_expiry: "",
        description: ""
      })
      await loadAssets()
    } catch (error) {
      console.error('Error adding asset:', error)
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId)
    const assetName = asset?.name || 'this asset'
    
    const confirmed = await confirm({
      title: "Delete Asset",
      description: `Are you sure you want to delete "${assetName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      await deleteAsset(assetId)
      await loadAssets()
      toast.success("Asset deleted successfully")
    } catch (error: any) {
      console.error('Error deleting asset:', error)
      toast.error(error?.message || 'Failed to delete asset')
    }
  }

  const handleBulkDeleteAssets = async () => {
    if (selectedAssets.size === 0) return
    
    const selectedCount = selectedAssets.size
    const confirmed = await confirm({
      title: "Delete Multiple Assets",
      description: `Are you sure you want to delete ${selectedCount} selected assets? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      const selectedIds = Array.from(selectedAssets)
      await bulkDeleteAssets(selectedIds)
      toast.success(`Successfully deleted ${selectedCount} assets`)
      setSelectedAssets(new Set())
      loadAssets()
    } catch (error: any) {
      console.error("Failed to delete assets:", error)
      toast.error("Failed to delete selected assets")
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Technology":
        return <Monitor className="h-4 w-4" />
      case "Vehicle":
        return <Car className="h-4 w-4" />
      case "Equipment":
      case "Furniture":
        return <Building className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  return (
    <DashboardLayout currentPage="assets">
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-balance">Asset Management</h1>
              <p className="text-muted-foreground">Track and manage your business assets</p>
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
              {isOwner && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Asset
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>Enter the details for the new asset to track in your inventory.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Asset Name</label>
                    <Input 
                      placeholder="Enter asset name" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Serial Number</label>
                    <Input 
                      placeholder="Enter serial number" 
                      value={formData.serial_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                    />
                  </div>
                </div>
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
                    <label className="text-sm font-medium">Purchase Price</label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={formData.purchase_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Value</label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={formData.current_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, current_value: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purchase Date</label>
                    <Input 
                      type="date" 
                      value={formData.purchase_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Condition</label>
                    <Select value={formData.condition} onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value as Asset['condition'] }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input 
                      placeholder="Enter location" 
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vendor</label>
                    <Input 
                      placeholder="Enter vendor name" 
                      value={formData.vendor}
                      onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Warranty Expiry Date</label>
                    <Input 
                      type="date" 
                      value={formData.warranty_expiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, warranty_expiry: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    placeholder="Enter description" 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddAsset}>
                    Add Asset
                  </Button>
                </div>
              </div>
                  </DialogContent>
                </Dialog>
              )}
          <DateFilter value={dateRange} onChange={setDateRange} className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-2 sm:items-center" />
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="w-full sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assets ({periodLabel})</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-blue">{statsFilteredAssets.length}</div>
              <p className="text-xs text-muted-foreground">Assets in period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchase Value ({periodLabel})</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-green">KSh {Math.round(filteredPurchaseValue).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Original cost in period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Value ({periodLabel})</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-orange">KSh {Math.round(filteredCurrentValue).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Present worth in period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Depreciation ({periodLabel})</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-red">KSh {Math.round(filteredDepreciation).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Depreciated in period</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Asset Registry</CardTitle>
            <CardDescription>Search and filter your business assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets, serial numbers, or locations..."
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
              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Conditions</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedAssets.size > 0 && (
              <div className="flex gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
                {isOwner && (
                  <Button variant="outline" size="sm">
                    Update Condition ({selectedAssets.size})
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
                {isOwner && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDeleteAssets}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedAssets.size})
                  </Button>
                )}
              </div>
            )}

            {/* Assets Table - Desktop */}
            <div className="border hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAssets(new Set(filteredAssets.map(a => a.id)))
                          } else {
                            setSelectedAssets(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="uppercase">Asset</TableHead>
                    <TableHead className="uppercase">Category</TableHead>
                    <TableHead className="uppercase">Location</TableHead>
                    <TableHead className="uppercase">Purchase Price</TableHead>
                    <TableHead className="uppercase">Current Value</TableHead>
                    <TableHead className="uppercase">Condition</TableHead>
                    <TableHead className="text-right uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedAssets.has(asset.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedAssets)
                            if (checked) {
                              newSelected.add(asset.id)
                            } else {
                              newSelected.delete(asset.id)
                            }
                            setSelectedAssets(newSelected)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">{asset.serial_number || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(asset.category)}
                          {asset.category}
                        </div>
                      </TableCell>
                      <TableCell>{asset.location || 'N/A'}</TableCell>
                      <TableCell className="font-medium">KSh {Math.round(asset.purchase_price).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">KSh {Math.round(asset.current_value).toLocaleString()}</TableCell>
                      <TableCell>
                        <Select
                          value={asset.condition}
                          onValueChange={(value) => updateAssetCondition(asset.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedAsset(asset)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isOwner && (
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Assets Cards - Mobile */}
            <div className="sm:hidden space-y-4">
              {filteredAssets.map((asset) => (
                <div key={asset.id} className="border rounded-lg bg-white">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedAssets.has(asset.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedAssets)
                            if (checked) {
                              newSelected.add(asset.id)
                            } else {
                              newSelected.delete(asset.id)
                            }
                            setSelectedAssets(newSelected)
                          }}
                        />
                        <button
                          onClick={() => toggleItem(asset.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedItems.has(asset.id) ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleItem(asset.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-base">{asset.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            {getCategoryIcon(asset.category)}
                            {asset.category}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-base">KSh {Math.round(asset.current_value).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{asset.serial_number || 'No S/N'}</div>
                        </div>
                      </div>
                    </div>

                    {expandedItems.has(asset.id) && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-1">Asset Details</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Location: {asset.location || 'N/A'}</div>
                              <div>Serial: {asset.serial_number || 'N/A'}</div>
                              <div>Vendor: {asset.vendor || 'N/A'}</div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">Financial Info</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Purchase: KSh {Math.round(asset.purchase_price).toLocaleString()}</div>
                              <div>Current: KSh {Math.round(asset.current_value).toLocaleString()}</div>
                              <div>Loss: KSh {Math.round(asset.purchase_price - asset.current_value).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-1">Condition</h4>
                            <Select
                              value={asset.condition}
                              onValueChange={(value) => updateAssetCondition(asset.id, value)}
                            >
                              <SelectTrigger className="w-full h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="excellent">Excellent</SelectItem>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="fair">Fair</SelectItem>
                                <SelectItem value="poor">Poor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">Purchase Date</h4>
                            <div className="text-sm text-muted-foreground">
                              {new Date(asset.purchase_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        {asset.description && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Description</h4>
                            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                              {asset.description}
                            </div>
                          </div>
                        )}
                        
                        {asset.warranty_expiry && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Warranty</h4>
                            <div className="text-sm text-muted-foreground">
                              Expires: {new Date(asset.warranty_expiry).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedAsset(asset)}>
                            <Eye className="h-4 w-4 mr-1" />View
                          </Button>
                          {isOwner && (
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4 mr-1" />Edit
                            </Button>
                          )}
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.id)}>
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

            {loading && (
              <div className="text-center py-8">
                Loading assets...
              </div>
            )}

            {!loading && filteredAssets.length === 0 && (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No assets found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {assets.length === 0 ? 'Get started by adding your first asset.' : 'Try adjusting your search or filter criteria.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Details Dialog */}
        <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Asset Details - {selectedAsset?.name}</DialogTitle>
              <DialogDescription>
                Purchased on {selectedAsset && new Date(selectedAsset.purchase_date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            {selectedAsset && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Asset Information</h4>
                    <p className="text-sm text-muted-foreground">Name: {selectedAsset.name}</p>
                    <p className="text-sm text-muted-foreground">Serial Number: {selectedAsset.serial_number || 'Not provided'}</p>
                    <p className="text-sm text-muted-foreground">Category: {selectedAsset.category}</p>
                    <p className="text-sm text-muted-foreground">Location: {selectedAsset.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Financial Details</h4>
                    <p className="text-sm text-muted-foreground">
                      Purchase Price: KSh {Math.round(selectedAsset.purchase_price).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current Value: KSh {Math.round(selectedAsset.current_value).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Depreciation: KSh {Math.round(selectedAsset.purchase_price - selectedAsset.current_value).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Purchase Date: {new Date(selectedAsset.purchase_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Condition & Maintenance</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border p-3 rounded">
                      <div className="text-lg font-bold">{getConditionBadge(selectedAsset.condition)}</div>
                      <p className="text-sm text-muted-foreground">Current Condition</p>
                    </div>
                    <div className="border p-3 rounded">
                      <div className="text-lg font-bold">
                        {selectedAsset.vendor || 'Not specified'}
                      </div>
                      <p className="text-sm text-muted-foreground">Vendor</p>
                    </div>
                    <div className="border p-3 rounded">
                      <div className="text-lg font-bold">
                        {selectedAsset.warranty_expiry 
                          ? new Date(selectedAsset.warranty_expiry).toLocaleDateString()
                          : 'No warranty'
                        }
                      </div>
                      <p className="text-sm text-muted-foreground">Warranty Expiry</p>
                    </div>
                  </div>
                </div>

                {selectedAsset.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <div className="border p-3 rounded bg-muted/50">
                      <p className="text-sm">{selectedAsset.description}</p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Added:</span>
                    <span>{new Date(selectedAsset.created_at).toLocaleDateString()} at {new Date(selectedAsset.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Last Updated:</span>
                    <span>{new Date(selectedAsset.updated_at).toLocaleDateString()} at {new Date(selectedAsset.updated_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Ownership:</span>
                    <span>
                      {Math.floor((new Date().getTime() - new Date(selectedAsset.purchase_date).getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => updateAssetCondition(selectedAsset.id, selectedAsset.condition)}>
                    Update Condition
                  </Button>
                  <Button variant="outline">
                    Edit Asset
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

export default function AssetsPage() {
  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <AssetsContent />
    </ProtectedRoute>
  )
}