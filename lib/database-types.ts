export interface Product {
  id: string
  name: string
  category: string
  unit_price: number
  cost_price: number
  stock_quantity: number
  min_stock_level: number
  unit: string
  supplier_id: string | null
  barcode: string | null
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  sale_number: string
  customer_name: string
  customer_phone: string | null
  total_amount: number
  tax_amount: number
  payment_method: 'cash' | 'mpesa'
  status: 'completed' | 'pending' | 'cancelled'
  user_id: string
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface Purchase {
  id: string
  purchase_number: string
  supplier_id: string
  total_amount: number
  status: 'completed' | 'pending' | 'cancelled'
  user_id: string
  created_at: string
  updated_at: string
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  name: string
  description: string | null
  category: string
  serial_number: string | null
  purchase_price: number
  current_value: number
  purchase_date: string
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  location: string | null
  vendor: string | null
  warranty_expiry: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Debtor {
  id: string
  customer_name: string
  customer_phone: string | null
  room_number: string | null
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  due_date: string
  sale_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface DebtorItem {
  id: string
  debtor_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface Breakage {
  id: string
  product_id: string
  quantity: number
  reason: string
  cost: number
  date: string
  user_id: string
  created_at: string
  status: 'pending' | 'approved' | 'investigating' | 'rejected'
  category: string
  location: string | null
  reported_by: string
  updated_at: string
}

export interface DailyFloat {
  id: string
  date: string
  cash_float: number
  mpesa_float: number
  set_by: string | null
  created_at: string
  updated_at: string
}

export interface BusinessSettings {
  id: string
  business_name: string
  address: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  tax_id: string | null
  registration_number: string | null
  footer_message: string | null
  created_at: string
  updated_at: string
}

export interface SaleWithItems extends Sale {
  sale_items: (SaleItem & {
    products: Pick<Product, 'name'>
  })[]
  user_profiles?: {
    email: string
  }
}

export interface PurchaseWithItems extends Purchase {
  purchase_items: (PurchaseItem & {
    products: Pick<Product, 'name'>
  })[]
  suppliers: Pick<Supplier, 'name'>
}

export interface DebtorWithItems extends Debtor {
  debtor_items: (DebtorItem & {
    products: Pick<Product, 'name' | 'unit'>
  })[]
}