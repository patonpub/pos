import { supabase, UserProfile } from './supabase'
import type {
  Product,
  Supplier,
  Sale,
  SaleItem,
  Purchase,
  PurchaseItem,
  Expense,
  Asset,
  Debtor,
  DebtorItem,
  DebtorWithItems,
  Breakage,
  DailyFloat,
  SaleWithItems,
  PurchaseWithItems,
  BusinessSettings,
} from './database-types'
import { savePendingSale, getCachedProducts } from './local-db'

// Products
export async function getProducts(startDate?: string, endDate?: string) {
  // Helper function to get cached products
  const getCached = async () => {
    console.log('Loading products from cache');
    const cachedProducts = await getCachedProducts();

    // Apply date filtering if needed (basic filtering on cached data)
    if (startDate || endDate) {
      return cachedProducts.filter(product => {
        const productDate = new Date(product.created_at).getTime();
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).getTime() : Infinity;
        return productDate >= start && productDate <= end;
      });
    }

    return cachedProducts;
  };

  // Check if we're offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (isOffline) {
    return await getCached();
  }

  // Try online operation, fall back to cache if it fails
  try {
    let query = supabase
      .from('products')
      .select('*')
      .limit(100000) // Prevent 1000 row default limit

    // Apply date filtering based on product creation date
    if (startDate && endDate) {
      const fromDate = `${startDate}T00:00:00.000Z`
      const toDate = `${endDate}T23:59:59.999Z`
      query = query.gte('created_at', fromDate).lte('created_at', toDate)
    } else if (startDate && !endDate) {
      const fromDate = `${startDate}T00:00:00.000Z`
      query = query.gte('created_at', fromDate)
    } else if (endDate && !startDate) {
      const toDate = `${endDate}T23:59:59.999Z`
      query = query.lte('created_at', toDate)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      // Check if it's a network error
      const errorMessage = error?.message || error?.toString() || '';
      const isNetworkError =
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Failed to fetch');

      if (isNetworkError) {
        console.warn('Network error detected, loading from cache:', error);
        return await getCached();
      }
      throw error;
    }

    return data as Product[]
  } catch (error: any) {
    // Check if it's a network-related error
    const errorMessage = error?.message || error?.toString() || '';
    const isNetworkError =
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Failed to fetch') ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT';

    if (isNetworkError) {
      console.warn('Network error detected, loading from cache:', error);
      return await getCached();
    }

    // If it's not a network error, throw it
    throw error;
  }
}

export async function getProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Product
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    if (error.code === '23503') {
      throw new Error('Cannot delete this product because it is referenced in sales records. Products that have been sold cannot be deleted to maintain data integrity.')
    }
    throw error
  }
}

export async function searchProducts(query: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')

  if (error) throw error
  return data as Product[]
}

export async function searchProductByBarcode(barcode: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    throw error
  }

  return data as Product | null
}

export async function getProductCategories() {
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .order('category')

  if (error) throw error

  // Extract unique categories and filter out null/undefined
  const uniqueCategories = [...new Set(data?.map(p => p.category).filter(Boolean) || [])]
  return uniqueCategories as string[]
}

// Suppliers
export async function getSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')

  if (error) throw error
  return data as Supplier[]
}

export async function createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(supplier)
    .select()
    .single()

  if (error) throw error
  return data as Supplier
}

export async function updateSupplier(id: string, updates: Partial<Supplier>) {
  const { data, error } = await supabase
    .from('suppliers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Supplier
}

export async function deleteSupplier(id: string) {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Debtor Management Functions
export async function createDebtorFromSale(saleId: string, userId: string) {
  // Get the sale with items
  const sale = await getSale(saleId)
  
  // Validate that sale has positive amount
  if (sale.total_amount <= 0) {
    throw new Error('Cannot create debtor for sale with zero or negative amount')
  }
  
  // Create debtor record
  const debtorData = {
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone,
    amount: Math.max(0.01, sale.total_amount), // Ensure minimum positive amount
    due_date: new Date().toISOString().split('T')[0], // Same day
    status: 'pending' as const,
    sale_id: saleId,
    user_id: userId,
    room_number: null
  }

  // Create debtor items
  const debtorItems = sale.sale_items.map(item => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price
  }))

  const debtor = await createDebtor(debtorData, debtorItems)
  return debtor
}

export async function updateDebtorFromSale(saleId: string) {
  // Get the debtor linked to this sale
  const { data: debtor, error: debtorError } = await supabase
    .from('debtors')
    .select('id')
    .eq('sale_id', saleId)
    .single()

  if (debtorError || !debtor) return

  // Get the updated sale
  const sale = await getSale(saleId)

  // Update debtor basic info
  await updateDebtor(debtor.id, {
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone,
    amount: Math.max(0.01, sale.total_amount) // Ensure minimum positive amount
  })

  // Delete existing debtor items
  const { error: deleteError } = await supabase
    .from('debtor_items')
    .delete()
    .eq('debtor_id', debtor.id)

  if (deleteError) throw deleteError

  // Create new debtor items
  const debtorItems = sale.sale_items.map(item => ({
    debtor_id: debtor.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price
  }))

  if (debtorItems.length > 0) {
    const { error: insertError } = await supabase
      .from('debtor_items')
      .insert(debtorItems)

    if (insertError) throw insertError
  }
}

export async function removeDebtorFromSale(saleId: string) {
  const { error } = await supabase
    .from('debtors')
    .delete()
    .eq('sale_id', saleId)

  if (error) throw error
}

