"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { FloatingSaleButton } from "@/components/floating-sale-button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getBusinessSettings } from "@/lib/database"
import type { BusinessSettings } from "@/lib/database-types"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  BarChart3,
  Receipt,
  Building,
  AlertTriangle,
  UserCheck,
  Menu,
  LogOut,
  X,
  Settings,
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
  currentPage: string
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/", roles: ["owner"] },
  { id: "inventory", label: "Inventory", icon: Package, href: "/inventory", roles: ["owner"] },
  { id: "sales", label: "Sales", icon: ShoppingCart, href: "/sales", roles: ["owner", "employee"] },
  { id: "purchases", label: "Purchases", icon: ShoppingBag, href: "/purchases", roles: ["owner"] },
  { id: "suppliers", label: "Suppliers", icon: Users, href: "/suppliers", roles: ["owner"] },
  { id: "expenses", label: "Expenses", icon: Receipt, href: "/expenses", roles: ["owner"] },
  { id: "breakages", label: "Breakages", icon: AlertTriangle, href: "/breakages", roles: ["owner"] },
  { id: "debtors", label: "Debtors", icon: UserCheck, href: "/debtors", roles: ["owner"] },
  { id: "assets", label: "Assets", icon: Building, href: "/assets", roles: ["owner"] },
  { id: "reports", label: "Reports", icon: BarChart3, href: "/reports", roles: ["owner"] },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings", roles: ["owner"] },
]

export function DashboardLayout({ children, currentPage }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null)
  const { user, profile, logout, loading } = useAuth()
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Handle mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Force light theme for employees
  useEffect(() => {
    if (mounted && !loading && profile?.role === 'employee') {
      setTheme('light')
    }
  }, [mounted, loading, profile?.role, setTheme])

  // Fetch business settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getBusinessSettings()
        setBusinessSettings(settings)
      } catch (error) {
        console.error("Failed to load business settings:", error)
      }
    }
    loadSettings()
  }, [])

  // Show all items while loading, then filter by role when loaded
  const availableNavItems = loading
    ? navigationItems
    : navigationItems.filter(item =>
        profile?.role ? item.roles.includes(profile.role) : false
      )

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-full lg:w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 h-16 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-full">
                <ShoppingCart className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-primary dark:text-white">
                {businessSettings?.business_name || 'Tushop'}
              </h1>
            </div>
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {availableNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || currentPage === item.id
              return (
                <Link key={item.id} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start ${loading ? 'opacity-75' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className={`w-full justify-start text-destructive hover:text-destructive ${loading ? 'opacity-50' : ''}`}
              onClick={() => logout()}
              disabled={loading}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card border-b px-4 h-16 flex items-center justify-between lg:px-6">
          <Button variant="ghost" size="sm" className="lg:hidden border border-border/50" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold capitalize">{currentPage}</h2>
          </div>

          <div className="flex items-center space-x-2">
            {profile?.role === 'owner' && <ThemeToggle />}
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-2 text-sm font-medium">
                {loading ? (
                  <>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
                  </>
                ) : (
                  <>
                    <span className="truncate max-w-[120px] md:max-w-none">{user?.email}</span>
                    {profile?.role && (
                      <Badge variant="secondary" className="capitalize">
                        {profile.role}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Floating Sale Button - Mobile Only */}
      <FloatingSaleButton />
    </div>
  )
}
