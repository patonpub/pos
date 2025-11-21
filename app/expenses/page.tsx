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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Minus, Search, Receipt, TrendingUp, Calendar, Edit, Trash2, Eye, RefreshCw } from "lucide-react"
import { DateRange } from "react-day-picker"
import { getExpenses, deleteExpense, bulkDeleteExpenses } from "@/lib/database"
import { AddExpenseForm } from "@/components/add-expense-form"
import type { Expense } from "@/lib/database-types"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useConfirm } from "@/hooks/use-confirm"


const categories = ["All", "Rent", "Utilities", "Supplies", "Marketing", "Maintenance", "Transportation", "Insurance", "Equipment", "Salaries", "Other"]

function ExpensesContent() {
  const { isOwner } = useAuth()
  const { getFormattedDateRange, dateRange } = useDateFilter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
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

  const loadExpenses = useCallback(async () => {
    try {
      setIsLoading(true)
      const { startDate, endDate } = getFormattedDateRange()
      const data = await getExpenses(startDate, endDate)
      setExpenses(data)
    } catch (error) {
      console.error("Failed to load expenses:", error)
      toast.error("Failed to load expenses")
    } finally {
      setIsLoading(false)
    }
  }, [getFormattedDateRange])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadExpenses()
    } catch (error) {
      console.error("Failed to refresh expenses:", error)
    } finally {
      setRefreshing(false)
    }
  }

  // Filter expenses based on search and category (date filtering is done server-side)
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || expense.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Calculate expense stats from server-filtered data
  const filteredTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const averageExpense = expenses.length > 0 ? filteredTotal / expenses.length : 0
  
  // Determine period label based on date filter
  const getPeriodLabel = () => {
    if (!dateRange?.from) return "All Time"
    
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return dateRange.from.toDateString() === new Date().toDateString() ? "Today" : "Selected Day"
      } else {
        return "Selected Period"
      }
    } else if (dateRange.from) {
      return "From Selected Date"
    } else if (dateRange.to) {
      return "Up to Selected Date"
    }
    return "All Time"
  }
  
  const periodLabel = getPeriodLabel()

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmed = await confirm({
      title: "Delete Expense",
      description: "Are you sure you want to delete this expense? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (confirmed) {
      try {
        await deleteExpense(expenseId)
        toast.success("Expense deleted successfully")
        loadExpenses()
      } catch (error) {
        console.error("Failed to delete expense:", error)
        toast.error("Failed to delete expense")
      }
    }
  }

  const handleBulkDeleteExpenses = async () => {
    if (selectedExpenses.size === 0) return
    
    const selectedCount = selectedExpenses.size
    const confirmed = await confirm({
      title: "Delete Multiple Expenses",
      description: `Are you sure you want to delete ${selectedCount} selected expenses? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (!confirmed) return
    
    try {
      const selectedIds = Array.from(selectedExpenses)
      await bulkDeleteExpenses(selectedIds)
      setSelectedExpenses(new Set())
      toast.success(`${selectedCount} expenses deleted successfully!`)
      loadExpenses()
    } catch (error) {
      console.error("Failed to delete expenses:", error)
      toast.error("Failed to delete expenses. Please try again.")
    }
  }

  return (
    <DashboardLayout currentPage="expenses">
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-balance">Expense Management</h1>
              <p className="text-muted-foreground">Track and manage your business expenses</p>
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
              {isOwner && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Expense</DialogTitle>
                      <DialogDescription>Enter the details for the new expense to track your business costs.</DialogDescription>
                    </DialogHeader>
                    <AddExpenseForm
                      onClose={() => setIsAddDialogOpen(false)}
                      onSuccess={loadExpenses}
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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses ({periodLabel})</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-red">KSh {Math.round(filteredTotal).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{expenses.length} expenses in period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-red">KSh {Math.round(filteredTotal).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average ({periodLabel})</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-amber">KSh {Math.round(averageExpense).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Per expense in period</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Records</CardTitle>
            <CardDescription>Search and filter your business expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedExpenses.size > 0 && (
              <div className="flex gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
                <Button variant="outline" size="sm">
                  Export Selected ({selectedExpenses.size})
                </Button>
                {isOwner && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDeleteExpenses}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedExpenses.size})
                  </Button>
                )}
              </div>
            )}

            {/* Expenses Table - Desktop */}
            <div className="border hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedExpenses.size === filteredExpenses.length && filteredExpenses.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExpenses(new Set(filteredExpenses.map(e => e.id)))
                          } else {
                            setSelectedExpenses(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="uppercase">Description</TableHead>
                    <TableHead className="uppercase">Category</TableHead>
                    <TableHead className="uppercase">Date</TableHead>
                    <TableHead className="uppercase">Amount</TableHead>
                    <TableHead className="text-right uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading expenses...
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedExpenses.has(expense.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedExpenses)
                              if (checked) {
                                newSelected.add(expense.id)
                              } else {
                                newSelected.delete(expense.id)
                              }
                              setSelectedExpenses(newSelected)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{expense.description}</div>
                        </TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">KSh {Math.round(expense.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedExpense(expense)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isOwner && (
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(expense.id)}>
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

            {/* Expenses Cards - Mobile */}
            <div className="sm:hidden space-y-4">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg bg-white">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedExpenses.has(expense.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedExpenses)
                            if (checked) {
                              newSelected.add(expense.id)
                            } else {
                              newSelected.delete(expense.id)
                            }
                            setSelectedExpenses(newSelected)
                          }}
                        />
                        <button
                          onClick={() => toggleItem(expense.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedItems.has(expense.id) ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleItem(expense.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-base">{expense.description}</div>
                          <div className="text-sm text-muted-foreground">{expense.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-base">KSh {Math.round(expense.amount).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{new Date(expense.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>

                    {expandedItems.has(expense.id) && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-1">Expense Details</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Category: {expense.category}</div>
                              <div>Amount: KSh {Math.round(expense.amount).toLocaleString()}</div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">Date Information</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>Date: {new Date(expense.date).toLocaleDateString()}</div>
                              <div>Created: {new Date(expense.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>
                        
                        {expense.notes && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Notes</h4>
                            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                              {expense.notes}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedExpense(expense)}>
                            <Eye className="h-4 w-4 mr-1" />View
                          </Button>
                          {isOwner && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(expense.id)}>
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

            {!isLoading && filteredExpenses.length === 0 && (
              <div className="text-center py-8">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No expenses found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {expenses.length === 0 
                    ? "Start by adding your first expense." 
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Details Dialog */}
        <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Expense Details - {selectedExpense?.description}</DialogTitle>
              <DialogDescription>
                Recorded on {selectedExpense && new Date(selectedExpense.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            {selectedExpense && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Basic Information</h4>
                    <p className="text-sm text-muted-foreground">Description: {selectedExpense.description}</p>
                    <p className="text-sm text-muted-foreground">Category: {selectedExpense.category}</p>
                    <p className="text-sm text-muted-foreground">
                      Date: {new Date(selectedExpense.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Amount</h4>
                    <div className="text-2xl font-bold">
                      KSh {Math.round(selectedExpense.amount).toLocaleString()}
                    </div>
                  </div>
                </div>

                {selectedExpense.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <div className="border p-3 rounded bg-muted/50">
                      <p className="text-sm">{selectedExpense.notes}</p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Created:</span>
                    <span>{new Date(selectedExpense.created_at).toLocaleDateString()} at {new Date(selectedExpense.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Last Updated:</span>
                    <span>{new Date(selectedExpense.updated_at).toLocaleDateString()} at {new Date(selectedExpense.updated_at).toLocaleTimeString()}</span>
                  </div>
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

export default function ExpensesPage() {
  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <ExpensesContent />
    </ProtectedRoute>
  )
}