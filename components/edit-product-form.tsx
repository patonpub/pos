"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateProduct, getSuppliers } from "@/lib/database"
import type { Product, Supplier } from "@/lib/database-types"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { PRODUCT_CATEGORIES } from "@/lib/constants"

interface EditProductFormProps {
  product: Product
  onClose: () => void
  onSuccess?: () => void
}

const units = ["pieces", "packs"]

export function EditProductForm({ product, onClose, onSuccess }: EditProductFormProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: product.name,
    category: product.category,
    supplier_id: product.supplier_id || "",
    unitPrice: product.unit_price.toString(),
    costPrice: product.cost_price.toString(),
    stockQuantity: product.stock_quantity.toString(),
    minStockLevel: product.min_stock_level.toString(),
    unit: product.unit,
  })
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)

  const categories = Array.from(PRODUCT_CATEGORIES)

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers()
      setSuppliers(data)
    } catch (error) {
      console.error("Failed to load suppliers:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      await updateProduct(product.id, {
        name: formData.name,
        category: formData.category,
        unit_price: parseFloat(formData.unitPrice),
        cost_price: parseFloat(formData.costPrice),
        stock_quantity: parseInt(formData.stockQuantity),
        min_stock_level: parseInt(formData.minStockLevel) || 0,
        unit: formData.unit,
        supplier_id: formData.supplier_id || null,
      })
      
      toast.success("Product updated successfully!")
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Failed to update product. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Product Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter product name"
          required
        />
      </div>

      <div className="flex gap-3">
        <div className="space-y-2 flex-1 relative">
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => handleChange("category", e.target.value)}
            onFocus={() => setShowCategorySuggestions(true)}
            onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
            placeholder="Enter or select category..."
            required
            autoComplete="off"
          />
          {showCategorySuggestions && categories.length > 0 && formData.category.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-auto">
              {categories
                .filter(category =>
                  category.toLowerCase().includes(formData.category.toLowerCase()) &&
                  category.toLowerCase() !== formData.category.toLowerCase()
                )
                .slice(0, 5)
                .map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted text-foreground text-sm"
                    onClick={() => {
                      handleChange("category", category)
                      setShowCategorySuggestions(false)
                    }}
                  >
                    {category}
                  </button>
                ))}
            </div>
          )}
          {showCategorySuggestions && categories.length > 0 && formData.category.length === 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-auto">
              <div className="px-3 py-2 text-sm text-muted-foreground font-medium">Existing categories:</div>
              {categories.slice(0, 5).map((category) => (
                <button
                  key={category}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted text-foreground text-sm"
                  onClick={() => {
                    handleChange("category", category)
                    setShowCategorySuggestions(false)
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 flex-1">
          <Label htmlFor="supplier">Supplier</Label>
          <Select value={formData.supplier_id} onValueChange={(value) => handleChange("supplier_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Selling Price *</Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            value={formData.unitPrice}
            onChange={(e) => handleChange("unitPrice", e.target.value)}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="costPrice">Buying Price *</Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            value={formData.costPrice}
            onChange={(e) => handleChange("costPrice", e.target.value)}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Select value={formData.unit} onValueChange={(value) => handleChange("unit", value)}>
            <SelectTrigger>
              <SelectValue />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stockQuantity">Current Stock *</Label>
          <Input
            id="stockQuantity"
            type="number"
            value={formData.stockQuantity}
            onChange={(e) => handleChange("stockQuantity", e.target.value)}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minStockLevel">Min Stock Level</Label>
          <Input
            id="minStockLevel"
            type="number"
            value={formData.minStockLevel}
            onChange={(e) => handleChange("minStockLevel", e.target.value)}
            placeholder="10"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Product"}
        </Button>
      </div>
    </form>
  )
}