"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "./card"

interface MobileTableProps {
  children: React.ReactNode
  className?: string
}

interface MobileTableCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

interface MobileTableRowProps {
  label: string
  value: React.ReactNode
  className?: string
}

function MobileTable({ children, className, ...props }: MobileTableProps) {
  return (
    <div className={cn("space-y-4 md:hidden", className)} {...props}>
      {children}
    </div>
  )
}

function MobileTableCard({ children, className, onClick, ...props }: MobileTableCardProps) {
  return (
    <Card 
      className={cn("p-4 cursor-pointer hover:shadow-md transition-shadow", className)} 
      onClick={onClick}
      {...props}
    >
      {children}
    </Card>
  )
}

function MobileTableRow({ label, value, className, ...props }: MobileTableRowProps) {
  return (
    <div className={cn("flex justify-between items-center py-1", className)} {...props}>
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export {
  MobileTable,
  MobileTableCard,
  MobileTableRow,
}