import type React from "react"

interface TuIconProps {
  className?: string
}

export function TuIcon({ className = "h-6 w-6" }: TuIconProps) {
  return (
    <div className={`${className} bg-primary rounded-sm flex items-center justify-center text-primary-foreground font-bold text-xs`}>
      TU
    </div>
  )
}