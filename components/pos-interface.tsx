"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Minus, Trash2, Search, Barcode, CreditCard, ShoppingCart, X, Package, LogOut } from "lucide-react"
import { getProducts, searchProducts, searchProductByBarcode, createSale, getBusinessSettings } from "@/lib/database"
import type { Product, BusinessSettings, SaleWithItems } from "@/lib/database-types"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { ReceiptTemplate } from "@/components/receipt-template"
import { useReactToPrint } from "react-to-print"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface CartItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
  totalPrice: number
  product: Product
}

export function POSInterface() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash')
  const [customerName, setCustomerName] = useState("Walk-in Customer")
  const [isProcessing, setIsProcessing] = useState(false)
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null)
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
   const [products, setProducts] = useState<Product[]>([])
   const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const receiptRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

   useEffect(() => {
     loadBusinessSettings()
     loadProducts()
   }, [])

  const loadBusinessSettings = async () => {
    try {
      const settings = await getBusinessSettings()
      setBusinessSettings(settings)
    } catch (error) {
      console.error("Failed to load business settings:", error)
    }
  }

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true)
      const allProducts = await getProducts()
      setProducts(allProducts)
    } catch (error) {
      console.error("Failed to load products:", error)
      toast.error("Failed to load products")
    } finally {
      setIsLoadingProducts(false)
    }
  }





  const handleSearch = async (query: string) => {
    setSearchTerm(query)
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    try {
      const results = await searchProducts(query)
      setSearchResults(results.slice(0, 10))
      setShowSearchResults(true)
    } catch (error) {
      console.error("Search failed:", error)
      toast.error("Failed to search products")
    }
  }

  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode.trim()) return

    try {
      const product = await searchProductByBarcode(barcode)
      if (product) {
        addToCart(product)
        setBarcodeInput("")
        // Focus back on barcode input for continuous scanning
        setTimeout(() => barcodeInputRef.current?.focus(), 100)
      } else {
        toast.error(`No product found with barcode: ${barcode}`)
        setBarcodeInput("")
      }
    } catch (error) {
      console.error("Barcode search failed:", error)
      toast.error("Failed to search by barcode")
    }
  }

  const addToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      toast.error(`${product.name} is out of stock`)
      return
    }

    const existingItem = cart.find(item => item.id === product.id)

    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        const updatedCart = cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
            : item
        )
        setCart(updatedCart)
        const updated = updatedCart.find(item => item.id === product.id)!
        setSelectedItem(updated)
        toast.success(`${product.name} quantity increased`)
      } else {
        toast.warning(`Maximum stock reached for ${product.name}`)
      }
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        unitPrice: product.unit_price,
        quantity: 1,
        totalPrice: product.unit_price,
        product: product
      }
      setCart([...cart, newItem])
      setSelectedItem(newItem)
      toast.success(`${product.name} added to cart`)
    }

    setSearchTerm("")
    setSearchResults([])
    setShowSearchResults(false)
    setTimeout(() => searchInputRef.current?.focus(), 100)
  }

  const updateQuantity = (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId)
    if (!item) return

    const newQuantity = item.quantity + delta

    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    if (newQuantity > item.product.stock_quantity) {
      toast.warning(`Maximum stock (${item.product.stock_quantity}) reached`)
      return
    }

    const updatedCart = cart.map(i =>
      i.id === itemId
        ? { ...i, quantity: newQuantity, totalPrice: newQuantity * i.unitPrice }
        : i
    )
    setCart(updatedCart)
    const updated = updatedCart.find(i => i.id === itemId)!
    setSelectedItem(updated)
  }

  const removeFromCart = (itemId: string) => {
    const item = cart.find(i => i.id === itemId)
    setCart(cart.filter(i => i.id !== itemId))
    if (selectedItem?.id === itemId) {
      setSelectedItem(cart.length > 1 ? cart[0] : null)
    }
    if (item) {
      toast.success(`${item.name} removed from cart`)
    }
  }

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0)
  }

  const handlePay = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }
    setIsPaymentDialogOpen(true)
  }

  const completeSale = async () => {
    if (!user) {
      toast.error("You must be logged in")
      return
    }

    setIsProcessing(true)
    try {
      const total = calculateTotal()
      const saleData = {
        sale_number: '', // Will be auto-generated
        customer_name: customerName,
        customer_phone: null,
        total_amount: total,
        tax_amount: 0,
        payment_method: paymentMethod,
        status: 'completed' as const,
        user_id: user.id
      }

      const items = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice
      }))

      const sale = await createSale(saleData, items)

      // Store completed sale for receipt
      setLastCompletedSale({
        ...sale,
        sale_items: cart.map(item => ({
          ...item,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          products: { name: item.name }
        }))
      })

      toast.success("Sale completed successfully!")

       // Clear cart and close dialog
       setCart([])
       setSelectedItem(null)
       setCustomerName("Walk-in Customer")
       setIsPaymentDialogOpen(false)

       // Show print dialog
      setTimeout(() => {
        setShowPrintDialog(true)
      }, 500)

    } catch (error) {
      console.error("Failed to complete sale:", error)
      toast.error("Failed to complete sale")
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: lastCompletedSale ? `Receipt-${lastCompletedSale.sale_number}` : 'Receipt',
  })

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success("Logged out successfully")
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Failed to logout")
    }
  }

  // Filter products based on search term if needed, though we have a dedicated search bar
  // For the grid, we might want to show all or filter locally if search term is typed but not selected
  const displayedProducts = searchTerm.length > 0
    ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : products

  return (
    <div className="min-h-screen bg-slate-50 p-2 sm:p-4 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 lg:gap-8 max-w-[1800px] mx-auto">

        {/* Left Side - Product Selection & Search */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 lg:h-[calc(100vh-2rem)]">

          {/* Search Header */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sm:pl-12 h-12 sm:h-14 text-base sm:text-lg bg-white border-slate-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="relative flex-1 sm:flex-none sm:w-48 lg:w-64 hidden">
              <Barcode className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              <Input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeSearch(barcodeInput)
                  }
                }}
                className="pl-10 sm:pl-12 h-12 sm:h-14 text-base sm:text-lg bg-white border-slate-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* User Email & Logout */}
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl px-3 sm:px-4 h-12 sm:h-14">
              <span className="text-xs sm:text-sm text-slate-600 truncate">{profile?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 hover:text-red-600 hover:bg-red-50 h-8 px-2 flex-shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selected Item Detail (if any) */}
          {selectedItem ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{selectedItem.name}</h2>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-600 ml-2">
                      KSh {Math.round(selectedItem.unitPrice).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(selectedItem.id, -1)}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl border-slate-200 hover:bg-slate-50 hover:border-emerald-500/50 transition-all"
                      >
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <div className="w-12 h-9 sm:w-16 sm:h-10 flex items-center justify-center bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200">
                        <span className="text-lg sm:text-xl font-bold text-slate-900">{selectedItem.quantity}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(selectedItem.id, 1)}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl border-slate-200 hover:bg-slate-50 hover:border-emerald-500/50 transition-all"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>

                    <div className="hidden sm:block h-8 w-px bg-slate-200 mx-2"></div>

                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm font-medium text-slate-500">Total:</span>
                      <span className="text-base sm:text-xl font-bold text-slate-900">
                        KSh {Math.round(selectedItem.totalPrice).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromCart(selectedItem.id)}
                  className="h-10 w-10 sm:h-12 sm:w-12 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl sm:rounded-2xl transition-colors self-end sm:self-auto"
                >
                  <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white/50 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-dashed border-slate-200 flex items-center justify-center text-center h-16 sm:h-24">
              <p className="text-slate-500 text-xs sm:text-sm flex items-center gap-2">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                Click on any product to start
              </p>
            </div>
          )}

          {/* Product Grid */}
          <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3 sm:p-4 lg:p-6 overflow-y-auto">
            {isLoadingProducts ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Package className="h-8 w-8 sm:h-12 sm:w-12 mb-2 opacity-20" />
                <p className="text-sm sm:text-base">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {displayedProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white"
                  >
                    <div className="aspect-[4/3] rounded-md sm:rounded-lg bg-slate-200 mb-1 sm:mb-2 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                      {/* Placeholder for product image */}
                      <Package className="h-4 w-4 sm:h-6 sm:w-6 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate mb-1">{product.name}</h3>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs sm:text-sm text-emerald-600 font-bold truncate">
                        KSh {Math.round(product.unit_price).toLocaleString()}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 bg-slate-100 px-1 sm:px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {product.stock_quantity} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Cart, Payment & Recent Sales */}
        <div className="flex flex-col lg:self-start gap-4 lg:gap-6">

        {/* Cart & Payment */}
        <div className="flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden">
          {/* Cart Header */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">Current Order</h2>
              </div>
              <span className="px-2 sm:px-3 py-1 bg-slate-100 rounded-full text-xs sm:text-sm font-medium text-slate-600">
                {cart.length} items
              </span>
            </div>
          </div>

          {/* Cart Items List - Receipt Style */}
          <div className="overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-1 font-mono text-xs sm:text-sm max-h-[400px]">
            {cart.length === 0 ? (
              <div className="min-h-[200px] flex flex-col items-center justify-center text-center opacity-50 font-sans">
                <Plus className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mb-3 sm:mb-4" />
                <p className="text-xs sm:text-sm text-slate-500">Add items to proceed</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`cursor-pointer hover:bg-slate-50 px-2 py-1 rounded ${selectedItem?.id === item.id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700'
                    }`}
                >
                  <div className="flex items-baseline w-full">
                    <span className="whitespace-nowrap mr-1">{item.quantity}x {item.name}</span>
                    <span className="flex-1 border-b border-dotted border-slate-300 mx-1 relative top-[-4px]"></span>
                    <span className="whitespace-nowrap">KSh {Math.round(item.totalPrice).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals Section */}
          <div className="p-4 sm:p-5 lg:p-6 bg-slate-50 border-t border-slate-200 space-y-3 sm:space-y-4">
            <div className="space-y-1 sm:space-y-2 font-mono text-xs sm:text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ........................</span>
                <span>KSh {Math.round(calculateTotal()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax (0%) ........................</span>
                <span>KSh 0</span>
              </div>
            </div>

            <div className="pt-3 sm:pt-4 border-t border-slate-200 border-dashed">
              <div className="flex justify-between items-end mb-4 sm:mb-6">
                <span className="text-base sm:text-lg font-bold text-slate-900">TOTAL</span>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono">
                  KSh {Math.round(calculateTotal()).toLocaleString()}
                </span>
              </div>

              <Button
                size="lg"
                onClick={handlePay}
                disabled={cart.length === 0}
                className="w-full h-14 sm:h-16 text-lg sm:text-xl font-bold rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all font-sans"
              >
                <CreditCard className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                PAY
              </Button>
            </div>
          </div>
        </div>



        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-0">
          <DialogHeader className="space-y-3 sm:space-y-4 text-center pb-4 sm:pb-6 border-b border-slate-100">
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-slate-900">Complete Payment</DialogTitle>
            <DialogDescription className="text-lg sm:text-xl font-medium text-emerald-600 font-mono">
              Total: KSh {Math.round(calculateTotal()).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 sm:space-y-6 py-5 sm:py-8">
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="customer" className="text-sm sm:text-base font-semibold text-slate-900">Customer Name</Label>
              <Input
                id="customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="h-12 sm:h-14 text-base sm:text-lg rounded-xl sm:rounded-2xl border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="payment" className="text-sm sm:text-base font-semibold text-slate-900">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: 'cash' | 'mpesa') => setPaymentMethod(value)}>
                <SelectTrigger className="h-12 sm:h-14 text-base sm:text-lg rounded-xl sm:rounded-2xl border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl sm:rounded-2xl border-slate-200">
                  <SelectItem value="cash" className="text-base sm:text-lg py-2 sm:py-3">💵 Cash</SelectItem>
                  <SelectItem value="mpesa" className="text-base sm:text-lg py-2 sm:py-3">📱 M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 sm:gap-4 pt-3 sm:pt-4">
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              disabled={isProcessing}
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg rounded-xl sm:rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-900"
            >
              Cancel
            </Button>
            <Button
              onClick={completeSale}
              disabled={isProcessing}
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
            >
              {isProcessing ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Receipt Dialog */}
      <AlertDialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <AlertDialogContent className="rounded-3xl max-w-md border-0 p-8">
          <AlertDialogHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-slate-900">Sale Completed!</AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2 text-slate-500">
              Would you like to print a receipt for this transaction?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-4 mt-6">
            <AlertDialogCancel className="flex-1 h-12 text-base rounded-xl border-slate-200 text-slate-900">No, thanks</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handlePrint()
                setShowPrintDialog(false)
              }}
              className="flex-1 h-12 text-base rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Yes, print
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Receipt Template for Printing */}
      <div style={{ display: 'none' }}>
        {lastCompletedSale && businessSettings && (
          <ReceiptTemplate
            ref={receiptRef}
            sale={lastCompletedSale}
            businessSettings={businessSettings}
          />
        )}
      </div>
    </div>
  )
}
