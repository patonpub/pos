import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Prevent this route from being statically analyzed during build
export const dynamic = 'force-dynamic'

interface ImportSaleItem {
  product_name: string
  quantity: number
  unit_price: number
}

interface ImportSale {
  sale_number?: string
  customer_name: string
  customer_phone?: string
  payment_method: 'cash' | 'mpesa'
  status: 'completed' | 'pending' | 'cancelled'
  items: ImportSaleItem[]
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication - get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create a Supabase client with the user's session token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { sales } = body as { sales: ImportSale[] }

    if (!sales || !Array.isArray(sales)) {
      return NextResponse.json({ error: 'Invalid sales data' }, { status: 400 })
    }

    if (sales.length === 0) {
      return NextResponse.json({ error: 'No sales to import' }, { status: 400 })
    }

    if (sales.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 sales per import' }, { status: 400 })
    }

    // Get all products to map names to IDs
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name')

    if (productsError) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    const productMap = new Map(products.map(p => [p.name.toLowerCase(), p.id]))

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process sales one by one to maintain data integrity
    for (const [index, sale] of sales.entries()) {
      try {
        // Validate sale items and get product IDs
        const saleItems = []
        let saleTotal = 0
        let hasItemErrors = false

        for (const item of sale.items) {
          const productId = productMap.get(item.product_name.toLowerCase())
          if (!productId) {
            errors.push(`Sale ${index + 1}: Product "${item.product_name}" not found`)
            hasItemErrors = true
            continue
          }

          const itemTotal = item.quantity * item.unit_price
          saleTotal += itemTotal

          saleItems.push({
            product_id: productId,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: itemTotal
          })
        }

        if (hasItemErrors || saleItems.length === 0) {
          errorCount++
          continue
        }

        // Generate sale number if not provided
        let saleNumber = sale.sale_number
        if (!saleNumber) {
          const { data: generatedNumber, error: numberError } = await supabase.rpc('generate_sale_number')
          if (numberError) {
            errors.push(`Sale ${index + 1}: Failed to generate sale number - ${numberError.message}`)
            errorCount++
            continue
          }
          saleNumber = generatedNumber
        }

        // Create the sale
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert({
            sale_number: saleNumber,
            customer_name: sale.customer_name,
            customer_phone: sale.customer_phone || null,
            total_amount: saleTotal,
            tax_amount: 0, // Default to 0, can be customized later
            payment_method: sale.payment_method,
            status: sale.status,
            user_id: user.id
          })
          .select()
          .single()

        if (saleError) {
          errors.push(`Sale ${index + 1}: ${saleError.message}`)
          errorCount++
          continue
        }

        // Insert sale items
        const saleItemsWithSaleId = saleItems.map(item => ({
          ...item,
          sale_id: saleData.id
        }))

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsWithSaleId)

        if (itemsError) {
          errors.push(`Sale ${index + 1}: Failed to insert items - ${itemsError.message}`)
          errorCount++
          // Try to cleanup the sale record
          await supabase.from('sales').delete().eq('id', saleData.id)
          continue
        }

        // Update product stock for completed sales
        if (sale.status === 'completed') {
          for (const item of saleItems) {
            const { error: stockError } = await supabase.rpc('update_product_stock', {
              product_id: item.product_id,
              quantity_change: -item.quantity
            })
            if (stockError) {
              errors.push(`Sale ${index + 1}: Failed to update stock for product - ${stockError.message}`)
              // Don't mark as error since the sale was created successfully
            }
          }
        }

        successCount++
      } catch (error: any) {
        errorCount++
        errors.push(`Sale ${index + 1}: ${error.message}`)
      }
    }

    // Return results
    const result = {
      success: successCount,
      errors: errorCount,
      total: sales.length,
      errorDetails: errors.slice(0, 20) // Limit error details for response size
    }

    const status = successCount > 0 ? 200 : 400
    const message = successCount > 0 
      ? `Successfully imported ${successCount} sales${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
      : 'All imports failed'

    return NextResponse.json(result, { status })

  } catch (error: any) {
    console.error('Sales bulk import error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message }, 
      { status: 500 }
    )
  }
}