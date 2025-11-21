import { NextRequest, NextResponse } from 'next/server'
import { createProduct } from '@/lib/database'
import { createClient } from '@supabase/supabase-js'

// Prevent this route from being statically analyzed during build
export const dynamic = 'force-dynamic'

interface ImportProduct {
  name: string
  category: string
  unit_price: number
  cost_price: number
  stock_quantity: number
  min_stock_level: number
  unit: string
  supplier_id?: string | null
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
    const { products } = body as { products: ImportProduct[] }

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid products data' }, { status: 400 })
    }

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products to import' }, { status: 400 })
    }

    if (products.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 products per import' }, { status: 400 })
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process products in batches to avoid overwhelming the database
    const BATCH_SIZE = 50
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)
      
      // Prepare batch data for Supabase
      const batchData = batch.map(product => ({
        name: product.name,
        category: product.category,
        unit_price: product.unit_price,
        cost_price: product.cost_price,
        stock_quantity: product.stock_quantity,
        min_stock_level: product.min_stock_level,
        unit: product.unit,
        supplier_id: product.supplier_id
      }))

      try {
        const { data, error } = await supabase
          .from('products')
          .insert(batchData)
          .select('id')

        if (error) {
          throw error
        }

        successCount += data.length
      } catch (error: any) {
        console.error(`Batch import error for batch starting at ${i}:`, error)
        
        // If batch fails, try individual inserts to identify specific failures
        for (const product of batch) {
          try {
            await createProduct(product)
            successCount++
          } catch (individualError: any) {
            errorCount++
            errors.push(`Failed to import "${product.name}": ${individualError.message}`)
            console.error(`Individual import error for product "${product.name}":`, individualError)
          }
        }
      }
    }

    // Return results
    const result = {
      success: successCount,
      errors: errorCount,
      total: products.length,
      errorDetails: errors.slice(0, 10) // Limit error details to first 10 for response size
    }

    const status = successCount > 0 ? 200 : 400
    const message = successCount > 0 
      ? `Successfully imported ${successCount} products${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
      : 'All imports failed'

    return NextResponse.json(result, { status })

  } catch (error: any) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message }, 
      { status: 500 }
    )
  }
}