export async function restoreStockForCancelledSale(saleId: string) {
  // Get sale items
  const { data: saleItems, error } = await supabase
    .from('sale_items')
    .select('product_id, quantity')
    .eq('sale_id', saleId)

  if (error) throw error

  // Restore stock for each item
  for (const item of saleItems || []) {
    const { error: stockError } = await supabase.rpc('update_product_stock', {
      product_id: item.product_id,
      quantity_change: item.quantity
    })
    if (stockError) throw stockError
  }
}

// Sales
export async function getSales(startDate?: string, endDate?: string) {
  let query = supabase
    .from('sales')
    .select(`
      *,
      sale_items (
        *,
        products (name)
      ),
      user_profiles (email)
    `)
    .limit(100000) // Prevent 1000 row default limit

  // Apply date filtering based on sales creation date
  if (startDate && endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.gte('created_at', fromDate).lte('created_at', toDate)
  } else if (startDate && !endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    query = query.gte('created_at', fromDate)
  } else if (endDate && !startDate) {
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.lte('created_at', toDate)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return data as SaleWithItems[]
}

export async function createSale(sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>, items: Omit<SaleItem, 'id' | 'sale_id' | 'created_at'>[]) {
  // Helper function to save sale offline
  const saveOffline = async () => {
    console.log('Offline mode: saving sale to local database');

    const localId = await savePendingSale(sale, items);

    // Return a mock Sale object for UI consistency
    const mockSale: Sale = {
      id: localId,
      sale_number: `PENDING-${localId.substring(0, 8)}`,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      total_amount: sale.total_amount,
      tax_amount: sale.tax_amount,
      payment_method: sale.payment_method,
      status: sale.status,
      user_id: sale.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return mockSale;
  };

  // Check if we're definitely offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (isOffline) {
    return await saveOffline();
  }

  // Try online operation, fall back to offline if it fails
  try {
    // Generate sale number if not provided
    const saleWithNumber = {
      ...sale,
      sale_number: sale.sale_number || await generateSaleNumber()
    }

    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert(saleWithNumber)
      .select()
      .single()

    if (saleError) {
      // Check if it's a network error
      if (saleError.message?.includes('fetch') || saleError.message?.includes('network')) {
        console.warn('Network error detected, falling back to offline mode:', saleError);
        return await saveOffline();
      }
      throw saleError;
    }

    // Insert sale items
    const saleItems = items.map(item => ({
      ...item,
      sale_id: saleData.id
    }))

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems)

    if (itemsError) {
      if (itemsError.message?.includes('fetch') || itemsError.message?.includes('network')) {
        console.warn('Network error detected, falling back to offline mode:', itemsError);
        return await saveOffline();
      }
      throw itemsError;
    }

    // Update product stock only if sale is completed
    if (sale.status === 'completed') {
      for (const item of items) {
        const { error: stockError } = await supabase.rpc('update_product_stock', {
          product_id: item.product_id,
          quantity_change: -item.quantity
        })
        if (stockError) {
          if (stockError.message?.includes('fetch') || stockError.message?.includes('network')) {
            console.warn('Network error detected, falling back to offline mode:', stockError);
            return await saveOffline();
          }
          throw stockError;
        }
      }
    }

    // Create debtor record if sale is pending
    if (sale.status === 'pending') {
      try {
        // Only create debtor if sale has positive amount
        if (saleData.total_amount > 0) {
          await createDebtorFromSale(saleData.id, sale.user_id)
        } else {
          console.warn('Cannot create debtor for sale with zero amount')
        }
      } catch (error) {
        console.error('Failed to create debtor record:', error)
        // Don't fail the sale creation if debtor creation fails
      }
    }

    return saleData as Sale
  } catch (error: any) {
    // Check if it's a network-related error
    const errorMessage = error?.message || error?.toString() || '';
    const isNetworkError =
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Failed to fetch') ||
      error?.code === 'PGRST301' || // PostgREST network error
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT';

    if (isNetworkError) {
      console.warn('Network error detected, falling back to offline mode:', error);
      return await saveOffline();
    }

    // If it's not a network error, throw it
    throw error;
  }
}

async function generateSaleNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_sale_number')
  if (error) throw error
  return data
}

// Purchases
export async function getPurchases(startDate?: string, endDate?: string) {
  let query = supabase
    .from('purchases')
    .select(`
      *,
      suppliers (name),
      purchase_items (
        *,
        products (name)
      )
    `)
    .limit(100000) // Prevent 1000 row default limit

  // Apply date filtering based on purchase creation date
  if (startDate && endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.gte('created_at', fromDate).lte('created_at', toDate)
  } else if (startDate && !endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    query = query.gte('created_at', fromDate)
  } else if (endDate && !startDate) {
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.lte('created_at', toDate)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return data as PurchaseWithItems[]
}

export async function getPurchasesBySupplier(supplierId: string) {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      suppliers (name),
      purchase_items (
        *,
        products (name, unit)
      )
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as PurchaseWithItems[]
}

export async function createPurchase(purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>, items: Omit<PurchaseItem, 'id' | 'purchase_id' | 'created_at'>[]) {
  // Generate purchase number if not provided - using simple timestamp for now
  const purchaseWithNumber = {
    ...purchase,
    purchase_number: purchase.purchase_number || `PURCH-${Date.now().toString().slice(-6)}`
  }

  const { data: purchaseData, error: purchaseError } = await supabase
    .from('purchases')
    .insert(purchaseWithNumber)
    .select()
    .single()

  if (purchaseError) throw purchaseError

  const purchaseItems = items.map(item => ({
    ...item,
    purchase_id: purchaseData.id
  }))

  const { error: itemsError } = await supabase
    .from('purchase_items')
    .insert(purchaseItems)

  if (itemsError) throw itemsError

  // Update product stock if purchase is completed
  if (purchase.status === 'completed') {
    for (const item of items) {
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        product_id: item.product_id,
        quantity_change: item.quantity
      })
      if (stockError) throw stockError
    }
  }

  return purchaseData as Purchase
}

