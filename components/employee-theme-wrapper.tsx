'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/auth-context'

export function EmployeeThemeWrapper({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme()
  const { profile, loading } = useAuth()

  useEffect(() => {
    // Force light theme for employees, immediately and on every render
    if (!loading && profile?.role === 'employee') {
      // Force it synchronously
      setTheme('light')

      // Also set it via document to ensure it takes effect immediately
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [profile?.role, loading, setTheme])

  // Also force on mount for employees
  useEffect(() => {
    if (!loading && profile?.role === 'employee') {
      setTheme('light')
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [])

  return <>{children}</>
}
