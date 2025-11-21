"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { InventoryDateFilter } from "@/components/inventory-date-filter"
import { useInventoryDateFilter } from "@/contexts/inventory-date-filter-context"
import { InventoryDateFilterProvider } from "@/contexts/inventory-date-filter-context"
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
import { Plus, Search, Package, AlertTriangle, Edit, Trash2, Eye, DollarSign, TrendingUp, Upload, RefreshCw, Minus, Download, FileText, FileSpreadsheet } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Papa from "papaparse"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { AddProductForm } from "@/components/add-product-form"
import { EditProductForm } from "@/components/edit-product-form"
import { InventoryImport } from "@/components/inventory-import"
import { DateRange } from "react-day-picker"
import { useProductsStore } from "@/stores/products-store"
import type { Product, Supplier } from "@/lib/database-types"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useConfirm } from "@/hooks/use-confirm"
import { PRODUCT_CATEGORIES } from "@/lib/constants"

const categories = ["All", ...PRODUCT_CATEGORIES]

function InventoryContent() {
  const { isOwner } = useAuth()
  const { getFormattedDateRange, dateRange } = useInventoryDateFilter()
  const {
    products,
    suppliers,
    loading,
    inventoryStats,
    fetchProducts,
    fetchSuppliers,
    removeProduct,
    bulkRemoveProducts,
    editProduct,
    fetchInventoryStats
  } = useProductsStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedStockLevel, setSelectedStockLevel] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const { confirm, ConfirmDialog } = useConfirm()
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [bulkCategoryUpdate, setBulkCategoryUpdate] = useState<string>("")
  const [showBulkCategoryDialog, setShowBulkCategoryDialog] = useState(false)
  
  const stats = inventoryStats || {
    inventoryValue: 0,
    potentialValue: 0,
    totalItems: 0,
    newProducts: 0
  }

  const loadStats = useCallback(async () => {
    try {
      const { startDate, endDate } = getFormattedDateRange()
      await fetchInventoryStats(startDate, endDate)
    } catch (error) {
      console.error("Failed to load stats:", error)
      toast.error("Failed to load inventory stats")
    }
  }, [getFormattedDateRange, fetchInventoryStats])

  const loadProducts = useCallback(async () => {
    try {
      const { startDate, endDate } = getFormattedDateRange()
      await fetchProducts(startDate, endDate)
    } catch (error) {
      console.error("Failed to load products:", error)
      toast.error("Failed to load products")
    }
  }, [getFormattedDateRange, fetchProducts])

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadProducts(),
          fetchSuppliers()
        ])
      } catch (error) {
        console.error("Failed to load data:", error)
        toast.error("Failed to load inventory data")
      }
    }
    
    loadData()
    loadStats()
  }, [loadProducts, fetchSuppliers, loadStats])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        loadProducts(),
        fetchSuppliers(),
        loadStats()
      ])
    } catch (error) {
      console.error("Failed to refresh inventory:", error)
      toast.error("Failed to refresh inventory data")
    } finally {
      setRefreshing(false)
    }
  }

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) return { label: "Out of Stock", variant: "destructive" as const }
    if (product.stock_quantity <= product.min_stock_level) return { label: "Low Stock", variant: "secondary" as const }
    return { label: "In Stock", variant: "default" as const }
  }

  // Filter products based on search, category, and date range
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory

    // Stock level filtering
    const stockStatus = getStockStatus(product).label
    const matchesStockLevel = selectedStockLevel === "All" || stockStatus === selectedStockLevel

    // Date range filtering based on created_at (when product was added)
    let matchesDateRange = true
    if (dateRange?.from || dateRange?.to) {
      const createdDate = new Date(product.created_at)
      if (dateRange.from && dateRange.to) {
        const fromDate = new Date(dateRange.from)
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999) // Include the entire end date
        matchesDateRange = createdDate >= fromDate && createdDate <= toDate
      } else if (dateRange.from) {
        const fromDate = new Date(dateRange.from)
        matchesDateRange = createdDate >= fromDate
      } else if (dateRange.to) {
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        matchesDateRange = createdDate <= toDate
      }
    }
    
    return matchesSearch && matchesCategory && matchesStockLevel && matchesDateRange
  })

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return "No supplier"
    const supplier = suppliers.find(s => s.id === supplierId)
    return supplier?.name || "Unknown"
  }

  const handleDeleteProduct = async (productId: string) => {
    const confirmed = await confirm({
      title: "Delete Product",
      description: "Are you sure you want to delete this product? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      await removeProduct(productId)
      loadStats() // Reload stats after deletion
      toast.success("Product deleted successfully!")
    } catch (error: any) {
      console.error("Failed to delete product:", error)
      const errorMessage = error?.message || "Failed to delete product"
      toast.error(errorMessage)
    }
  }

  const handleBulkDeleteProducts = async () => {
    if (selectedProducts.size === 0) return

    const selectedCount = selectedProducts.size
    const confirmed = await confirm({
      title: "Delete Multiple Products",
      description: `Are you sure you want to delete ${selectedCount} selected products? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      variant: "destructive"
    })

    if (!confirmed) return

    try {
      const selectedIds = Array.from(selectedProducts)
      const results = await bulkRemoveProducts(selectedIds)

      // Clear selection and reload stats
      setSelectedProducts(new Set())
      loadStats()

      if (results && typeof results === 'object' && 'deleted' in results) {
        if (results.failed === 0) {
          // All products deleted successfully
          toast.success(`${results.deleted} products deleted successfully!`)
        } else if (results.deleted > 0) {
          // Some deleted, some failed
          toast.warning(`${results.deleted} products deleted successfully. ${results.failed} products could not be deleted because they are referenced in sales.`)
        } else {
          // None deleted, all failed
          toast.error(`No products could be deleted. All ${results.failed} selected products are referenced in sales and cannot be deleted.`)
        }
      } else {
        toast.success(`${selectedCount} products deleted successfully!`)
      }
    } catch (error: any) {
      console.error("Failed to delete products:", error)
      const errorMessage = error?.message || "Failed to delete products. Please try again."
      toast.error(errorMessage)
    }
  }

  const handleCategoryUpdate = async (productId: string, newCategory: string) => {
    try {
      await editProduct(productId, { category: newCategory })
      setEditingCategory(null)
      toast.success("Category updated successfully!")
    } catch (error: any) {
      console.error("Failed to update category:", error)
      toast.error("Failed to update category")
    }
  }

  const handleBulkCategoryUpdate = async () => {
    if (selectedProducts.size === 0 || !bulkCategoryUpdate) return

    const selectedCount = selectedProducts.size

    try {
      const selectedIds = Array.from(selectedProducts)
      const updatePromises = selectedIds.map(id =>
        editProduct(id, { category: bulkCategoryUpdate })
      )

      await Promise.all(updatePromises)

      // Clear selection and close dialog
      setSelectedProducts(new Set())
      setShowBulkCategoryDialog(false)
      setBulkCategoryUpdate("")

      toast.success(`Category updated for ${selectedCount} products!`)
    } catch (error: any) {
      console.error("Failed to update categories:", error)
      toast.error("Failed to update categories")
    }
  }

  const handleExportCSV = () => {
    try {
      const exportData = filteredProducts.map(product => ({
        Name: product.name,
        Category: product.category,
        Supplier: getSupplierName(product.supplier_id),
        "Stock Quantity": product.stock_quantity,
        Unit: product.unit,
        "Min Stock Level": product.min_stock_level,
        "Cost Price": product.cost_price,
        "Selling Price": product.unit_price,
        Actual: "",
        Status: getStockStatus(product).label,
        "Stock Value": product.stock_quantity * product.cost_price,
        "Potential Revenue": product.stock_quantity * product.unit_price,
      }))

      const csv = Papa.unparse(exportData)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)

      link.setAttribute("href", url)
      link.setAttribute("download", `inventory_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("CSV exported successfully!")
    } catch (error) {
      console.error("Failed to export CSV:", error)
      toast.error("Failed to export CSV")
    }
  }

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF()

      // Add title
      doc.setFontSize(16)
      doc.text("Inventory Report", 14, 15)

      // Add date
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)

      // Add stats
      doc.text(`Total Items: ${stats.totalItems}`, 14, 28)
      doc.text(`Inventory Value: KSh ${Math.round(stats.inventoryValue).toLocaleString()}`, 14, 34)
      doc.text(`Potential Value: KSh ${Math.round(stats.potentialValue).toLocaleString()}`, 14, 40)

      // Prepare table data
      const tableData = filteredProducts.map(product => [
        product.name,
        product.category,
        getSupplierName(product.supplier_id),
        `${product.stock_quantity} ${product.unit}`,
        "", // Blank column for actual
        getStockStatus(product).label,
        "", // Blank column for manual entry
      ])

      // Add table
      autoTable(doc, {
        startY: 46,
        head: [["Product", "Category", "Supplier", "Stock", "Actual", "Status", "Notes"]],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          6: { cellWidth: 30 } // Make the Notes column wider for writing
        }
      })

      // Save the PDF
      doc.save(`inventory_${new Date().toISOString().split('T')[0]}.pdf`)

      toast.success("PDF exported successfully!")
    } catch (error) {
      console.error("Failed to export PDF:", error)
      toast.error("Failed to export PDF")
    }
  }

  return (
    <DashboardLayout currentPage="inventory">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-balance">Inventory Management</h1>
              <p className="text-muted-foreground">Manage your products and stock levels</p>
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
              {isOwner && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription>Enter the details for the new product to add to your inventory.</DialogDescription>
                    </DialogHeader>
                    <AddProductForm
                      onClose={() => setIsAddDialogOpen(false)}
                      onSuccess={() => {
                        loadProducts();
                        fetchSuppliers();
                        loadStats();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
              {isOwner && (
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
                    <InventoryImport
                      onClose={() => setIsImportDialogOpen(false)}
                      onSuccess={() => {
                        loadProducts();
                        fetchSuppliers();
                        loadStats();
                        setIsImportDialogOpen(false);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
              <InventoryDateFilter className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-2 sm:items-center" />
              <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="w-full sm:w-auto">
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Edit Product Dialog */}
          <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>Update the product details below.</DialogDescription>
              </DialogHeader>
              {editingProduct && (
                <EditProductForm 
                  product={editingProduct}
                  onClose={() => setEditingProduct(null)} 
                  onSuccess={() => { 
                    loadProducts(); 
                    fetchSuppliers(); 
                    loadStats(); 
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-green">
                {loading ? "Loading..." : `KSh ${Math.round(stats.inventoryValue).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Total cost value of stock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-orange">
                {loading ? "Loading..." : `KSh ${Math.round(stats.potentialValue).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Total potential revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-blue">
                {loading ? "Loading..." : stats.totalItems.toString()}
              </div>
              <p className="text-xs text-muted-foreground">Products in inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Products</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-purple">
                {loading ? "Loading..." : stats.newProducts.toString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {dateRange?.from || dateRange?.to ? "Added in date range" : "All products"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Product Inventory</CardTitle>
            <CardDescription>Search and filter your products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
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
              <Select value={selectedStockLevel} onValueChange={setSelectedStockLevel}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Stock level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Stock Levels</SelectItem>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Low Stock">Low Stock</SelectItem>
                  <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedProducts.size > 0 && (
              <div className="flex gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
                {isOwner && (
                  <Button variant="outline" size="sm">
                    Update Stock ({selectedProducts.size})
                  </Button>
                )}
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkCategoryDialog(true)}
                  >
                    Update Category ({selectedProducts.size})
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
                {isOwner && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDeleteProducts}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedProducts.size})
                  </Button>
                )}
              </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden sm:block border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
                          } else {
                            setSelectedProducts(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="uppercase min-w-[140px]">Product</TableHead>
                    <TableHead className="uppercase min-w-[100px] hidden sm:table-cell">Category</TableHead>
                    <TableHead className="uppercase min-w-[100px]">Stock</TableHead>
                    <TableHead className="uppercase min-w-[90px] hidden md:table-cell">Selling Price</TableHead>
                    <TableHead className="uppercase min-w-[90px]">Status</TableHead>
                    <TableHead className="text-right uppercase min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading inventory...
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product)
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedProducts.has(product.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedProducts)
                                if (checked) {
                                  newSelected.add(product.id)
                                } else {
                                  newSelected.delete(product.id)
                                }
                                setSelectedProducts(newSelected)
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground">{getSupplierName(product.supplier_id)}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {editingCategory === product.id ? (
                              <Select
                                value={product.category}
                                onValueChange={(value) => handleCategoryUpdate(product.id, value)}
                                onOpenChange={(open) => {
                                  if (!open) setEditingCategory(null)
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.filter(cat => cat !== "All").map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => setEditingCategory(product.id)}
                              >
                                {product.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {product.stock_quantity} {product.unit}
                              </div>
                              <div className="text-sm text-muted-foreground">Min: {product.min_stock_level}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">KSh {Math.round(product.unit_price).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant} className="min-w-[100px] justify-center">
                              {stockStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedProduct(product)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {isOwner && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingProduct(product)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {isOwner && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                    </Card>
                  ))}
                </>
              ) : (
                filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product)
                  const isExpanded = expandedProducts.has(product.id)
                  return (
                    <Card key={product.id} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedProducts)
                              if (checked) {
                                newSelected.add(product.id)
                              } else {
                                newSelected.delete(product.id)
                              }
                              setSelectedProducts(newSelected)
                            }}
                          />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => toggleProduct(product.id)}>
                          {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      <div className="cursor-pointer" onClick={() => toggleProduct(product.id)}>
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.stock_quantity} {product.unit} • KSh {Math.round(product.unit_price).toLocaleString()}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Category & Supplier</div>
                            <div className="flex items-center gap-2 mb-1">
                              {editingCategory === product.id ? (
                                <Select
                                  value={product.category}
                                  onValueChange={(value) => handleCategoryUpdate(product.id, value)}
                                  onOpenChange={(open) => {
                                    if (!open) setEditingCategory(null)
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.filter(cat => cat !== "All").map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer hover:bg-muted transition-colors text-xs"
                                  onClick={() => setEditingCategory(product.id)}
                                >
                                  {product.category}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{getSupplierName(product.supplier_id)}</div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Stock Level</div>
                              <div className="text-sm font-medium">{product.stock_quantity} {product.unit}</div>
                              <div className="text-xs text-muted-foreground">Min: {product.min_stock_level}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Status</div>
                              <Badge variant={stockStatus.variant} className="w-fit">
                                {stockStatus.label}
                              </Badge>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Pricing</div>
                            <div className="text-sm">Selling Price: KSh {Math.round(product.unit_price).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Buying Price: KSh {Math.round(product.cost_price).toLocaleString()}</div>
                          </div>
                          
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" onClick={() => setSelectedProduct(product)} className="flex-1">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {isOwner && (
                              <Button variant="outline" size="sm" onClick={() => setEditingProduct(product)} className="flex-1">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            )}
                            {isOwner && (
                              <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)} className="flex-1">
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

            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No products found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {products.length === 0 ? "Start by adding your first product." : "Try adjusting your search or filter criteria."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Details Dialog */}
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Product Details - {selectedProduct?.name}</DialogTitle>
              <DialogDescription>
                Complete information for this product
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Basic Information</h4>
                    <p className="text-sm text-muted-foreground">Name: {selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">Category: {selectedProduct.category}</p>
                    <p className="text-sm text-muted-foreground">Unit: {selectedProduct.unit}</p>
                    {selectedProduct.description && (
                      <p className="text-sm text-muted-foreground">Description: {selectedProduct.description}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">Supplier & Pricing</h4>
                    <p className="text-sm text-muted-foreground">
                      Supplier: {getSupplierName(selectedProduct.supplier_id)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Buying Price: KSh {Math.round(selectedProduct.cost_price).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Selling Price: KSh {Math.round(selectedProduct.unit_price).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Stock Information</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border p-3 rounded">
                      <div className="text-lg font-bold">{selectedProduct.stock_quantity}</div>
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                    </div>
                    <div className="border p-3 rounded">
                      <div className="text-lg font-bold">{selectedProduct.min_stock_level}</div>
                      <p className="text-sm text-muted-foreground">Minimum Level</p>
                    </div>
                    <div className="border p-3 rounded">
                      <div className="text-lg font-bold">
                        {selectedProduct.stock_quantity <= selectedProduct.min_stock_level 
                          ? "Low Stock" 
                          : selectedProduct.stock_quantity === 0 
                            ? "Out of Stock" 
                            : "In Stock"}
                      </div>
                      <p className="text-sm text-muted-foreground">Status</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Stock Value:</span>
                    <span className="text-lg font-bold">
                      KSh {Math.round(selectedProduct.stock_quantity * selectedProduct.cost_price).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Potential Revenue:</span>
                    <span className="text-lg font-bold">
                      KSh {Math.round(selectedProduct.stock_quantity * selectedProduct.unit_price).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Category Update Dialog */}
        <Dialog open={showBulkCategoryDialog} onOpenChange={setShowBulkCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Category for Selected Products</DialogTitle>
              <DialogDescription>
                Are you sure you want to update the category for {selectedProducts.size} selected products? This action will immediately update all selected products in the database.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="bulkCategory" className="text-sm font-medium">
                  New Category
                </label>
                <Select value={bulkCategoryUpdate} onValueChange={setBulkCategoryUpdate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat !== "All").map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {bulkCategoryUpdate && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>Confirmation:</strong> This will update {selectedProducts.size} products to the category <strong>"{bulkCategoryUpdate}"</strong>.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkCategoryDialog(false)
                    setBulkCategoryUpdate("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkCategoryUpdate}
                  disabled={!bulkCategoryUpdate}
                  variant="default"
                >
                  Yes, Update {selectedProducts.size} Products
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDialog />
      </div>
    </DashboardLayout>
  )
}

export default function InventoryPage() {
  return (
    <ProtectedRoute allowedRoles={['owner', 'employee']}>
      <InventoryDateFilterProvider>
        <InventoryContent />
      </InventoryDateFilterProvider>
    </ProtectedRoute>
  )
}
