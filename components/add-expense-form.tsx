"use client"

import type React from "react"

import { useForm } from "react-hook-form"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createExpense } from "@/lib/database"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { expenseSchema } from "@/lib/validation"

interface AddExpenseFormProps {
  onClose: () => void
  onSuccess?: () => void
}

const categories = ["Rent", "Utilities", "Supplies", "Marketing", "Maintenance", "Transportation", "Insurance", "Equipment", "Salaries", "Other"]

const formSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
})

type FormData = z.infer<typeof formSchema>

export function AddExpenseForm({ onClose, onSuccess }: AddExpenseFormProps) {
  const { user } = useAuth()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      category: "",
      date: (() => {
        const today = new Date()
        return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
      })(), // Default to today
    },
  })

  const watchedCategory = watch("category")

  const onSubmit = async (data: FormData) => {
    if (!user) return

    try {
      await createExpense({
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date,
        user_id: user.id,
      })
      
      toast.success("Expense added successfully!")
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Error adding expense:", error)
      toast.error("Failed to add expense. Please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Required Fields */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          {...register("description")}
          placeholder="Enter expense description"
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            {...register("amount", { valueAsNumber: true })}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-sm text-red-600">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={watchedCategory} onValueChange={(value) => setValue("category", value)}>
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
          {errors.category && (
            <p className="text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>
      </div>

      {/* Date Field - Always visible on desktop, collapsible on mobile */}
      <div className="space-y-2">
        {/* Desktop: Always show */}
        <div className="hidden md:block">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
            />
            {errors.date && (
              <p className="text-sm text-red-600">{errors.date.message}</p>
            )}
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
                  <Label htmlFor="date-mobile">Date</Label>
                  <Input
                    id="date-mobile"
                    type="date"
                    {...register("date")}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-600">{errors.date.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Expense"}
        </Button>
      </div>
    </form>
  )
}