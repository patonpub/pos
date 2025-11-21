import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Prevent this route from being statically analyzed during build
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Check if data already exists
    const { data: existingSuppliers } = await supabase
      .from('suppliers')
      .select('id')
      .limit(1)

    if (existingSuppliers && existingSuppliers.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Data already exists. Clear the database first if you want to re-seed.' 
      })
    }

    // Add sample suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .insert([
        { 
          name: 'ABC Distributors', 
          contact_person: 'John Doe', 
          phone: '0712345678', 
          email: 'john@abc.com', 
          address: '123 Main St, Nairobi' 
        },
        { 
          name: 'XYZ Wholesale', 
          contact_person: 'Jane Smith', 
          phone: '0723456789', 
          email: 'jane@xyz.com', 
          address: '456 Market Ave, Mombasa' 
        },
        { 
          name: 'Fresh Foods Ltd', 
          contact_person: 'Bob Wilson', 
          phone: '0734567890', 
          email: 'bob@fresh.com', 
          address: '789 Green St, Kisumu' 
        }
      ])
      .select()

    if (suppliersError) {
      console.error('Suppliers insert error:', suppliersError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to insert suppliers',
        details: suppliersError.message 
      }, { status: 500 })
    }

    // Add sample products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .insert([
        {
          name: 'Coca Cola 500ml',
          category: 'Beverages',
          unit_price: 60.00,
          cost_price: 45.00,
          stock_quantity: 100,
          min_stock_level: 20,
          unit: 'pieces',
          supplier_id: suppliers?.[0]?.id
        },
        {
          name: 'White Bread 400g',
          category: 'Bakery',
          unit_price: 55.00,
          cost_price: 40.00,
          stock_quantity: 50,
          min_stock_level: 10,
          unit: 'pieces',
          supplier_id: suppliers?.[2]?.id
        },
        {
          name: 'Sugar 2kg',
          category: 'Groceries',
          unit_price: 180.00,
          cost_price: 150.00,
          stock_quantity: 30,
          min_stock_level: 5,
          unit: 'packs',
          supplier_id: suppliers?.[1]?.id
        },
        {
          name: 'Rice 5kg',
          category: 'Grains',
          unit_price: 450.00,
          cost_price: 380.00,
          stock_quantity: 25,
          min_stock_level: 5,
          unit: 'packs',
          supplier_id: null
        },
        {
          name: 'Milk 1L',
          category: 'Dairy',
          unit_price: 65.00,
          cost_price: 50.00,
          stock_quantity: 80,
          min_stock_level: 15,
          unit: 'pieces',
          supplier_id: suppliers?.[2]?.id
        },
        {
          name: 'Cooking Oil 2L',
          category: 'Household',
          unit_price: 320.00,
          cost_price: 280.00,
          stock_quantity: 40,
          min_stock_level: 8,
          unit: 'pieces',
          supplier_id: suppliers?.[1]?.id
        },
        {
          name: 'Tomatoes',
          category: 'Fresh Produce',
          unit_price: 120.00,
          cost_price: 90.00,
          stock_quantity: 3, // Low stock for testing
          min_stock_level: 10,
          unit: 'pieces',
          supplier_id: suppliers?.[2]?.id
        },
        {
          name: 'Onions',
          category: 'Fresh Produce',
          unit_price: 80.00,
          cost_price: 60.00,
          stock_quantity: 50,
          min_stock_level: 10,
          unit: 'pieces',
          supplier_id: suppliers?.[2]?.id
        },
        {
          name: 'Soap Bar',
          category: 'Household',
          unit_price: 45.00,
          cost_price: 35.00,
          stock_quantity: 100,
          min_stock_level: 20,
          unit: 'pieces',
          supplier_id: suppliers?.[0]?.id
        },
        {
          name: 'Tea Leaves 250g',
          category: 'Beverages',
          unit_price: 180.00,
          cost_price: 150.00,
          stock_quantity: 2, // Low stock for testing
          min_stock_level: 8,
          unit: 'packs',
          supplier_id: suppliers?.[1]?.id
        }
      ])
      .select()

    if (productsError) {
      console.error('Products insert error:', productsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to insert products',
        details: productsError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sample data seeded successfully',
      data: {
        suppliers: suppliers?.length || 0,
        products: products?.length || 0
      }
    })

  } catch (error) {
    console.error('Seed data error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to seed data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}