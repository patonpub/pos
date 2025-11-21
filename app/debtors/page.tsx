"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { DateFilter } from "@/components/date-filter"
import { useDateFilter } from "@/contexts/date-filter-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Minus, Search, Users, TrendingUp, AlertCircle, Phone, Mail, Edit, Trash2, CreditCard, Eye, Clock, RefreshCw } from "lucide-react"
import { DateRange } from "react-day-picker"
import { getDebtors, updateDebtor, deleteDebtor, bulkDeleteDebtors, getDebtorStats, type Debtor, type DebtorWithItems } from "@/lib/database"
import { toast } from "sonner"
import { AddDebtorForm } from "@/components/add-debtor-form"
import { Skeleton } from "@/components/ui/skeleton"
import { useConfirm } from "@/hooks/use-confirm"

const statusOptions = ["All", "pending", "overdue", "paid"]

function DebtorsContent() {
  const { isOwner } = useAuth()
  const { getFormattedDateRange, dateRange } = useDateFilter()
  const [debtors, setDebtors] = useState<DebtorWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorWithItems | null>(null)
  const [viewingDebtor, setViewingDebtor] = useState<DebtorWithItems | null>(null)
  const [selectedDebtors, setSelectedDebtors] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [editingDebtor, setEditingDebtor] = useState<DebtorWithItems | null>(null)
  const [stats, setStats] = useState({
    totalDebtors: 0,
    outstandingDebtors: 0,
    overdueDebtors: 0,
    dueSoon: 0
  })
  const [isStatsLoading, setIsStatsLoading] = useState(true)
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

  const loadStats = useCallback(async () => {
    try {
      setIsStatsLoading(true)
      const { startDate, endDate } = getFormattedDateRange()
      const statsData = await getDebtorStats(startDate, endDate)
      setStats(statsData)
    } catch (error) {
      console.error("Failed to load stats:", error)
      toast.error("Failed to load debtor stats")
    } finally {
      setIsStatsLoading(false)
    }
  }, [getFormattedDateRange])

  const loadDebtors = useCallback(async () => {
    try {
      setLoading(true)
      const { startDate, endDate } = getFormattedDateRange()
      const data = await getDebtors(startDate, endDate)
      
      // Calculate overdue status based on due_date
      const debtorsWithStatus = data.map(debtor => {
        // Parse date string properly to avoid timezone issues
        const dateParts = debtor.due_date.split('-')
        const dueDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
        const today = new Date()
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const daysPastDue = Math.floor((todayOnly.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        
        let status = debtor.status
        if (status === 'pending' && daysPastDue > 0) {
          status = 'overdue'
        }
        
        return { ...debtor, status, daysPastDue }
      })
      
      setDebtors(debtorsWithStatus)
    } catch (error) {
      console.error('Error loading debtors:', error)
      toast.error('Failed to load debtors')
    } finally {
      setLoading(false)
    }
  }, [getFormattedDateRange])

  useEffect(() => {
    loadDebtors()
    loadStats()
  }, [loadDebtors, loadStats])


  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadDebtors(), loadStats()])
    } catch (error) {
      console.error("Failed to refresh debtors:", error)
    } finally {
      setRefreshing(false)
    }
  }

  // Filter debtors based on search and status (date filtering is done server-side)
  const filteredDebtors = debtors.filter((debtor) => {
    const matchesSearch =
      debtor.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (debtor.customer_phone && debtor.customer_phone.includes(searchTerm)) ||
      (debtor.room_number && debtor.room_number.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = selectedStatus === "All" || debtor.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-blue-100 text-blue-800 min-w-[100px] justify-center">Pending</Badge>
      case "overdue":
        return <Badge className="bg-yellow-100 text-yellow-800 min-w-[100px] justify-center">Overdue</Badge>
      case "paid":
        return <Badge className="bg-green-100 text-green-800 min-w-[100px] justify-center">Paid</Badge>
      default:
        return <Badge variant="outline" className="min-w-[100px] justify-center">{status}</Badge>
    }
  }

  const updateDebtorStatus = async (debtorId: string, newStatus: 'pending' | 'paid' | 'overdue') => {
    try {
      await updateDebtor(debtorId, { status: newStatus })
      setDebtors(prevDebtors => 
        prevDebtors.map(debtor => 
          debtor.id === debtorId ? { ...debtor, status: newStatus } : debtor
        )
      )
      loadStats() // Reload stats after status change
      toast.success(`Debtor status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating debtor status:', error)
      toast.error('Failed to update debtor status')
    }
  }

  const handlePaymentRecord = (debtor: DebtorWithItems) => {
    setSelectedDebtor(debtor)
    setIsPaymentDialogOpen(true)
  }

  const handleDeleteDebtor = async (debtorId: string, debtorName: string) => {
    const confirmed = await confirm({
      title: "Delete Debtor",
      description: `Are you sure you want to delete the debtor "${debtorName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return

    try {
      await deleteDebtor(debtorId)
      setDebtors(prevDebtors => prevDebtors.filter(debtor => debtor.id !== debtorId))
      loadStats() // Reload stats after deletion
      toast.success("Debtor deleted successfully")
    } catch (error) {
      console.error('Error deleting debtor:', error)
      toast.error('Failed to delete debtor')
    }
  }

  const handleBulkDeleteDebtors = async () => {
    if (selectedDebtors.size === 0) return
    
    const selectedCount = selectedDebtors.size
    const confirmed = await confirm({
      title: "Delete Multiple Debtors",
      description: `Are you sure you want to delete ${selectedCount} selected debtors? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      const selectedIds = Array.from(selectedDebtors)
      await bulkDeleteDebtors(selectedIds)
      toast.success(`Successfully deleted ${selectedCount} debtors`)
      setSelectedDebtors(new Set())
      loadDebtors()
      loadStats()
    } catch (error: any) {
      console.error("Failed to delete debtors:", error)
      toast.error("Failed to delete selected debtors")
    }
  }

  return (
    <DashboardLayout currentPage="debtors">
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-balance">Debtor Management</h1>
              <p className="text-muted-foreground">Track customer credit and outstanding payments</p>
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
              {isOwner && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingDebtor ? "Edit Debtor" : "Add New Debtor"}</DialogTitle>
                      <DialogDescription>
                        {editingDebtor ? "Update debtor information" : "Add a new debtor to your tracking system"}
                      </DialogDescription>
                    </DialogHeader>
                    <AddDebtorForm
                      debtor={editingDebtor}
                      onClose={() => {
                        setIsAddDialogOpen(false)
                        setEditingDebtor(null)
                      }}
                      onSuccess={() => {
                        loadDebtors()
                        loadStats() // Reload stats after creating/updating debtor
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
            <DateFilter className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-2 sm:items-center" />
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            </div>
          </div>
        </div>

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment from {selectedDebtor?.customer_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Outstanding Amount</label>
                <Input 
                  value={selectedDebtor ? `KSh ${Math.round(selectedDebtor.amount).toLocaleString()}` : ""} 
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Amount</label>
                <Input type="number" step="1" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mpesa">Mpesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea placeholder="Payment notes (optional)" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsPaymentDialogOpen(false)}>
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debtors</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-blue">
                {isStatsLoading ? "Loading..." : stats.totalDebtors.toString()}
              </div>
              <p className="text-xs text-muted-foreground">Number of customer accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Debtors</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-orange">
                {isStatsLoading ? "Loading..." : `KSh ${Math.round(stats.outstandingDebtors).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Total unpaid debt amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Debtors</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-red">
                {isStatsLoading ? "Loading..." : stats.overdueDebtors.toString()}
              </div>
              <p className="text-xs text-muted-foreground">Past due date accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-indigo">
                {isStatsLoading ? "Loading..." : stats.dueSoon.toString()}
              </div>
              <p className="text-xs text-muted-foreground">Due within 3 days</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Accounts</CardTitle>
            <CardDescription>Search and manage customer credit accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers, businesses, phone, or room number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "All" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDebtors.size > 0 && (
              <div className="flex gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
                {isOwner && (
                  <Button variant="outline" size="sm">
                    Send Reminders ({selectedDebtors.size})
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
                {isOwner && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDeleteDebtors}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedDebtors.size})
                  </Button>
                )}
              </div>
            )}

            {/* Debtors Table - Desktop */}
            <div className="border hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedDebtors.size === filteredDebtors.length && filteredDebtors.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDebtors(new Set(filteredDebtors.map(d => d.id)))
                          } else {
                            setSelectedDebtors(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="uppercase">Customer</TableHead>
                    <TableHead className="uppercase">Contact</TableHead>
                    <TableHead className="uppercase">Room</TableHead>
                    <TableHead className="uppercase">Amount</TableHead>
                    <TableHead className="uppercase">Due Date</TableHead>
                    <TableHead className="uppercase">Days Past Due</TableHead>
                    <TableHead className="uppercase">Status</TableHead>
                    <TableHead className="text-right uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDebtors.map((debtor) => (
                    <TableRow key={debtor.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedDebtors.has(debtor.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedDebtors)
                            if (checked) {
                              newSelected.add(debtor.id)
                            } else {
                              newSelected.delete(debtor.id)
                            }
                            setSelectedDebtors(newSelected)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{debtor.customer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Due: {new Date(debtor.due_date).toLocaleDateString()}
                            {debtor.debtor_items && debtor.debtor_items.length > 0 && (
                              <span className="ml-2">• {debtor.debtor_items.length} item{debtor.debtor_items.length > 1 ? 's' : ''}</span>
                            )}
                            {(debtor as any).sale_id && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                Linked to Sale
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {debtor.customer_phone ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {debtor.customer_phone}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No phone</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {debtor.room_number || (
                            <span className="text-muted-foreground">No room</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-orange-600">
                        KSh {Math.round(debtor.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(debtor.due_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className={(debtor as any).daysPastDue > 0 ? "text-red-600 font-medium" : ""}>
                          {(debtor as any).daysPastDue || 0} days
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={debtor.status}
                          onValueChange={(value) => updateDebtorStatus(debtor.id, value as 'pending' | 'paid' | 'overdue')}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setViewingDebtor(debtor)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handlePaymentRecord(debtor)}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingDebtor(debtor)
                                setIsAddDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDebtor(debtor.id, debtor.customer_name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Debtors Cards - Mobile */}
            <div className="sm:hidden space-y-4">
              {filteredDebtors.map((debtor) => (
                <div key={debtor.id} className="border rounded-lg bg-white">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedDebtors.has(debtor.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedDebtors)
                            if (checked) {
                              newSelected.add(debtor.id)
                            } else {
                              newSelected.delete(debtor.id)
                            }
                            setSelectedDebtors(newSelected)
                          }}
                        />
                        <button
                          onClick={() => toggleItem(debtor.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedItems.has(debtor.id) ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleItem(debtor.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-base">{debtor.customer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Due: {new Date(debtor.due_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-base text-orange-600">
                            KSh {Math.round(debtor.amount).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {(debtor as any).daysPastDue > 0 ? `${(debtor as any).daysPastDue} days overdue` : 'Current'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {expandedItems.has(debtor.id) && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-1">Customer Details</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {debtor.customer_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {debtor.customer_phone}
                                </div>
                              )}
                              {debtor.room_number && (
                                <div>Room: {debtor.room_number}</div>
                              )}
                              {(debtor as any).sale_id && (
                                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  Linked to Sale
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">Payment Status</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Status: 
                                <Select
                                  value={debtor.status}
                                  onValueChange={(value) => updateDebtorStatus(debtor.id, value as 'pending' | 'paid' | 'overdue')}
                                >
                                  <SelectTrigger className="w-24 h-6 ml-2 inline-flex">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>Due: {new Date(debtor.due_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>
                        
                        {debtor.debtor_items && debtor.debtor_items.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Items ({debtor.debtor_items.length})</h4>
                            <div className="space-y-2">
                              {debtor.debtor_items.slice(0, 3).map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span>{item.products?.name || 'Unknown Product'}</span>
                                  <span>{item.quantity} × KSh {Math.round(item.unit_price).toLocaleString()}</span>
                                </div>
                              ))}
                              {debtor.debtor_items.length > 3 && (
                                <div className="text-sm text-muted-foreground">...and {debtor.debtor_items.length - 3} more items</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" size="sm" onClick={() => setViewingDebtor(debtor)}>
                            <Eye className="h-4 w-4 mr-1" />View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handlePaymentRecord(debtor)}>
                            <CreditCard className="h-4 w-4 mr-1" />Payment
                          </Button>
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditingDebtor(debtor)
                              setIsAddDialogOpen(true)
                            }}>
                              <Edit className="h-4 w-4 mr-1" />Edit
                            </Button>
                          )}
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteDebtor(debtor.id, debtor.customer_name)}>
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

            {loading ? (
              <div className="text-center py-8 space-y-4">
                Loading debtors...
              </div>
            ) : filteredDebtors.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No customers found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm || selectedStatus !== "All" 
                    ? "Try adjusting your search or filter criteria."
                    : "Add your first debtor to get started."
                  }
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Debtor Details Dialog */}
        <Dialog open={!!viewingDebtor} onOpenChange={() => setViewingDebtor(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Customer Account Details - {viewingDebtor?.customer_name}</DialogTitle>
              <DialogDescription>
                Due Date: {viewingDebtor && new Date(viewingDebtor.due_date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            {viewingDebtor && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Customer Information</h4>
                    <p className="text-sm text-muted-foreground">Name: {viewingDebtor.customer_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Phone: {viewingDebtor.customer_phone || 'Not provided'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Room: {viewingDebtor.room_number || 'Not provided'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due Date: {new Date(viewingDebtor.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Account Status</h4>
                    <p className="text-sm text-muted-foreground">Status: {getStatusBadge(viewingDebtor.status)}</p>
                    <p className="text-sm text-muted-foreground">
                      Days Past Due: <span className={(viewingDebtor as any).daysPastDue > 0 ? "text-red-600 font-medium" : ""}>
                        {(viewingDebtor as any).daysPastDue || 0} days
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Outstanding Amount: <span className="font-bold text-orange-600">
                        KSh {Math.round(viewingDebtor.amount).toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>

                {viewingDebtor.debtor_items && viewingDebtor.debtor_items.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Items ({viewingDebtor.debtor_items.length})</h4>
                    <div className="border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="uppercase">Product</TableHead>
                            <TableHead className="uppercase">Qty</TableHead>
                            <TableHead className="uppercase">Selling Price</TableHead>
                            <TableHead className="text-right uppercase">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingDebtor.debtor_items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.products?.name || 'Unknown Product'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>KSh {Math.round(item.unit_price).toLocaleString()}</TableCell>
                              <TableCell className="text-right">KSh {Math.round(item.total_price).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {viewingDebtor.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <div className="border p-3 rounded bg-muted/50">
                      <p className="text-sm">{viewingDebtor.notes}</p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Created:</span>
                    <span>{new Date(viewingDebtor.created_at).toLocaleDateString()} at {new Date(viewingDebtor.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Last Updated:</span>
                    <span>{new Date(viewingDebtor.updated_at).toLocaleDateString()} at {new Date(viewingDebtor.updated_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => {
                    setSelectedDebtor(viewingDebtor)
                    setIsPaymentDialogOpen(true)
                    setViewingDebtor(null)
                  }}>
                    Record Payment
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setEditingDebtor(viewingDebtor)
                    setIsAddDialogOpen(true)
                    setViewingDebtor(null)
                  }}>
                    Edit Customer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        <ConfirmDialog />
      </div>
    </DashboardLayout>
  )
}

export default function DebtorsPage() {
  return (
    <ProtectedRoute allowedRoles={['owner', 'employee']}>
      <DebtorsContent />
    </ProtectedRoute>
  )
}