"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { DateRange } from 'react-day-picker'

export interface DateFilterState {
  dateRange: DateRange | undefined
  setDateRange: (dateRange: DateRange | undefined) => void
  getFormattedDateRange: () => { startDate?: string; endDate?: string }
  isFiltered: boolean
  clearFilter: () => void
}

const DateFilterContext = createContext<DateFilterState | undefined>(undefined)

export function useDateFilter() {
  const context = useContext(DateFilterContext)
  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider')
  }
  return context
}

interface DateFilterProviderProps {
  children: ReactNode
}

export function DateFilterProvider({ children }: DateFilterProviderProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    // Initialize with today's date as default
    const today = new Date()
    return { from: today, to: today }
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
    <DateFilterContext.Provider
      value={{
        dateRange,
        setDateRange,
        getFormattedDateRange,
        isFiltered,
        clearFilter,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  )
}