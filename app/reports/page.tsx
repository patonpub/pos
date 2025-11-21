"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { useReportsStore } from "@/stores/reports-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, CalendarIcon, Download, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

function ReportsContent() {
  const {
    reportData,
    loading,
    error,
    fetchReportData,
    colors
  } = useReportsStore()
  const router = useRouter()
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [reportType, setReportType] = useState("overview")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const startDate = dateRange.from.toISOString()
    const endDate = dateRange.to.toISOString()
    fetchReportData(startDate, endDate)
  }, [dateRange, fetchReportData])
  
  const handleRefreshReport = async () => {
    try {
      setRefreshing(true)
      const startDate = dateRange.from.toISOString()
      const endDate = dateRange.to.toISOString()
      await fetchReportData(startDate, endDate)
    } catch (error) {
      console.error('Error refreshing report:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const getAlertBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive" className="min-w-[100px] justify-center">Critical</Badge>
      case "low":
        return <Badge variant="secondary" className="min-w-[100px] justify-center">Low Stock</Badge>
      default:
        return <Badge variant="outline" className="min-w-[100px] justify-center">{status}</Badge>
    }
  }

  const exportReport = () => {
    console.log("Exporting report for:", reportType, dateRange)
  }

  const handleReorderProduct = (productName: string) => {
    router.push(`/purchases?reorder=${encodeURIComponent(productName)}`)
  }
  
  if (error) {
    return (
      <DashboardLayout currentPage="reports">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-red-600">
            <p className="mb-4">Error loading report data: {error}</p>
            <Button onClick={handleRefreshReport}>Retry</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout currentPage="reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-balance">Reports & Analytics</h1>
            <p className="text-muted-foreground">Business insights and performance metrics</p>
          </div>

          <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:gap-3 sm:items-center">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Business Overview</SelectItem>
                <SelectItem value="sales">Sales Report</SelectItem>
                <SelectItem value="inventory">Inventory Report</SelectItem>
                <SelectItem value="profit">Profit Analysis</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportReport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={handleRefreshReport} disabled={loading || refreshing} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className={`mr-2 h-4 w-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
              {(loading || refreshing) ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Date Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Report Period</CardTitle>
            <CardDescription>Select the date range for your reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange((prev) => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => date && setDateRange((prev) => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-2 items-stretch sm:flex-row sm:items-end sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
                >
                  This Month
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-green">
                {loading || !reportData ? <Skeleton className="h-8 w-24" /> : `KSh ${reportData.totalRevenue.toLocaleString()}`}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                Total revenue for selected period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-blue">
                {loading || !reportData ? <Skeleton className="h-8 w-16" /> : reportData.totalSales.toLocaleString()}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                Total sales for selected period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-purple">
                {loading || !reportData ? <Skeleton className="h-8 w-24" /> : `KSh ${reportData.grossProfit.toLocaleString()}`}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                Gross profit for selected period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <DollarSign className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold number-orange">
                {loading || !reportData ? <Skeleton className="h-8 w-20" /> : `KSh ${Math.round(reportData.avgOrderValue).toLocaleString()}`}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                Average order value
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales & Profit Trend</CardTitle>
              <CardDescription>Daily sales and profit over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || !reportData ? (
                <Skeleton className="w-full h-[300px]" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>Revenue distribution across product categories</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || !reportData ? (
                <Skeleton className="w-full h-[300px]" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
            <CardDescription>Best selling products by revenue and profit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading || !reportData ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : reportData.topProducts.length > 0 ? reportData.topProducts.map((product, index) => {
                    const margin = product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(1) : '0.0'
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                        </TableCell>
                        <TableCell>{product.sales}</TableCell>
                        <TableCell>KSh {Math.round(product.revenue).toLocaleString()}</TableCell>
                        <TableCell>KSh {Math.round(product.profit).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{margin}%</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  }) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No product data available for selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
            <CardDescription>Products requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action Needed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading || !reportData ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : reportData.inventoryAlerts.length > 0 ? reportData.inventoryAlerts.map((alert, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{alert.product}</div>
                      </TableCell>
                      <TableCell>{alert.currentStock}</TableCell>
                      <TableCell>{alert.minLevel}</TableCell>
                      <TableCell>{getAlertBadge(alert.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReorderProduct(alert.product)}
                        >
                          Reorder
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No inventory alerts - all products are well stocked!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Comparison</CardTitle>
            <CardDescription>Revenue comparison across months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !reportData ? (
              <Skeleton className="w-full h-[300px]" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#8884d8" />
                  <Bar dataKey="profit" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <ReportsContent />
    </ProtectedRoute>
  )
}
