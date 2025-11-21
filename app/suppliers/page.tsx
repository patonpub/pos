"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Minus, Search, Users, Phone, Mail, Edit, Trash2, Eye, History, Package, RefreshCw } from "lucide-react"
import { AddSupplierForm } from "@/components/add-supplier-form"
import { format } from "date-fns"
import { getSuppliers, deleteSupplier, bulkDeleteSuppliers, getPurchasesBySupplier } from "@/lib/database"
import type { Supplier, PurchaseWithItems } from "@/lib/database-types"
import { toast } from "sonner"
import { useConfirm } from "@/hooks/use-confirm"

function SuppliersContent() {
  const { isOwner, isDemo } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false)
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseWithItems[]>([])
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setIsLoading(true)
      const data = await getSuppliers()
      setSuppliers(data)
    } catch (error) {
      console.error("Failed to load suppliers:", error)
      toast.error("Failed to load suppliers")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadSuppliers()
    } catch (error) {
      console.error("Failed to refresh suppliers:", error)
    } finally {
      setRefreshing(false)
    }
  }

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.phone && supplier.phone.includes(searchTerm))
  )


  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsEditDialogOpen(true)
  }

  const handleDeleteSupplier = async (supplierId: string) => {
    const confirmed = await confirm({
      title: "Delete Supplier",
      description: "Are you sure you want to delete this supplier? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      await deleteSupplier(supplierId)
      setSuppliers(suppliers.filter(s => s.id !== supplierId))
      toast.success("Supplier deleted successfully!")
    } catch (error) {
      console.error("Failed to delete supplier:", error)
      toast.error("Failed to delete supplier")
    }
  }

  const handleBulkDeleteSuppliers = async () => {
    if (selectedSuppliers.size === 0) return
    
    const selectedCount = selectedSuppliers.size
    const confirmed = await confirm({
      title: "Delete Multiple Suppliers",
      description: `Are you sure you want to delete ${selectedCount} selected suppliers? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      const selectedIds = Array.from(selectedSuppliers)
      const results = await bulkDeleteSuppliers(selectedIds)
      setSelectedSuppliers(new Set())
      
      if (results && typeof results === 'object' && 'deleted' in results) {
        // Refresh suppliers list to get accurate state
        loadSuppliers()
        if (results.deleted > 0 && results.failed > 0) {
          toast.success(`${results.deleted} suppliers deleted successfully. ${results.failed} suppliers could not be deleted (have associated products).`)
        } else if (results.deleted > 0) {
          toast.success(`${results.deleted} suppliers deleted successfully!`)
        }
      } else {
        // Fallback for when individual deletions succeed
        setSuppliers(suppliers.filter(s => !selectedIds.includes(s.id)))
        toast.success(`${selectedCount} suppliers deleted successfully!`)
      }
    } catch (error: any) {
      console.error("Failed to delete suppliers:", error)
      const errorMessage = error?.message || "Failed to delete suppliers. Please try again."
      toast.error(errorMessage)
    }
  }

  const handleViewPurchaseHistory = async (supplier: Supplier) => {
    try {
      setIsLoadingPurchases(true)
      setSelectedSupplier(supplier)
      const purchases = await getPurchasesBySupplier(supplier.id)
      setPurchaseHistory(purchases)
      setIsPurchaseHistoryOpen(true)
    } catch (error) {
      console.error("Failed to load purchase history:", error)
      toast.error("Failed to load purchase history")
    } finally {
      setIsLoadingPurchases(false)
    }
  }

  return (
    <DashboardLayout currentPage="suppliers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-balance">Supplier Management</h1>
              <p className="text-muted-foreground">Manage your suppliers and vendor relationships</p>
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
              {!isDemo && isOwner && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Supplier
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Supplier</DialogTitle>
                      <DialogDescription>Enter the details for the new supplier to add to your system.</DialogDescription>
                    </DialogHeader>
                    <AddSupplierForm
                      onClose={() => setIsAddDialogOpen(false)}
                      onSuccess={loadSuppliers}
                    />
                  </DialogContent>
                </Dialog>
              )}
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            </div>
          </div>
        </div>


        {/* Suppliers List */}
        <Card>
          <CardHeader>
            <CardTitle>Suppliers Directory</CardTitle>
            <CardDescription>View and manage all your suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers by name, contact, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {selectedSuppliers.size > 0 && !isDemo && (
              <div className="flex gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
                {isOwner && (
                  <Button variant="outline" size="sm">
                    Send Message ({selectedSuppliers.size})
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
                {isOwner && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDeleteSuppliers}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedSuppliers.size})
                  </Button>
                )}
              </div>
            )}

            {/* Suppliers Table - Desktop */}
            <div className="border hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {!isDemo && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSuppliers.size === filteredSuppliers.length && filteredSuppliers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSuppliers(new Set(filteredSuppliers.map(s => s.id)))
                            } else {
                              setSelectedSuppliers(new Set())
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead className="uppercase">Supplier</TableHead>
                    <TableHead className="uppercase">Contact</TableHead>
                    <TableHead className="uppercase">Address</TableHead>
                    <TableHead className="uppercase">Created</TableHead>
                    <TableHead className="text-right uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="space-y-3">
                          <div className="text-lg">Loading suppliers...</div>
                          <div className="text-sm text-muted-foreground">Please wait</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        {!isDemo && (
                          <TableCell>
                            <Checkbox
                              checked={selectedSuppliers.has(supplier.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedSuppliers)
                                if (checked) {
                                  newSelected.add(supplier.id)
                                } else {
                                  newSelected.delete(supplier.id)
                                }
                                setSelectedSuppliers(newSelected)
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Since {format(new Date(supplier.created_at), "MMM yyyy")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {supplier.contact_person && (
                              <div className="font-medium">{supplier.contact_person}</div>
                            )}
                            {supplier.phone && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {supplier.phone}
                              </div>
                            )}
                            {supplier.email && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {supplier.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {supplier.address || "No address provided"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(supplier.created_at), "MMM dd, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(supplier)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!isDemo && isOwner && (
                              <Button variant="ghost" size="sm" onClick={() => handleEditSupplier(supplier)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {!isDemo && isOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSupplier(supplier.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Suppliers Cards - Mobile */}
            <div className="sm:hidden space-y-4">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="border rounded-lg bg-white">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedSuppliers.has(supplier.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedSuppliers)
                            if (checked) {
                              newSelected.add(supplier.id)
                            } else {
                              newSelected.delete(supplier.id)
                            }
                            setSelectedSuppliers(newSelected)
                          }}
                        />
                        <button
                          onClick={() => toggleItem(supplier.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedItems.has(supplier.id) ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleItem(supplier.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-base">{supplier.name}</div>
                          <div className="text-sm text-muted-foreground">Since {format(new Date(supplier.created_at), "MMM yyyy")}</div>
                        </div>
                        <div className="text-right">
                          {supplier.contact_person && (
                            <div className="font-medium text-sm">{supplier.contact_person}</div>
                          )}
                          {supplier.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedItems.has(supplier.id) && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-1">Contact Information</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {supplier.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {supplier.email}
                                </div>
                              )}
                              {supplier.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {supplier.phone}
                                </div>
                              )}
                              {supplier.address && (
                                <div>Address: {supplier.address}</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">Business Details</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Created: {format(new Date(supplier.created_at), "MMM dd, yyyy")}</div>
                              <div>Updated: {format(new Date(supplier.updated_at), "MMM dd, yyyy")}</div>
                            </div>
                          </div>
                        </div>
                        
                        {supplier.notes && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Notes</h4>
                            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                              {supplier.notes}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(supplier)}>
                            <Eye className="h-4 w-4 mr-1" />View
                          </Button>
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleEditSupplier(supplier)}>
                              <Edit className="h-4 w-4 mr-1" />Edit
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleViewPurchaseHistory(supplier)}>
                            <History className="h-4 w-4 mr-1" />History
                          </Button>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isLoading && filteredSuppliers.length === 0 && (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No suppliers found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {suppliers.length === 0 ? "Start by adding your first supplier." : "Try adjusting your search criteria."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier Details Dialog */}
        <Dialog open={!!selectedSupplier && !isEditDialogOpen} onOpenChange={() => setSelectedSupplier(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedSupplier?.name}</DialogTitle>
              <DialogDescription>Supplier details and purchase history</DialogDescription>
            </DialogHeader>
            {selectedSupplier && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>Contact Person:</strong> {selectedSupplier.contact_person || "Not provided"}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {selectedSupplier.phone || "Not provided"}
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {selectedSupplier.email || "Not provided"}
                      </p>
                      <p>
                        <strong>Address:</strong> {selectedSupplier.address || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Business Summary</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>Status:</strong> <Badge variant="default" className="min-w-[80px] justify-center">Active</Badge>
                      </p>
                      <p>
                        <strong>Partner Since:</strong> {format(new Date(selectedSupplier.created_at), "MMM dd, yyyy")}
                      </p>
                      <p>
                        <strong>Last Updated:</strong> {format(new Date(selectedSupplier.updated_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedSupplier.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <div className="border p-3 rounded bg-muted/50">
                      <p className="text-sm">{selectedSupplier.notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {!isDemo && (
                    <Button onClick={() => handleEditSupplier(selectedSupplier)}>Edit Supplier</Button>
                  )}
                  <Button variant="outline" onClick={() => handleViewPurchaseHistory(selectedSupplier)}>
                    <History className="mr-2 h-4 w-4" />
                    View Purchase History
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Supplier Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>Update supplier information and details.</DialogDescription>
            </DialogHeader>
            <AddSupplierForm
              supplier={selectedSupplier}
              onClose={() => {
                setIsEditDialogOpen(false)
                setSelectedSupplier(null)
              }}
              onSuccess={() => {
                loadSuppliers()
                setIsEditDialogOpen(false)
                setSelectedSupplier(null)
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Purchase History Dialog */}
        <Dialog open={isPurchaseHistoryOpen} onOpenChange={setIsPurchaseHistoryOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchase History - {selectedSupplier?.name}
              </DialogTitle>
              <DialogDescription>
                All purchases made from this supplier
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingPurchases ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <div className="text-lg">Loading purchase history...</div>
                  <div className="text-sm text-muted-foreground">Please wait</div>
                </div>
              </div>
            ) : purchaseHistory.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No purchases found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No purchases have been made from this supplier yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Total purchases: {purchaseHistory.length} | 
                  Total amount: KSh {purchaseHistory.reduce((sum, purchase) => sum + purchase.total_amount, 0).toLocaleString()}
                </div>
                
                <div className="space-y-4">
                  {purchaseHistory.map((purchase) => (
                    <Card key={purchase.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">Purchase #{purchase.purchase_number}</CardTitle>
                            <CardDescription>
                              {format(new Date(purchase.created_at), "MMM dd, yyyy 'at' HH:mm")}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              KSh {Math.round(purchase.total_amount).toLocaleString()}
                            </div>
                            <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'} className="min-w-[100px] justify-center">
                              {purchase.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {purchase.purchase_items && purchase.purchase_items.length > 0 && (
                        <CardContent className="pt-0">
                          <div className="border rounded">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead>Product</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Buying Price</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {purchase.purchase_items.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.products?.name || 'Unknown Product'}</TableCell>
                                    <TableCell>{item.quantity.toLocaleString()}</TableCell>
                                    <TableCell>KSh {Math.round(item.unit_price).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">KSh {Math.round(item.total_price).toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setIsPurchaseHistoryOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <ConfirmDialog />
      </div>
    </DashboardLayout>
  )
}

export default function SuppliersPage() {
  return (
    <ProtectedRoute allowedRoles={['owner', 'employee']}>
      <SuppliersContent />
    </ProtectedRoute>
  )
}
