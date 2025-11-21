import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Prevent this route from being statically analyzed during build
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test database connectivity by trying to fetch products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name')
      .limit(5)

    if (productsError) {
      console.error('Products query error:', productsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to query products',
        details: productsError.message 
      }, { status: 500 })
    }

    // Test suppliers query
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, name')
      .limit(5)

    if (suppliersError) {
      console.error('Suppliers query error:', suppliersError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to query suppliers',
        details: suppliersError.message 
      }, { status: 500 })
    }

    // Test user profiles query
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .limit(5)

    if (usersError) {
      console.error('User profiles query error:', usersError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to query user profiles',
        details: usersError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database connectivity test successful',
      data: {
        products: products.length,
        suppliers: suppliers.length,
        users: users.length
      }
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}