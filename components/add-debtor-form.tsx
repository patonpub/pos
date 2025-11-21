"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Trash2, Search } from "lucide-react"
import { createDebtor, updateDebtor, getProducts, syncDebtorItemsToSaleItems } from "@/lib/database"
import type { Debtor, DebtorWithItems, Product, DebtorItem } from "@/lib/database-types"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface AddDebtorFormProps {
  debtor?: DebtorWithItems | null
  onClose: () => void
  onSuccess?: () => void
}

interface CartItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
  totalPrice: number
  unit: string
}

export function AddDebtorForm({ debtor, onClose, onSuccess }: AddDebtorFormProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    room_number: "",
    due_date: "",
    status: "pending" as const,
  })
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadProducts()
    if (debtor) {
      setFormData({
        customer_name: debtor.customer_name,
        customer_phone: debtor.customer_phone || "",
        room_number: debtor.room_number || "",
        due_date: debtor.due_date.split('T')[0], // Convert to YYYY-MM-DD format
        status: debtor.status as "pending" | "paid" | "overdue",
      })
      
      // Load existing items into cart
      if (debtor.debtor_items) {
        const cartItems: CartItem[] = debtor.debtor_items.map(item => ({
          id: item.product_id,
          name: item.products.name,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          totalPrice: item.total_price,
          unit: item.products.unit,
        }))
        setCart(cartItems)
      }
    }
  }, [debtor])

  const loadProducts = async () => {
    try {
      const productsData = await getProducts()
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Failed to load products')
    }
  }

  // Cart management functions
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        unitPrice: product.unit_price,
        quantity: 1,
        totalPrice: product.unit_price,
        unit: product.unit,
      }
      setCart(prev => [...prev, newItem])
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(prev => prev.map(item => 
      item.id === productId 
        ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
        : item
    ))
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (cart.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    setIsLoading(true)
    try {
      const debtorData = {
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim() || null,
        room_number: formData.room_number.trim() || null,
        amount: totalAmount,
        due_date: formData.due_date,
        status: formData.status,
        user_id: user.id,
      }

      const debtorItems = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
      }))

      if (debtor) {
        // Update debtor basic info
        await updateDebtor(debtor.id, debtorData)
        
        // Delete existing items and recreate them
        const { supabase } = await import('@/lib/supabase')
        await supabase.from('debtor_items').delete().eq('debtor_id', debtor.id)
        
        // Insert new items
        if (debtorItems.length > 0) {
          const itemsWithDebtorId = debtorItems.map(item => ({
            ...item,
            debtor_id: debtor.id
          }))
          await supabase.from('debtor_items').insert(itemsWithDebtorId)
        }
        
        // Sync changes back to sale if debtor is linked to a sale
        if (debtor.sale_id) {
          await syncDebtorItemsToSaleItems(debtor.id)
        }
        
        toast.success("Debtor updated successfully!")
      } else {
        await createDebtor(debtorData, debtorItems)
        toast.success("Debtor added successfully!")
      }
      
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Error saving debtor:", error)
      toast.error(`Failed to ${debtor ? 'update' : 'add'} debtor. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Set default due date to same day
  useEffect(() => {
    if (!debtor && !formData.due_date) {
      const defaultDate = new Date()
      const dateStr = `${defaultDate.getFullYear()}-${(defaultDate.getMonth() + 1).toString().padStart(2, '0')}-${defaultDate.getDate().toString().padStart(2, '0')}`
      setFormData(prev => ({ 
        ...prev, 
        due_date: dateStr
      }))
    }
  }, [debtor, formData.due_date])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer Name *</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => handleChange("customer_name", e.target.value)}
              placeholder="Enter customer name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_phone">Phone Number</Label>
            <Input
              id="customer_phone"
              value={formData.customer_phone}
              onChange={(e) => handleChange("customer_phone", e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="room_number">Room Number</Label>
            <Input
              id="room_number"
              value={formData.room_number}
              onChange={(e) => handleChange("room_number", e.target.value)}
              placeholder="Enter room number"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange("due_date", e.target.value)}
            required
            className="w-full md:w-auto"
          />
        </div>
      </div>

      {/* Item Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Items Owed</h3>
        
        {/* Product Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Products</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for products to add..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Product List */}
        {searchTerm && (
          <Card>
            <CardContent className="p-4">
              <div className="max-h-40 overflow-y-auto space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => {
                      addToCart(product)
                      setSearchTerm("")
                    }}
                  >
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        KSh {product.unit_price.toFixed(2)} per {product.unit}
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No products found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cart Items */}
        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selected Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      KSh {item.unitPrice.toFixed(2)} per {item.unit}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-medium">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-right min-w-[80px]">
                      <div className="font-medium">KSh {item.totalPrice.toFixed(2)}</div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t font-semibold">
                <span>Total Amount:</span>
                <span>KSh {totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {cart.length === 0 && (
          <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
            No items added yet. Search for products above to add them.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || cart.length === 0}>
          {isLoading ? "Saving..." : (debtor ? "Update Debtor" : "Add Debtor")}
        </Button>
      </div>
    </form>
  )
}