"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { DateRange } from 'react-day-picker'

export interface InventoryDateFilterState {
  dateRange: DateRange | undefined
  setDateRange: (dateRange: DateRange | undefined) => void
  getFormattedDateRange: () => { startDate?: string; endDate?: string }
  isFiltered: boolean
  clearFilter: () => void
}

const InventoryDateFilterContext = createContext<InventoryDateFilterState | undefined>(undefined)

export function useInventoryDateFilter() {
  const context = useContext(InventoryDateFilterContext)
  if (context === undefined) {
    throw new Error('useInventoryDateFilter must be used within an InventoryDateFilterProvider')
  }
  return context
}

interface InventoryDateFilterProviderProps {
  children: ReactNode
}

export function InventoryDateFilterProvider({ children }: InventoryDateFilterProviderProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    // Initialize with undefined for "all time" as default for inventory
    return undefined
  })

  const getFormattedDateRange = useCallback(() => {
    if (!dateRange?.from) return {}

    return {
      startDate: dateRange.from.toISOString().split('T')[0],
      endDate: dateRange.to?.toISOString().split('T')[0] || dateRange.from.toISOString().split('T')[0]
    }
  }, [dateRange])

  const isFiltered = !!(dateRange?.from)

  const clearFilter = useCallback(() => {
    setDateRange(undefined)
  }, [])

  return (
    <InventoryDateFilterContext.Provider
      value={{
        dateRange,
        setDateRange,
        getFormattedDateRange,
        isFiltered,
        clearFilter,
      }}
    >
      {children}
    </InventoryDateFilterContext.Provider>
  )
}