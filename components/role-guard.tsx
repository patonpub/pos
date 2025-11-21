'use client'

import { useAuth } from '@/contexts/auth-context'
import { UserRole } from '@/lib/supabase'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  fallback?: React.ReactNode
  requireOwner?: boolean
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback = null, 
  requireOwner = false 
}: RoleGuardProps) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        Loading...
      </div>
    )
  }

  if (!profile) {
    return fallback
  }

  const hasAccess = () => {
    if (requireOwner) {
      return profile.role === 'owner'
    }

    if (allowedRoles) {
      return allowedRoles.includes(profile.role)
    }

    // If no specific roles required, allow all authenticated users
    return true
  }

  if (!hasAccess()) {
    return fallback || (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p>You don&apos;t have permission to view this content.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}