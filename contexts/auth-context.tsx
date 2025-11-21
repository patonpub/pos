'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isOwner: boolean
  isEmployee: boolean
  isDemo: boolean
  // Legacy support for existing components
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    profile,
    loading,
    isOwner,
    isEmployee,
    isDemo,
    signIn,
    signOut,
    login,
    logout,
    initialize
  } = useAuthStore()

  useEffect(() => {
    // Initialize auth store when provider mounts
    initialize()
  }, [initialize])

  // Memoize context value to prevent unnecessary re-renders
  const value = React.useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signOut,
    isOwner,
    isEmployee,
    isDemo,
    // Legacy support
    login,
    logout,
    isLoading: loading,
  }), [user, profile, loading, signIn, signOut, isOwner, isEmployee, isDemo, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