// Removed generatePurchaseNumber function due to database function issue
// Using timestamp-based numbering as temporary solution

export async function updatePurchase(id: string, updates: Partial<Purchase>) {
  const { data, error } = await supabase
    .from('purchases')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Purchase
}

export async function deletePurchase(id: string) {
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getSale(id: string) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items (
        *,
        products (name)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as SaleWithItems
}

export async function updateSale(id: string, updates: Partial<Sale>) {
  // Get current sale data first
  const currentSale = await getSale(id)
  const oldStatus = currentSale.status
  const newStatus = updates.status || oldStatus

  // Handle debtor management BEFORE updating the sale to avoid trigger conflicts
  try {
    if (oldStatus !== newStatus) {
      // Status changed from pending to non-pending: remove debtor first
      if (oldStatus === 'pending' && newStatus !== 'pending') {
        await removeDebtorFromSale(id)
      }
    }
  } catch (error) {
    console.error('Error removing debtor before sale update:', error)
  }

  // Update the sale
  const { data, error } = await supabase
    .from('sales')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Handle remaining status changes and debtor management AFTER sale update
  try {
    if (oldStatus !== newStatus) {
      // Status changed from non-pending to pending: create debtor
      if (oldStatus !== 'pending' && newStatus === 'pending') {
        // Only create debtor if sale has positive amount
        const finalAmount = data.total_amount
        if (finalAmount > 0) {
          await createDebtorFromSale(id, currentSale.user_id)
        } else {
          console.warn('Cannot create debtor for sale with zero amount')
        }
        
        // If changing from completed to pending, restore stock
        if (oldStatus === 'completed') {
          await restoreStockForCancelledSale(id)
        }
      }
      
      // Handle stock changes for non-pending status changes
      else if (oldStatus === 'pending' && newStatus !== 'pending') {
        // If changing to completed, deduct stock
        if (newStatus === 'completed') {
          for (const item of currentSale.sale_items) {
            const { error: stockError } = await supabase.rpc('update_product_stock', {
              product_id: item.product_id,
              quantity_change: -item.quantity
            })
            if (stockError) console.error('Stock update error:', stockError)
          }
        }
        
        // If changing to cancelled, restore stock
        else if (newStatus === 'cancelled') {
          await restoreStockForCancelledSale(id)
        }
      }
      
      // Handle direct status changes from completed
      else if (oldStatus === 'completed' && newStatus === 'cancelled') {
        // If changing directly from completed to cancelled, restore stock
        await restoreStockForCancelledSale(id)
      }
    }
    
    // If status stays pending but other details changed, update debtor
    else if (oldStatus === 'pending' && newStatus === 'pending') {
      if (updates.customer_name !== undefined || 
          updates.customer_phone !== undefined || 
          updates.total_amount !== undefined) {
        await updateDebtorFromSale(id)
      }
    }
  } catch (error) {
    console.error('Error managing debtor during sale update:', error)
    // Don't fail the sale update if debtor management fails
  }

  return data as Sale
}

export async function deleteSale(id: string) {
  // First restore stock for this sale
  await restoreStockForCancelledSale(id)

  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Sale Items Management
export async function updateSaleItems(saleId: string, newItems: Omit<SaleItem, 'id' | 'sale_id' | 'created_at'>[], oldItems: SaleItem[]) {
  // First, restore stock for old items
  for (const oldItem of oldItems) {
    const { error: stockError } = await supabase.rpc('update_product_stock', {
      product_id: oldItem.product_id,
      quantity_change: oldItem.quantity // Add back the quantity
    })
    if (stockError) throw stockError
  }

  // Delete all existing sale items for this sale
  const { error: deleteError } = await supabase
    .from('sale_items')
    .delete()
    .eq('sale_id', saleId)

  if (deleteError) throw deleteError

  // Insert new sale items
  if (newItems.length > 0) {
    const saleItems = newItems.map(item => ({
      ...item,
      sale_id: saleId
    }))

    const { error: insertError } = await supabase
      .from('sale_items')
      .insert(saleItems)

    if (insertError) throw insertError

    // Update stock for new items
    for (const newItem of newItems) {
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        product_id: newItem.product_id,
        quantity_change: -newItem.quantity // Subtract the new quantity
      })
      if (stockError) throw stockError
    }
  }
}

export async function getSaleItems(saleId: string) {
  const { data, error } = await supabase
    .from('sale_items')
    .select(`
      *,
      products (
        id,
        name,
        unit_price,
        stock_quantity,
        unit
      )
    `)
    .eq('sale_id', saleId)

  if (error) throw error
  return data
}

// Expenses (owner only)
export async function getExpenses(startDate?: string, endDate?: string) {
  let query = supabase
    .from('expenses')
    .select('*')
    .limit(100000) // Prevent 1000 row default limit

  // Apply date filtering based on expense date
  if (startDate && endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.gte('date', fromDate).lte('date', toDate)
  } else if (startDate && !endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    query = query.gte('date', fromDate)
  } else if (endDate && !startDate) {
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.lte('date', toDate)
  }

  query = query.order('date', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return data as Expense[]
}

export async function createExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()

  if (error) throw error
  return data as Expense
}

