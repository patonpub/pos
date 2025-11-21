"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { createSupplier, updateSupplier } from "@/lib/database"
import type { Supplier } from "@/lib/database-types"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface AddSupplierFormProps {
  supplier?: Supplier | null
  onClose: () => void
  onSuccess?: () => void
}

export function AddSupplierForm({ supplier, onClose, onSuccess }: AddSupplierFormProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
      })
    }
  }, [supplier])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      // Convert empty strings to null for optional fields
      const sanitizedData = {
        ...formData,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
      }

      if (supplier) {
        await updateSupplier(supplier.id, sanitizedData)
        toast.success("Supplier updated successfully!")
      } else {
        await createSupplier(sanitizedData)
        toast.success("Supplier added successfully!")
      }
      
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Error saving supplier:", error)
      toast.error(`Failed to ${supplier ? 'update' : 'add'} supplier. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Required Fields */}
      <div className="space-y-2">
        <Label htmlFor="name">Supplier Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter supplier name"
          required
        />
      </div>

      {/* Optional Fields - Always visible on desktop, collapsible on mobile */}
      <div className="space-y-2">
        {/* Desktop: Always show */}
        <div className="hidden md:block space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => handleChange("contact_person", e.target.value)}
                placeholder="Enter contact person name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Enter supplier address"
              rows={3}
            />
          </div>
        </div>

        {/* Mobile: Collapsible Advanced Options */}
        <div className="md:hidden">
          <div className="border">
            <button
              type="button"
              className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="font-medium">Advanced</span>
              <Plus className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-45' : ''}`} />
            </button>
            
            {showAdvanced && (
              <div className="p-3 border-t space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_person-mobile">Contact Person</Label>
                  <Input
                    id="contact_person-mobile"
                    value={formData.contact_person}
                    onChange={(e) => handleChange("contact_person", e.target.value)}
                    placeholder="Enter contact person name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-mobile">Phone Number</Label>
                  <Input
                    id="phone-mobile"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-mobile">Email Address</Label>
                  <Input
                    id="email-mobile"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address-mobile">Address</Label>
                  <Textarea
                    id="address-mobile"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Enter supplier address"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : (supplier ? "Update Supplier" : "Add Supplier")}
        </Button>
      </div>
    </form>
  )
}
