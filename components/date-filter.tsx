"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { useDateFilter } from "@/contexts/date-filter-context"

interface DateFilterProps {
  className?: string
}

const presetRanges = [
  {
    label: "All Time",
    value: "alltime",
    getRange: () => {
      return undefined // No date range means all time
    }
  },
  {
    label: "Today",
    value: "today",
    getRange: () => {
      const today = new Date()
      return { from: today, to: today }
    }
  },
  {
    label: "Yesterday",
    value: "yesterday",
    getRange: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return { from: yesterday, to: yesterday }
    }
  },
  {
    label: "Last 7 days",
    value: "last7days",
    getRange: () => {
      const today = new Date()
      const lastWeek = new Date()
      lastWeek.setDate(today.getDate() - 6)
      return { from: lastWeek, to: today }
    }
  },
  {
    label: "Last 30 days",
    value: "last30days",
    getRange: () => {
      const today = new Date()
      const lastMonth = new Date()
      lastMonth.setDate(today.getDate() - 29)
      return { from: lastMonth, to: today }
    }
  },
  {
    label: "This month",
    value: "thismonth",
    getRange: () => {
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from: firstDay, to: lastDay }
    }
  },
  {
    label: "Last month",
    value: "lastmonth",
    getRange: () => {
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: firstDay, to: lastDay }
    }
  }
]

export function DateFilter({ className }: DateFilterProps) {
  const { dateRange, setDateRange, clearFilter } = useDateFilter()
  const [selectedPreset, setSelectedPreset] = useState("today")

  const handlePresetChange = (value: string) => {
    if (value === "custom") {
      setSelectedPreset("custom")
      return
    }

    const preset = presetRanges.find(p => p.value === value)
    if (preset) {
      const range = preset.getRange()
      if (value === "alltime") {
        clearFilter()
      } else {
        setDateRange(range)
      }
      setSelectedPreset(value)
    }
  }

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range)
    setSelectedPreset(range ? "custom" : "alltime")
  }

  const handleClear = () => {
    clearFilter()
    setSelectedPreset("alltime")
  }

  const formatDateRange = (dateRange?: DateRange) => {
    if (!dateRange?.from) {
      return "All Time"
    }

    if (dateRange.from && dateRange.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return format(dateRange.from, "MMM d, yyyy")
      }
      return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
    }

    return format(dateRange.from, "MMM d, yyyy")
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Quick select" />
        </SelectTrigger>
        <SelectContent>
          {presetRanges.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full sm:w-[280px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(dateRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
          <div className="p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="w-full"
            >
              Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}