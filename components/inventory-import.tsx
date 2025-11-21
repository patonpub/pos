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
import type { Product } from "@/lib/database-types"

interface ImportRow {
  name: string
  category: string
  unit_price: string
  cost_price: string
  stock_quantity: string
  min_stock_level: string
  unit: string
  supplier_id?: string
}

interface ParsedProduct extends Omit<Product, 'id' | 'created_at' | 'updated_at'> {
  rowIndex: number
  errors: string[]
  warnings: string[]
}

interface InventoryImportProps {
  onSuccess: () => void
  onClose: () => void
}

const REQUIRED_COLUMNS = ['name', 'category', 'unit_price', 'cost_price', 'stock_quantity', 'min_stock_level', 'unit']
const VALID_CATEGORIES = ["Beverages", "Snacks", "Dairy", "Household", "Grains", "Canned Goods", "Fresh Produce", "Meat", "Electronics", "Stationery"]

export function InventoryImport({ onSuccess, onClose }: InventoryImportProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([])
  const [validProducts, setValidProducts] = useState<ParsedProduct[]>([])
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
        Papa.parse<ImportRow>(file, {
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
        rawData = XLSX.utils.sheet_to_json<ImportRow>(worksheet)
        processData(rawData)
      }
    } catch (error) {
      toast.error("Error reading file")
      console.error(error)
    }
  }

  const processData = (rawData: any[]) => {
    const processed: ParsedProduct[] = rawData.map((row, index) => {
      const errors: string[] = []
      const warnings: string[] = []

      // Check required columns
      REQUIRED_COLUMNS.forEach(col => {
        if (!row[col] || row[col].toString().trim() === '') {
          errors.push(`Missing required field: ${col}`)
        }
      })

      // Validate category
      if (row.category && !VALID_CATEGORIES.includes(row.category)) {
        warnings.push(`Invalid category: ${row.category}. Will use 'Household' as default.`)
      }

      // Validate numeric fields
      const numericFields = ['unit_price', 'cost_price', 'stock_quantity', 'min_stock_level']
      numericFields.forEach(field => {
        if (row[field] && isNaN(Number(row[field]))) {
          errors.push(`Invalid number format for ${field}: ${row[field]}`)
        }
      })

      // Validate stock quantity and min stock level are non-negative
      if (row.stock_quantity && Number(row.stock_quantity) < 0) {
        errors.push("Stock quantity cannot be negative")
      }
      if (row.min_stock_level && Number(row.min_stock_level) < 0) {
        errors.push("Minimum stock level cannot be negative")
      }

      // Validate unit price and cost price are positive
      if (row.unit_price && Number(row.unit_price) <= 0) {
        errors.push("Selling price must be positive")
      }
      if (row.cost_price && Number(row.cost_price) <= 0) {
        errors.push("Buying price must be positive")
      }

      return {
        rowIndex: index + 1,
        name: row.name?.toString().trim() || '',
        category: VALID_CATEGORIES.includes(row.category) ? row.category : 'Household',
        unit_price: Number(row.unit_price) || 0,
        cost_price: Number(row.cost_price) || 0,
        stock_quantity: Number(row.stock_quantity) || 0,
        min_stock_level: Number(row.min_stock_level) || 0,
        unit: row.unit?.toString().trim() || 'piece',
        supplier_id: row.supplier_id || null,
        errors,
        warnings
      }
    }).filter(item => item.name) // Remove empty rows

    setParsedData(processed)
    setValidProducts(processed.filter(p => p.errors.length === 0))
    
    if (processed.length > 0) {
      toast.success(`Parsed ${processed.length} products from file`)
    } else {
      toast.error("No valid products found in file")
    }
  }

  const handleImport = async () => {
    if (validProducts.length === 0) {
      toast.error("No valid products to import")
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

      const response = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          products: validProducts.map(p => ({
            name: p.name,
            category: p.category,
            unit_price: p.unit_price,
            cost_price: p.cost_price,
            stock_quantity: p.stock_quantity,
            min_stock_level: p.min_stock_level,
            unit: p.unit,
            supplier_id: p.supplier_id
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
        total: validProducts.length
      })

      setImportProgress(100)
      toast.success(`Successfully imported ${result.success} products`)
      onSuccess()
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'name',
      'category',
      'unit_price',
      'cost_price',
      'stock_quantity',
      'min_stock_level',
      'unit',
      'supplier_id'
    ]

    const sampleData = [
      [
        'Sample Product',
        'Beverages',
        '50',
        '40',
        '100',
        '10',
        'bottle',
        ''
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
    a.download = 'inventory_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasErrors = parsedData.some(p => p.errors.length > 0)
  const hasWarnings = parsedData.some(p => p.warnings.length > 0)

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Inventory from Excel/CSV
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel file to bulk import products to your inventory
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
                Data Preview ({parsedData.length} rows)
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
                    {parsedData.filter(p => p.errors.length > 0).length} rows have errors and will be skipped during import.
                  </AlertDescription>
                </Alert>
              )}

              {hasWarnings && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Some rows have warnings but can still be imported with corrections applied.
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>Buying Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Min Stock</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((product, index) => (
                      <TableRow key={index} className={product.errors.length > 0 ? 'bg-destructive/10' : ''}>
                        <TableCell>{product.rowIndex}</TableCell>
                        <TableCell>
                          {product.errors.length > 0 ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : product.warnings.length > 0 ? (
                            <Badge variant="secondary">Warning</Badge>
                          ) : (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>KSh {product.unit_price.toLocaleString()}</TableCell>
                        <TableCell>KSh {product.cost_price.toLocaleString()}</TableCell>
                        <TableCell>{product.stock_quantity}</TableCell>
                        <TableCell>{product.min_stock_level}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {(hasErrors || hasWarnings) && (
              <TabsContent value="validation" className="space-y-4">
                <div className="space-y-3">
                  {parsedData.filter(p => p.errors.length > 0 || p.warnings.length > 0).map((product, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">
                          Row {product.rowIndex}: {product.name || 'Unnamed Product'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {product.errors.map((error, errorIndex) => (
                          <Alert key={errorIndex} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        ))}
                        {product.warnings.map((warning, warningIndex) => (
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
              <span>Importing products...</span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} />
          </div>
        )}

        {importResults && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Import completed! Successfully imported {importResults.success} out of {importResults.total} products.
              {importResults.errors > 0 && ` ${importResults.errors} products failed to import.`}
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
                  setValidProducts([])
                  setImportResults(null)
                }}
              >
                Clear File
              </Button>
            )}
            {validProducts.length > 0 && !isImporting && !importResults && (
              <Button onClick={handleImport}>
                Import {validProducts.length} Products
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}