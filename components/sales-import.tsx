"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, Download } from "lucide-react"
import { toast } from "sonner"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"

interface ImportSaleRow {
  sale_number?: string
  customer_name: string
  customer_phone?: string
  payment_method: string
  status: string
  product_name: string
  quantity: string
  unit_price: string
}

interface ParsedSaleItem {
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  errors: string[]
}

interface ParsedSale {
  rowIndex: number
  sale_number?: string
  customer_name: string
  customer_phone?: string
  payment_method: 'cash' | 'mpesa'
  status: 'completed' | 'pending' | 'cancelled'
  items: ParsedSaleItem[]
  total_amount: number
  errors: string[]
  warnings: string[]
}

interface SalesImportProps {
  onSuccess: () => void
  onClose: () => void
}

const REQUIRED_COLUMNS = ['customer_name', 'payment_method', 'status', 'product_name', 'quantity', 'unit_price']
const VALID_PAYMENT_METHODS = ['cash', 'mpesa']
const VALID_STATUSES = ['completed', 'pending', 'cancelled']

export function SalesImport({ onSuccess, onClose }: SalesImportProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedSale[]>([])
  const [validSales, setValidSales] = useState<ParsedSale[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    success: number
    errors: number
    total: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase()
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      toast.error("Please select a CSV or Excel file")
      return
    }

    setFile(selectedFile)
    parseFile(selectedFile)
  }

  const parseFile = async (file: File) => {
    try {
      let rawData: any[] = []

      if (file.name.toLowerCase().endsWith('.csv')) {
        Papa.parse<ImportSaleRow>(file, {
          header: true,
          complete: (results) => {
            rawData = results.data
            processData(rawData)
          },
          error: (error) => {
            toast.error(`CSV parsing error: ${error.message}`)
          }
        })
      } else {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        rawData = XLSX.utils.sheet_to_json<ImportSaleRow>(worksheet)
        processData(rawData)
      }
    } catch (error) {
      toast.error("Error reading file")
      console.error(error)
    }
  }

  const processData = (rawData: any[]) => {
    // Group rows by sale (assuming rows with same sale_number or consecutive rows with same customer belong to same sale)
    const salesMap = new Map<string, ImportSaleRow[]>()
    let currentSaleKey = ''

    rawData.forEach((row, index) => {
      if (!row.customer_name) return // Skip empty rows

      // Create a key for grouping sales
      const saleKey = row.sale_number || 
                     (row.customer_name === rawData[index - 1]?.customer_name && 
                      row.payment_method === rawData[index - 1]?.payment_method ? 
                      currentSaleKey : `${row.customer_name}_${index}`)
      
      if (!salesMap.has(saleKey)) {
        salesMap.set(saleKey, [])
      }
      salesMap.get(saleKey)!.push(row)
      currentSaleKey = saleKey
    })

    const processed: ParsedSale[] = Array.from(salesMap.entries()).map(([saleKey, saleRows], saleIndex) => {
      const firstRow = saleRows[0]
      const errors: string[] = []
      const warnings: string[] = []

      // Validate sale-level fields
      if (!firstRow.customer_name?.trim()) {
        errors.push('Missing customer name')
      }

      if (!firstRow.payment_method || !VALID_PAYMENT_METHODS.includes(firstRow.payment_method.toLowerCase())) {
        errors.push(`Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`)
      }

      if (!firstRow.status || !VALID_STATUSES.includes(firstRow.status.toLowerCase())) {
        errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
      }

      // Process sale items
      const items: ParsedSaleItem[] = saleRows.map((row, itemIndex) => {
        const itemErrors: string[] = []
        
        if (!row.product_name?.trim()) {
          itemErrors.push('Missing product name')
        }

        if (!row.quantity || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0) {
          itemErrors.push('Invalid quantity (must be positive number)')
        }

        if (!row.unit_price || isNaN(Number(row.unit_price)) || Number(row.unit_price) <= 0) {
          itemErrors.push('Invalid unit price (must be positive number)')
        }

        const quantity = Number(row.quantity) || 0
        const unitPrice = Number(row.unit_price) || 0
        
        return {
          product_name: row.product_name?.toString().trim() || '',
          quantity,
          unit_price: unitPrice,
          total_price: quantity * unitPrice,
          errors: itemErrors
        }
      }).filter(item => item.product_name) // Remove empty items

      if (items.length === 0) {
        errors.push('No valid items in sale')
      }

      // Add item errors to sale errors
      items.forEach((item, itemIndex) => {
        if (item.errors.length > 0) {
          errors.push(`Item ${itemIndex + 1}: ${item.errors.join(', ')}`)
        }
      })

      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0)

      return {
        rowIndex: saleIndex + 1,
        sale_number: firstRow.sale_number || undefined,
        customer_name: firstRow.customer_name?.toString().trim() || '',
        customer_phone: firstRow.customer_phone?.toString().trim() || undefined,
        payment_method: (VALID_PAYMENT_METHODS.includes(firstRow.payment_method?.toLowerCase()) ? 
                        firstRow.payment_method.toLowerCase() : 'cash') as 'cash' | 'mpesa',
        status: (VALID_STATUSES.includes(firstRow.status?.toLowerCase()) ? 
                firstRow.status.toLowerCase() : 'completed') as 'completed' | 'pending' | 'cancelled',
        items,
        total_amount: totalAmount,
        errors,
        warnings
      }
    })

    setParsedData(processed)
    setValidSales(processed.filter(s => s.errors.length === 0))
    
    if (processed.length > 0) {
      toast.success(`Parsed ${processed.length} sales from file`)
    } else {
      toast.error("No valid sales found in file")
    }
  }

  const handleImport = async () => {
    if (validSales.length === 0) {
      toast.error("No valid sales to import")
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.")
        return
      }

      const response = await fetch('/api/sales/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          sales: validSales.map(s => ({
            sale_number: s.sale_number,
            customer_name: s.customer_name,
            customer_phone: s.customer_phone,
            payment_method: s.payment_method,
            status: s.status,
            items: s.items.map(item => ({
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price
            }))
          }))
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setImportResults({
        success: result.success,
        errors: result.errors,
        total: validSales.length
      })

      setImportProgress(100)
      toast.success(`Successfully imported ${result.success} sales`)
      onSuccess()
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'sale_number',
      'customer_name',
      'customer_phone',
      'payment_method',
      'status',
      'product_name',
      'quantity',
      'unit_price'
    ]

    const sampleData = [
      [
        'SALE-001',
        'John Doe',
        '0712345678',
        'cash',
        'completed',
        'Coca Cola 500ml',
        '2',
        '50'
      ],
      [
        '',  // Same sale, different item
        '',  // Customer name can be empty for additional items
        '',
        '',
        '',
        'Bread Loaf',
        '1',
        '45'
      ],
      [
        'SALE-002',
        'Jane Smith',
        '0798765432',
        'mpesa',
        'completed',
        'Milk 1L',
        '3',
        '60'
      ]
    ]

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sales_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasErrors = parsedData.some(s => s.errors.length > 0)
  const hasWarnings = parsedData.some(s => s.warnings.length > 0)

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Sales from Excel/CSV
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel file to bulk import sales data
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!file && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-lg font-medium mb-2">
              Drop your Excel/CSV file here or click to browse
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Supports .csv, .xlsx, and .xls files
            </p>
            <Button variant="outline">
              Select File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {file && parsedData.length > 0 && (
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">
                Data Preview ({parsedData.length} sales)
              </TabsTrigger>
              {(hasErrors || hasWarnings) && (
                <TabsTrigger value="validation">
                  Validation Issues
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
              {hasErrors && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {parsedData.filter(s => s.errors.length > 0).length} sales have errors and will be skipped during import.
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sale Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((sale, index) => (
                      <TableRow key={index} className={sale.errors.length > 0 ? 'bg-destructive/10' : ''}>
                        <TableCell>{sale.rowIndex}</TableCell>
                        <TableCell>
                          {sale.errors.length > 0 ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : sale.warnings.length > 0 ? (
                            <Badge variant="secondary">Warning</Badge>
                          ) : (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{sale.sale_number || 'Auto-generated'}</TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell>{sale.customer_phone || '-'}</TableCell>
                        <TableCell className="capitalize">{sale.payment_method}</TableCell>
                        <TableCell>{sale.items.length} items</TableCell>
                        <TableCell>KSh {sale.total_amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {(hasErrors || hasWarnings) && (
              <TabsContent value="validation" className="space-y-4">
                <div className="space-y-3">
                  {parsedData.filter(s => s.errors.length > 0 || s.warnings.length > 0).map((sale, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">
                          Sale {sale.rowIndex}: {sale.customer_name || 'Unnamed Customer'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {sale.errors.map((error, errorIndex) => (
                          <Alert key={errorIndex} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        ))}
                        {sale.warnings.map((warning, warningIndex) => (
                          <Alert key={warningIndex}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{warning}</AlertDescription>
                          </Alert>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}

        {isImporting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Importing sales...</span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} />
          </div>
        )}

        {importResults && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Import completed! Successfully imported {importResults.success} out of {importResults.total} sales.
              {importResults.errors > 0 && ` ${importResults.errors} sales failed to import.`}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="space-x-2">
            {file && (
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null)
                  setParsedData([])
                  setValidSales([])
                  setImportResults(null)
                }}
              >
                Clear File
              </Button>
            )}
            {validSales.length > 0 && !isImporting && !importResults && (
              <Button onClick={handleImport}>
                Import {validSales.length} Sales
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}