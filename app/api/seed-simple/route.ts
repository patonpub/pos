import { NextResponse } from 'next/server'
import { createSupplier, createProduct } from '@/lib/database'

// Prevent this route from being statically analyzed during build
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // This approach bypasses RLS by using the authenticated functions
    // For demo purposes, we'll create the data as if coming from an authenticated user
    
    // Add sample suppliers first
    const supplier1 = await createSupplier({
      name: 'ABC Distributors',
      contact_person: 'John Doe',
      phone: '0712345678',
      email: 'john@abc.com',
      address: '123 Main St, Nairobi'
    })

    const supplier2 = await createSupplier({
      name: 'XYZ Wholesale',
      contact_person: 'Jane Smith',
      phone: '0723456789',
      email: 'jane@xyz.com',
      address: '456 Market Ave, Mombasa'
    })

    const supplier3 = await createSupplier({
      name: 'Fresh Foods Ltd',
      contact_person: 'Bob Wilson',
      phone: '0734567890',
      email: 'bob@fresh.com',
      address: '789 Green St, Kisumu'
    })

    // Add sample products
    await createProduct({
      name: 'Coca Cola 500ml',
      category: 'Beverages',
      unit_price: 60.00,
      cost_price: 45.00,
      stock_quantity: 100,
      min_stock_level: 20,
      unit: 'pieces',
      supplier_id: supplier1.id
    })

    await createProduct({
      name: 'White Bread 400g',
      category: 'Bakery',
      unit_price: 55.00,
      cost_price: 40.00,
      stock_quantity: 50,
      min_stock_level: 10,
      unit: 'pieces',
      supplier_id: supplier3.id
    })

    await createProduct({
      name: 'Sugar 2kg',
      category: 'Groceries',
      unit_price: 180.00,
      cost_price: 150.00,
      stock_quantity: 30,
      min_stock_level: 5,
      unit: 'packs',
      supplier_id: supplier2.id
    })

    await createProduct({
      name: 'Rice 5kg',
      category: 'Grains',
      unit_price: 450.00,
      cost_price: 380.00,
      stock_quantity: 25,
      min_stock_level: 5,
      unit: 'packs',
      supplier_id: null
    })

    await createProduct({
      name: 'Milk 1L',
      category: 'Dairy',
      unit_price: 65.00,
      cost_price: 50.00,
      stock_quantity: 80,
      min_stock_level: 15,
      unit: 'pieces',
      supplier_id: supplier3.id
    })

    await createProduct({
      name: 'Tomatoes',
      category: 'Fresh Produce',
      unit_price: 120.00,
      cost_price: 90.00,
      stock_quantity: 3, // Low stock for testing
      min_stock_level: 10,
      unit: 'pieces',
      supplier_id: supplier3.id
    })

    await createProduct({
      name: 'Tea Leaves 250g',
      category: 'Beverages',
      unit_price: 180.00,
      cost_price: 150.00,
      stock_quantity: 2, // Low stock for testing
      min_stock_level: 8,
      unit: 'packs',
      supplier_id: supplier2.id
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Sample data created successfully using database functions'
    })

  } catch (error) {
    console.error('Seed simple error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to seed data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}