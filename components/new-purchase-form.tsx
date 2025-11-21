"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, Plus, Minus, Trash2, ShoppingBag, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getProducts, getSuppliers, createPurchase, updatePurchase, createProduct } from "@/lib/database"
import type { Product, Supplier, PurchaseWithItems } from "@/lib/database-types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"

interface NewPurchaseFormProps {
  onClose: () => void
  initialData?: PurchaseWithItems
  reorderProduct?: string
}


interface PurchaseItem {
  id: string
  name: string
  unitCost: number
  quantity: number
  totalCost: number
  unit: string
}

export function NewPurchaseForm({ onClose, initialData, reorderProduct }: NewPurchaseFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [supplier, setSupplier] = useState(initialData?.supplier_id || "")
  const [purchaseDate, setPurchaseDate] = useState<Date>(initialData ? new Date(initialData.created_at) : new Date())
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false)
  const [newProductData, setNewProductData] = useState({
    name: "",
    category: "",
    unitPrice: "",
    costPrice: "",
    stockQuantity: "",
    minStockLevel: "",
    unit: "pieces",
  })
  const [creatingProduct, setCreatingProduct] = useState(false)
  
  const isEditing = !!initialData

  const categories = ["Beverages", "Snacks", "Dairy", "Household", "Grains", "Canned Goods", "Fresh Produce", "Meat", "Electronics", "Stationery"]
  const units = ["pieces", "packs"]

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (initialData?.purchase_items) {
      const initialItems: PurchaseItem[] = initialData.purchase_items.map(item => ({
        id: item.product_id,
        name: item.products?.name || 'Unknown Product',
        unitCost: item.unit_price,
        quantity: item.quantity,
        totalCost: item.total_price,
        unit: item.products?.unit || 'pcs'
      }))
      setItems(initialItems)
    }
  }, [initialData])

  // Handle reorder product
  useEffect(() => {
    if (reorderProduct && products.length > 0 && items.length === 0) {
      const product = products.find(p => p.name === reorderProduct)
      if (product) {
        const newItem: PurchaseItem = {
          id: product.id,
          name: product.name,
          unitCost: product.cost_price,
          quantity: Math.max(product.min_stock_level - product.stock_quantity, 1),
          totalCost: product.cost_price * Math.max(product.min_stock_level - product.stock_quantity, 1),
          unit: product.unit || 'pieces'
        }
        setItems([newItem])
        setSearchTerm(product.name) // Also set search term to show the product
      }
    }
  }, [reorderProduct, products, items.length])

  const loadData = async () => {
    try {
      const [productsData, suppliersData] = await Promise.all([
        getProducts(),
        getSuppliers()
      ])
      setProducts(productsData)
      setSuppliers(suppliersData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter products based on search
  const filteredProducts = products.filter(
    (product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const addToOrder = (product: Product) => {
    const existingItem = items.find((item) => item.id === product.id)

    if (existingItem) {
      setItems(
        items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, totalCost: (item.quantity + 1) * item.unitCost }
            : item,
        ),
      )
    } else {
      setItems([
        ...items,
        {
          id: product.id,
          name: product.name,
          unitCost: product.cost_price,
          quantity: 1,
          totalCost: product.cost_price,
          unit: product.unit,
        },
      ])
    }
  }

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setItems(items.filter((item) => item.id !== id))
    } else {
      setItems(
        items.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity, totalCost: newQuantity * item.unitCost } : item,
        ),
      )
    }
  }

  const updateUnitCost = (id: string, newUnitCost: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, unitCost: newUnitCost, totalCost: item.quantity * newUnitCost } : item,
      ),
    )
  }

  const removeFromOrder = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleCreateProduct = async () => {
    if (!newProductData.name || !newProductData.category || !newProductData.unitPrice || !newProductData.costPrice) {
      toast.error("Please fill in all required fields")
      return
    }

    setCreatingProduct(true)
    try {
      const product = await createProduct({
        name: newProductData.name,
        category: newProductData.category,
        unit_price: parseFloat(newProductData.unitPrice),
        cost_price: parseFloat(newProductData.costPrice),
        stock_quantity: parseInt(newProductData.stockQuantity) || 0,
        min_stock_level: parseInt(newProductData.minStockLevel) || 0,
        unit: newProductData.unit,
        supplier_id: supplier || null,
      })

      // Add new product to products list
      setProducts(prev => [...prev, product])
      
      // Add to purchase items
      addToOrder(product)
      
      // Reset and close dialog
      setNewProductData({
        name: "",
        category: "",
        unitPrice: "",
        costPrice: "",
        stockQuantity: "",
        minStockLevel: "",
        unit: "pieces",
      })
      setIsNewProductDialogOpen(false)
      toast.success("Product created and added to purchase!")
    } catch (error) {
      console.error("Error creating product:", error)
      toast.error("Failed to create product")
    } finally {
      setCreatingProduct(false)
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0 || !supplier || submitting) return

    try {
      setSubmitting(true)
      
      const selectedSupplier = suppliers.find(s => s.id === supplier)
      if (!selectedSupplier) return

      const purchaseData = {
        supplier_id: supplier,
        total_amount: totalAmount,
        status: (initialData?.status || 'completed') as 'pending' | 'completed' | 'cancelled'
      }

      const purchaseItems = items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.unitCost,
        total_price: item.totalCost
      }))

      if (isEditing && initialData) {
        await updatePurchase(initialData.id, purchaseData, purchaseItems)
      } else {
        await createPurchase(purchaseData, purchaseItems)
      }
      
      onClose()
    } catch (error) {
      console.error(isEditing ? 'Error updating purchase:' : 'Error creating purchase:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Product Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isEditing ? 'Edit Products' : 'Add Products'}</CardTitle>
                <CardDescription>{isEditing ? 'Modify products in the purchase order' : 'Search and add products to the purchase order'}</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewProductData({
                    name: "",
                    category: "",
                    unitPrice: "",
                    costPrice: "",
                    stockQuantity: "",
                    minStockLevel: "",
                    unit: "pieces",
                  })
                  setIsNewProductDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Product
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Add New Product Button */}
              {searchTerm && filteredProducts.length === 0 && (
                <div className="p-3 border border-dashed border-muted-foreground/50 rounded-lg bg-muted/20">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      No products found for &quot;{searchTerm}&quot;
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewProductData(prev => ({ ...prev, name: searchTerm }))
                        setIsNewProductDialogOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create &quot;{searchTerm}&quot;
                    </Button>
                  </div>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                    onClick={() => addToOrder(product)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        KSh {Math.round(product.cost_price).toLocaleString()}/{product.unit}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>

              {loading && (
                <div className="text-center py-4 space-y-2">
                  Loading products...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Items - Only show when there are items */}
        {items.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Items ({items.length})</CardTitle>
              <CardDescription>Review quantities and costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">{item.name}</div>
                        <Button size="sm" variant="ghost" onClick={() => removeFromOrder(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <div className="flex items-center gap-1 mt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                              className="text-center h-7 text-sm"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Unit Cost</Label>
                          <Input
                            type="number"
                            step="1"
                            value={item.unitCost}
                            onChange={(e) => updateUnitCost(item.id, Number(e.target.value))}
                            className="h-7 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Total</Label>
                          <div className="h-7 flex items-center text-sm font-medium mt-1">
                            KSh {Math.round(item.totalCost).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>KSh {Math.round(totalAmount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Purchase Order Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}</CardTitle>
            <CardDescription>Supplier and order details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Select value={supplier} onValueChange={setSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {sup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Purchase Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !purchaseDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {purchaseDate ? format(purchaseDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={purchaseDate}
                      onSelect={(date) => date && setPurchaseDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or instructions"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={items.length === 0 || !supplier || submitting}>
                {submitting 
                  ? (isEditing ? "Updating..." : "Creating...") 
                  : `${isEditing ? 'Update' : 'Create'} Purchase Order - KSh ${Math.round(totalAmount).toLocaleString()}`
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>

      {/* New Product Dialog */}
      <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your inventory and include it in this purchase.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={newProductData.name}
                onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="productCategory">Category *</Label>
              <Select 
                value={newProductData.category} 
                onValueChange={(value) => setNewProductData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
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
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label htmlFor="productUnit">Unit</Label>
              <Select 
                value={newProductData.unit} 
                onValueChange={(value) => setNewProductData(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productUnitPrice">Selling Price *</Label>
                <Input
                  id="productUnitPrice"
                  type="number"
                  step="1"
                  value={newProductData.unitPrice}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, unitPrice: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productCostPrice">Buying Price *</Label>
                <Input
                  id="productCostPrice"
                  type="number"
                  step="1"
                  value={newProductData.costPrice}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, costPrice: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {/* Stock Quantities */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productStock">Initial Stock</Label>
                <Input
                  id="productStock"
                  type="number"
                  value={newProductData.stockQuantity}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, stockQuantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productMinStock">Min Stock Level</Label>
                <Input
                  id="productMinStock"
                  type="number"
                  value={newProductData.minStockLevel}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, minStockLevel: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsNewProductDialogOpen(false)}
                disabled={creatingProduct}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateProduct}
                disabled={creatingProduct || !newProductData.name || !newProductData.category || !newProductData.unitPrice || !newProductData.costPrice}
              >
                {creatingProduct ? "Creating..." : "Create & Add to Purchase"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
