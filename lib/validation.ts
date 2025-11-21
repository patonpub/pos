import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  category: z.string().min(1, 'Category is required'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  cost_price: z.number().min(0, 'Cost price must be positive'),
  stock_quantity: z.number().min(0, 'Stock quantity must be non-negative'),
  min_stock_level: z.number().min(0, 'Min stock level must be non-negative'),
  unit: z.enum(['pieces', 'packs'], { required_error: 'Unit is required' }),
  supplier_id: z.string().uuid().nullable(),
})

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  contact_person: z.string().max(255).nullable(),
  phone: z.string().max(20).nullable(),
  email: z.string().email('Invalid email').or(z.literal('')).nullable(),
  address: z.string().max(500).nullable(),
})

export const saleSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(255),
  customer_phone: z.string().max(20).nullable(),
  total_amount: z.number().min(0, 'Total amount must be positive'),
  tax_amount: z.number().min(0, 'Tax amount must be non-negative').default(0),
  payment_method: z.enum(['cash', 'mpesa']),
  status: z.enum(['completed', 'pending', 'cancelled']).default('completed'),
  user_id: z.string().uuid(),
})

export const saleItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  total_price: z.number().min(0, 'Total price must be positive'),
})

export const purchaseSchema = z.object({
  supplier_id: z.string().uuid(),
  total_amount: z.number().min(0, 'Total amount must be positive'),
  status: z.enum(['completed', 'pending', 'cancelled']).default('pending'),
  user_id: z.string().uuid(),
})

export const purchaseItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  total_price: z.number().min(0, 'Total price must be positive'),
})

export const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required').max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  user_id: z.string().uuid(),
})

export const assetSchema = z.object({
  name: z.string().min(1, 'Asset name is required').max(255),
  description: z.string().max(500).nullable(),
  purchase_price: z.number().min(0.01, 'Purchase price must be greater than 0'),
  current_value: z.number().min(0, 'Current value must be non-negative'),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  user_id: z.string().uuid(),
})

export const debtorSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(255),
  customer_phone: z.string().max(20).nullable(),
  room_number: z.string().max(50).nullable(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  status: z.enum(['pending', 'paid', 'overdue']).default('pending'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  user_id: z.string().uuid(),
})

export const breakageSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason is required').max(500),
  cost: z.number().min(0, 'Cost must be non-negative'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  user_id: z.string().uuid(),
})