export async function updateExpense(id: string, updates: Partial<Expense>) {
  const { data, error } = await supabase
    .from('expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Assets (owner only)
export async function getAssets() {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('purchase_date', { ascending: false })

  if (error) throw error
  return data as Asset[]
}

export async function createAsset(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('assets')
    .insert(asset)
    .select()
    .single()

  if (error) throw error
  return data as Asset
}

export async function updateAsset(id: string, updates: Partial<Asset>) {
  const { data, error } = await supabase
    .from('assets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Asset
}

export async function deleteAsset(id: string) {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Debtors (owner only)
export async function getDebtors(startDate?: string, endDate?: string) {
  let query = supabase
    .from('debtors')
    .select(`
      *,
      debtor_items (
        *,
        products (name, unit)
      )
    `)
    .limit(100000) // Prevent 1000 row default limit

  // Apply date filtering based on debtor due date
  if (startDate && endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.gte('due_date', fromDate).lte('due_date', toDate)
  } else if (startDate && !endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    query = query.gte('due_date', fromDate)
  } else if (endDate && !startDate) {
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.lte('due_date', toDate)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return data as DebtorWithItems[]
}

export async function getDebtor(id: string) {
  const { data, error } = await supabase
    .from('debtors')
    .select(`
      *,
      debtor_items (
        *,
        products (name, unit)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as DebtorWithItems
}

export async function createDebtor(
  debtor: Omit<Debtor, 'id' | 'created_at' | 'updated_at'>, 
  items: Omit<DebtorItem, 'id' | 'debtor_id' | 'created_at'>[] = []
) {
  const { data: debtorData, error: debtorError } = await supabase
    .from('debtors')
    .insert(debtor)
    .select()
    .single()
  
  if (debtorError) throw debtorError

  // Insert debtor items if any provided
  if (items.length > 0) {
    const debtorItems = items.map(item => ({
      ...item,
      debtor_id: debtorData.id
    }))

    const { error: itemsError } = await supabase
      .from('debtor_items')
      .insert(debtorItems)

    if (itemsError) throw itemsError
  }

  return debtorData as Debtor
}

export async function updateDebtor(id: string, updates: Partial<Debtor>) {
  // Ensure amount is positive if being updated
  if (updates.amount !== undefined) {
    updates.amount = Math.max(0.01, updates.amount)
  }

  const { data, error } = await supabase
    .from('debtors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // If debtor has a linked sale, sync changes back to the sale
  if (data.sale_id) {
    try {
      const saleUpdates: Partial<Sale> = {}
      
      if (updates.customer_name !== undefined) {
        saleUpdates.customer_name = updates.customer_name
      }
      if (updates.customer_phone !== undefined) {
        saleUpdates.customer_phone = updates.customer_phone
      }
      if (updates.amount !== undefined) {
        saleUpdates.total_amount = updates.amount
      }

      if (Object.keys(saleUpdates).length > 0) {
        await supabase
          .from('sales')
          .update({ ...saleUpdates, updated_at: new Date().toISOString() })
          .eq('id', data.sale_id)
      }
    } catch (error) {
      console.error('Error syncing debtor changes back to sale:', error)
      // Don't fail the debtor update if sale sync fails
    }
  }

  return data as Debtor
}

// Function to sync debtor items back to sale items
export async function syncDebtorItemsToSaleItems(debtorId: string) {
  // Get debtor with sale_id
  const { data: debtor, error: debtorError } = await supabase
    .from('debtors')
    .select('sale_id')
    .eq('id', debtorId)
    .single()

  if (debtorError || !debtor?.sale_id) return

  // Get the sale
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('status')
    .eq('id', debtor.sale_id)
    .single()

  if (saleError || sale?.status !== 'pending') return

  // Delete existing sale items
  await supabase
    .from('sale_items')
    .delete()
    .eq('sale_id', debtor.sale_id)

  // Get debtor items and recreate as sale items
  const { data: debtorItems, error: itemsError } = await supabase
    .from('debtor_items')
    .select('*')
    .eq('debtor_id', debtorId)

  if (itemsError) throw itemsError

  if (debtorItems && debtorItems.length > 0) {
    const saleItems = debtorItems.map(item => ({
      sale_id: debtor.sale_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }))

    await supabase
      .from('sale_items')
      .insert(saleItems)

    // Update sale total
    const newTotal = Math.max(0.01, debtorItems.reduce((sum, item) => sum + item.total_price, 0))
    await supabase
      .from('sales')
      .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', debtor.sale_id)

    // Update debtor amount to match
    await supabase
      .from('debtors')
      .update({ amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', debtorId)
  }
}

export async function deleteDebtor(id: string) {
  const { error } = await supabase
    .from('debtors')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Breakages
export async function getBreakages(startDate?: string, endDate?: string) {
  let query = supabase
    .from('breakages')
    .select(`
      *,
      products (name)
    `)
    .limit(100000) // Prevent 1000 row default limit

  // Apply date filtering based on breakage date
  if (startDate && endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.gte('date', fromDate).lte('date', toDate)
  } else if (startDate && !endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    query = query.gte('date', fromDate)
  } else if (endDate && !startDate) {
    const toDate = `${endDate}T23:59:59.999Z`
    query = query.lte('date', toDate)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createBreakage(breakage: Omit<Breakage, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('breakages')
    .insert(breakage)
    .select()
    .single()

  if (error) throw error

  // Only update product stock if breakage is approved
  if (breakage.status === 'approved') {
    const { error: stockError } = await supabase.rpc('update_product_stock', {
      product_id: breakage.product_id,
      quantity_change: -breakage.quantity
    })
    if (stockError) throw stockError
  }

  return data as Breakage
}

export async function updateBreakage(id: string, updates: Partial<Breakage>) {
  const { data: currentBreakage, error: fetchError } = await supabase
    .from('breakages')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('breakages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Handle stock updates when status changes
  if (updates.status && updates.status !== currentBreakage.status) {
    if (updates.status === 'approved' && currentBreakage.status !== 'approved') {
      // Deduct stock when approved
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        product_id: currentBreakage.product_id,
        quantity_change: -currentBreakage.quantity
      })
      if (stockError) throw stockError
    } else if (currentBreakage.status === 'approved' && updates.status !== 'approved') {
      // Restore stock when unapproved
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        product_id: currentBreakage.product_id,
        quantity_change: currentBreakage.quantity
      })
      if (stockError) throw stockError
    }
  }

  return data as Breakage
}

export async function deleteBreakage(id: string) {
  const { data: breakage, error: fetchError } = await supabase
    .from('breakages')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // Restore stock if breakage was approved
  if (breakage.status === 'approved') {
    const { error: stockError } = await supabase.rpc('update_product_stock', {
      product_id: breakage.product_id,
      quantity_change: breakage.quantity
    })
    if (stockError) throw stockError
  }

  const { error } = await supabase
    .from('breakages')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Reports
// New efficient report stats function using database aggregation
export async function getReportStatsOptimized(startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc('get_report_stats', {
    start_date: `${startDate}T00:00:00.000Z`,
    end_date: `${endDate}T23:59:59.999Z`
  })

  if (error) throw error

  if (!data || data.length === 0) {
    return {
      totalRevenue: 0,
      totalSales: 0,
      grossProfit: 0,
      totalCost: 0
    }
  }

  const stats = data[0]
  return {
    totalRevenue: Number(stats.total_revenue),
    totalSales: Number(stats.total_sales),
    grossProfit: Number(stats.gross_profit),
    totalCost: Number(stats.total_cost)
  }
}

// Get top products efficiently
export async function getTopProductsOptimized(startDate: string, endDate: string, limit: number = 10) {
  const { data, error } = await supabase.rpc('get_top_products', {
    start_date: `${startDate}T00:00:00.000Z`,
    end_date: `${endDate}T23:59:59.999Z`,
    limit_count: limit
  })

  if (error) throw error

  return (data || []).map((item: any) => ({
    name: item.product_name,
    sales: Number(item.units_sold),
    revenue: Number(item.revenue),
    profit: Number(item.profit)
  }))
}

// Get sales by category efficiently
export async function getSalesByCategoryOptimized(startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc('get_sales_by_category', {
    start_date: `${startDate}T00:00:00.000Z`,
    end_date: `${endDate}T23:59:59.999Z`
  })

  if (error) throw error

  return (data || []).map((item: any) => ({
    name: item.category,
    value: Number(item.revenue),
    percentage: Number(item.percentage)
  }))
}

// Get sales by date for charts
export async function getSalesByDateOptimized(startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc('get_sales_by_date', {
    start_date: `${startDate}T00:00:00.000Z`,
    end_date: `${endDate}T23:59:59.999Z`
  })

  if (error) throw error

  return (data || []).map((item: any) => ({
    date: item.sale_date,
    sales: Number(item.daily_revenue),
    profit: Number(item.daily_profit),
    count: Number(item.sale_count)
  }))
}

// Old function - kept for backward compatibility, but use optimized versions above
export async function getSalesReport(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items (
        *,
        products (name, category)
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('status', 'completed')
    .limit(100000) // Prevent 1000 row default limit

  if (error) throw error
  return data as SaleWithItems[]
}

export async function getInventoryReport() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('stock_quantity', { ascending: true })

  if (error) throw error
  return data as Product[]
}

export async function getDebtorStats(startDate?: string, endDate?: string) {
  // Set default date range handling
  let debtorQuery = supabase
    .from('debtors')
    .select('*')
    .limit(100000) // Prevent 1000 row default limit

  if (startDate && endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${endDate}T23:59:59.999Z`
    debtorQuery = debtorQuery.gte('due_date', fromDate).lte('due_date', toDate)
  } else if (startDate && !endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    debtorQuery = debtorQuery.gte('due_date', fromDate)
  } else if (endDate && !startDate) {
    const toDate = `${endDate}T23:59:59.999Z`
    debtorQuery = debtorQuery.lte('due_date', toDate)
  }

  const { data: debtors, error: debtorsError } = await debtorQuery

  if (debtorsError) throw debtorsError

  // Get current date in local timezone
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(today.getDate() + 3)

  // Process debtors to calculate overdue status and categorize
  const processedDebtors = (debtors || []).map(debtor => {
    // Parse date string properly to avoid timezone issues
    const dateParts = debtor.due_date.split('-')
    const dueDateOnly = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
    const daysPastDue = Math.floor((today.getTime() - dueDateOnly.getTime()) / (1000 * 60 * 60 * 24))
    
    let status = debtor.status
    if (status === 'pending' && daysPastDue > 0) {
      status = 'overdue'
    }
    
    const isDueSoon = status === 'pending' && dueDateOnly <= threeDaysFromNow && dueDateOnly >= today
    
    return { ...debtor, status, isDueSoon, daysPastDue }
  })

  // Calculate total debtors (count)
  const totalDebtors = processedDebtors.length

  // Calculate outstanding debtors (amount of unpaid debts)
  const outstandingDebtors = processedDebtors
    .filter(d => d.status !== 'paid')
    .reduce((sum, debtor) => sum + debtor.amount, 0)

  // Calculate overdue debtors (count of overdue debts)
  const overdueDebtors = processedDebtors.filter(d => d.status === 'overdue').length

  // Calculate due soon (count of debts due within 3 days)
  const dueSoon = processedDebtors.filter(d => d.isDueSoon).length

  return {
    totalDebtors,
    outstandingDebtors,
    overdueDebtors,
    dueSoon
  }
}

export async function getBreakageStats(startDate?: string, endDate?: string) {
  // Set default date range handling
  let breakageQuery = supabase
    .from('breakages')
    .select('*')
    .limit(100000) // Prevent 1000 row default limit

  if (startDate && endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${endDate}T23:59:59.999Z`
    breakageQuery = breakageQuery.gte('date', fromDate).lte('date', toDate)
  } else if (startDate && !endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    breakageQuery = breakageQuery.gte('date', fromDate)
  } else if (endDate && !startDate) {
    const toDate = `${endDate}T23:59:59.999Z`
    breakageQuery = breakageQuery.lte('date', toDate)
  }

  const { data: breakages, error: breakagesError } = await breakageQuery

  if (breakagesError) throw breakagesError

  // Calculate total breakages (count)
  const totalBreakages = breakages?.length || 0

  // Calculate total loss (sum of all breakage costs)
  const totalLoss = breakages?.reduce((sum, breakage) => sum + breakage.cost, 0) || 0

  // Calculate approved loss (sum of approved breakage costs)
  const approvedLoss = breakages?.filter(b => b.status === 'approved').reduce((sum, breakage) => sum + breakage.cost, 0) || 0

  // Calculate pending count (number of pending breakages)
  const pending = breakages?.filter(b => b.status === 'pending').length || 0

  return {
    totalBreakages,
    totalLoss,
    approvedLoss,
    pending
  }
}

export async function getPurchaseStats(startDate?: string, endDate?: string) {
  // Set default date range handling
  let purchaseQuery = supabase
    .from('purchases')
    .select(`
      total_amount,
      status,
      purchase_items (
        quantity,
        total_price,
        unit_price
      )
    `)
    .limit(100000) // Prevent 1000 row default limit

  if (startDate && endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${endDate}T23:59:59.999Z`
    purchaseQuery = purchaseQuery.gte('created_at', fromDate).lte('created_at', toDate)
  } else if (startDate && !endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    purchaseQuery = purchaseQuery.gte('created_at', fromDate)
  } else if (endDate && !startDate) {
    const toDate = `${endDate}T23:59:59.999Z`
    purchaseQuery = purchaseQuery.lte('created_at', toDate)
  }

  const { data: purchases, error: purchasesError} = await purchaseQuery

  if (purchasesError) throw purchasesError

  // Calculate total purchases (count)
  const totalPurchases = purchases?.length || 0

  // Calculate total value (sum of all purchase amounts)
  const totalValue = purchases?.reduce((sum, purchase) => sum + purchase.total_amount, 0) || 0

  // Calculate total items purchased (sum of all item quantities)
  const itemsPurchased = purchases?.reduce((sum, purchase) => {
    const itemCount = purchase.purchase_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0
    return sum + itemCount
  }, 0) || 0

  // Calculate total cost (same as total value - cost of all purchases)
  const totalCost = totalValue

  return {
    totalPurchases,
    totalValue,
    itemsPurchased,
    totalCost
  }
}

export async function getInventoryStats(startDate?: string, endDate?: string) {
  // Get all products for overall stats
  const { data: allProducts, error: allProductsError } = await supabase
    .from('products')
    .select('*')

  if (allProductsError) throw allProductsError

  // Get new products added in the date range
  let newProducts = []
  if (startDate || endDate) {
    let query = supabase
      .from('products')
      .select('*')

    if (startDate && endDate) {
      const fromDate = `${startDate}T00:00:00.000Z`
      const toDate = `${endDate}T23:59:59.999Z`
      query = query.gte('created_at', fromDate).lte('created_at', toDate)
    } else if (startDate && !endDate) {
      const fromDate = `${startDate}T00:00:00.000Z`
      query = query.gte('created_at', fromDate)
    } else if (endDate && !startDate) {
      const toDate = `${endDate}T23:59:59.999Z`
      query = query.lte('created_at', toDate)
    }

    const { data, error } = await query
    if (error) throw error
    newProducts = data || []
  } else {
    // If no date range, show all products as "new"
    newProducts = allProducts || []
  }

  // Calculate inventory value (cost_price * stock_quantity)
  const inventoryValue = (allProducts || []).reduce((sum, product) => 
    sum + (product.cost_price * product.stock_quantity), 0)

  // Calculate potential value (unit_price * stock_quantity)
  const potentialValue = (allProducts || []).reduce((sum, product) => 
    sum + (product.unit_price * product.stock_quantity), 0)

  // Total items count
  const totalItems = (allProducts || []).length

  // New products count (only affected by date filter)
  const newProductsCount = newProducts.length

  return {
    inventoryValue,
    potentialValue,
    totalItems,
    newProducts: newProductsCount
  }
}

// New efficient stats function using database aggregation
export async function getDashboardStatsOptimized(startDate?: string, endDate?: string) {
  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    start_date: startDate ? `${startDate}T00:00:00.000Z` : null,
    end_date: endDate ? `${endDate}T23:59:59.999Z` : null
  })

  if (error) throw error

  if (!data || data.length === 0) {
    return {
      totalRevenue: 0,
      totalSales: 0,
      totalDebtors: 0,
      totalProfit: 0,
      cashSales: 0,
      mpesaSales: 0,
      topProduct: 'No sales',
      topProductQuantity: 0
    }
  }

  const stats = data[0]
  return {
    totalRevenue: Number(stats.total_revenue),
    totalSales: Number(stats.total_sales),
    totalDebtors: Number(stats.total_debtors),
    totalProfit: Number(stats.total_profit),
    cashSales: Number(stats.cash_sales),
    mpesaSales: Number(stats.mpesa_sales),
    topProduct: stats.top_product_name,
    topProductQuantity: Number(stats.top_product_quantity)
  }
}

// Old function - kept for backward compatibility
export async function getDashboardStats(startDate?: string, endDate?: string) {
  // Build query for sales data - get count and aggregations separately for performance
  let salesCountQuery = supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  // Build query for sales data with items including cost_price for profit calculation and payment method
  let salesQuery = supabase
    .from('sales')
    .select(`
      total_amount,
      payment_method,
      sale_items (
        quantity,
        unit_price,
        products (
          name,
          cost_price
        )
      )
    `)
    .eq('status', 'completed')
    .limit(100000) // Set high limit to handle large datasets - prevents default 1000 limit

  // Apply date filters if provided
  if (startDate && endDate) {
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${endDate}T23:59:59.999Z`
    salesQuery = salesQuery.gte('created_at', fromDate).lte('created_at', toDate)
    salesCountQuery = salesCountQuery.gte('created_at', fromDate).lte('created_at', toDate)
  } else if (startDate && !endDate) {
    // If only start date is provided, use it as both start and end
    const fromDate = `${startDate}T00:00:00.000Z`
    const toDate = `${startDate}T23:59:59.999Z`
    salesQuery = salesQuery.gte('created_at', fromDate).lte('created_at', toDate)
    salesCountQuery = salesCountQuery.gte('created_at', fromDate).lte('created_at', toDate)
  }
  // If no dates provided, get all sales (no date filter)

  // Execute sales queries in parallel
  const [salesResult, countResult] = await Promise.all([
    salesQuery,
    salesCountQuery
  ])

  const { data: sales, error: salesError } = salesResult
  const { count: totalSalesCount, error: countError } = countResult

  if (salesError) throw salesError
  if (countError) throw countError

  // Get total debtors (outstanding debts)
  const { data: debtors, error: debtorsError } = await supabase
    .from('debtors')
    .select('amount')
    .neq('status', 'paid')
    .limit(100000) // Prevent 1000 row default limit

  if (debtorsError) throw debtorsError

  // Calculate metrics
  const totalRevenue = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
  const totalSales = totalSalesCount || 0 // Use the accurate count from the count query
  const totalDebtors = debtors?.reduce((sum, debtor) => sum + debtor.amount, 0) || 0

  // Calculate payment method breakdowns
  let cashSales = 0
  let mpesaSales = 0

  // Calculate total profit and top product by quantity sold
  let totalProfit = 0
  const productSales: { [key: string]: number } = {}

  if (sales && sales.length > 0) {
    sales.forEach(sale => {
      // Sum payment method amounts
      if (sale.payment_method === 'cash') {
        cashSales += sale.total_amount
      } else if (sale.payment_method === 'mpesa') {
        mpesaSales += sale.total_amount
      }

      if (sale.sale_items && Array.isArray(sale.sale_items)) {
        sale.sale_items.forEach(item => {
          if (item.products) {
            // Calculate profit for this item (selling price - cost price) * quantity
            const costPerItem = item.products.cost_price || 0
            const sellingPricePerItem = item.unit_price || 0
            const quantity = item.quantity || 0
            const itemProfit = (sellingPricePerItem - costPerItem) * quantity
            totalProfit += itemProfit

            // Track top product by quantity
            if (item.products.name) {
              const productName = item.products.name
              productSales[productName] = (productSales[productName] || 0) + quantity
            }
          }
        })
      }
    })
  }

  const topProduct = Object.keys(productSales).length > 0
    ? Object.entries(productSales).reduce(
        (top, [name, quantity]) =>
          quantity > top.quantity ? { name, quantity } : top,
        { name: '', quantity: 0 }
      )
    : { name: 'No sales', quantity: 0 }

  return {
    totalRevenue,
    totalSales,
    totalDebtors,
    totalProfit,
    cashSales,
    mpesaSales,
    topProduct: topProduct.name,
    topProductQuantity: topProduct.quantity
  }
}

// User Management (owner only)
export async function getUserProfiles() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as UserProfile[]
}

export async function createUserProfile(profile: Omit<UserProfile, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert(profile)
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}

export async function updateUserProfile(id: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}

export async function deleteUserProfile(id: string) {
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Bulk Delete Functions
export async function bulkDeleteProducts(ids: string[]) {
  if (ids.length === 0) return { deleted: 0, failed: 0, errors: [], failedIds: [] }

  const results = {
    deleted: 0,
    failed: 0,
    errors: [] as string[],
    failedIds: [] as string[]
  }

  // Try deleting individually to handle foreign key constraints
  for (const id of ids) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
      
      if (error) {
        results.failed++
        results.failedIds.push(id)
        if (error.code === '23503') {
          results.errors.push(`Product cannot be deleted because it is referenced in sales (ID: ${id})`)
        } else {
          results.errors.push(`${error.message} (ID: ${id})`)
        }
      } else {
        results.deleted++
      }
    } catch (err) {
      results.failed++
      results.failedIds.push(id)
      results.errors.push(`Unknown error occurred (ID: ${id})`)
    }
  }

  // Always return results, let the UI handle the messaging
  return results
}

export async function bulkDeleteSuppliers(ids: string[]) {
  if (ids.length === 0) return { deleted: 0, failed: 0, errors: [] }

  const results = {
    deleted: 0,
    failed: 0,
    errors: [] as string[]
  }

  // Try deleting individually to handle foreign key constraints
  for (const id of ids) {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
      
      if (error) {
        results.failed++
        if (error.code === '23503') {
          results.errors.push('Some suppliers cannot be deleted because they have associated products')
        } else {
          results.errors.push(error.message)
        }
      } else {
        results.deleted++
      }
    } catch (err) {
      results.failed++
      results.errors.push('Unknown error occurred')
    }
  }

  if (results.failed > 0 && results.deleted === 0) {
    throw new Error(results.errors[0] || 'Failed to delete suppliers')
  }

  return results
}

export async function bulkDeleteSales(ids: string[]) {
  if (ids.length === 0) return

  // First restore stock for each sale
  for (const saleId of ids) {
    await restoreStockForCancelledSale(saleId)
  }

  // Then delete related sale_items
  const { error: itemsError } = await supabase
    .from('sale_items')
    .delete()
    .in('sale_id', ids)

  if (itemsError) throw itemsError

  // Finally delete the sales
  const { error } = await supabase
    .from('sales')
    .delete()
    .in('id', ids)

  if (error) throw error
}

export async function bulkDeletePurchases(ids: string[]) {
  if (ids.length === 0) return

  // First delete related purchase_items
  const { error: itemsError } = await supabase
    .from('purchase_items')
    .delete()
    .in('purchase_id', ids)

  if (itemsError) throw itemsError

  // Then delete the purchases
  const { error } = await supabase
    .from('purchases')
    .delete()
    .in('id', ids)

  if (error) throw error
}

export async function bulkDeleteExpenses(ids: string[]) {
  if (ids.length === 0) return

  const { error } = await supabase
    .from('expenses')
    .delete()
    .in('id', ids)

  if (error) throw error
}

export async function bulkDeleteAssets(ids: string[]) {
  if (ids.length === 0) return

  const { error } = await supabase
    .from('assets')
    .delete()
    .in('id', ids)

  if (error) throw error
}

export async function bulkDeleteDebtors(ids: string[]) {
  if (ids.length === 0) return

  // First delete related debtor_items
  const { error: itemsError } = await supabase
    .from('debtor_items')
    .delete()
    .in('debtor_id', ids)

  if (itemsError) throw itemsError

  // Then delete the debtors
  const { error } = await supabase
    .from('debtors')
    .delete()
    .in('id', ids)

  if (error) throw error
}

export async function bulkDeleteBreakages(ids: string[]) {
  if (ids.length === 0) return

  const { error } = await supabase
    .from('breakages')
    .delete()
    .in('id', ids)

  if (error) throw error
}

// Daily Float Functions
export async function getTodaysFloat() {
  const today = new Date().toISOString().split('T')[0] // Get YYYY-MM-DD format

  const { data, error } = await supabase
    .from('daily_floats')
    .select('*')
    .eq('date', today)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    throw error
  }

  // Return default values if no float set for today
  return data || {
    id: '',
    date: today,
    cash_float: 0,
    mpesa_float: 0,
    set_by: null,
    created_at: '',
    updated_at: ''
  }
}

export async function setTodaysFloat(
  cashFloat: number,
  mpesaFloat: number,
  userId: string
) {
  const today = new Date().toISOString().split('T')[0] // Get YYYY-MM-DD format

  const floatData = {
    date: today,
    cash_float: cashFloat,
    mpesa_float: mpesaFloat,
    set_by: userId
  }

  // Use upsert to insert or update
  const { data, error } = await supabase
    .from('daily_floats')
    .upsert(floatData, {
      onConflict: 'date',
      ignoreDuplicates: false
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getFloatHistory(startDate?: string, endDate?: string) {
  let query = supabase
    .from('daily_floats')
    .select(`
      *,
      user_profiles!set_by (
        email
      )
    `)
    .order('date', { ascending: false })

  if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate)
  } else if (startDate) {
    query = query.gte('date', startDate)
  } else if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// Business Settings Functions
export async function getBusinessSettings() {
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    throw error
  }

  // Return default values if no settings exist
  return data || {
    id: '',
    business_name: 'Tushop',
    address: null,
    phone: null,
    email: null,
    logo_url: null,
    tax_id: null,
    registration_number: null,
    footer_message: 'Thank you for your business!',
    created_at: '',
    updated_at: ''
  }
}

export async function updateBusinessSettings(id: string, updates: Partial<BusinessSettings>) {
  const { data, error } = await supabase
    .from('business_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as BusinessSettings
}

export async function createBusinessSettings(settings: Omit<BusinessSettings, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('business_settings')
    .insert(settings)
    .select()
    .single()

  if (error) throw error
  return data as BusinessSettings
}