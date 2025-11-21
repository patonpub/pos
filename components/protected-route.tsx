'use client'

import { useAuth } from '@/contexts/auth-context'
import { LoginForm } from '@/components/login-form'
import { UserRole } from '@/lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireOwner?: boolean
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireOwner = false
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login form for unauthenticated users
  if (!user || !profile) {
    return <LoginForm />
  }

  // Check permissions
  const hasAccess = () => {
    if (requireOwner) {
      return profile.role === 'owner'
    }

    if (allowedRoles) {
      return allowedRoles.includes(profile.role)
    }

    return true
  }

  if (!hasAccess()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  // Render protected content
  return <>{children}</>
}