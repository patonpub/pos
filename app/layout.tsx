import type React from "react"
import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { DateFilterProvider } from "@/contexts/date-filter-context"
import { BusinessSettingsProvider } from "@/contexts/business-settings-context"
import { ThemeProvider } from "@/components/theme-provider"
import { EmployeeThemeWrapper } from "@/components/employee-theme-wrapper"
import { SyncProvider } from "@/components/sync-provider"
import { DynamicTitle } from "@/components/dynamic-title"
import { Toaster } from "sonner"
import { Suspense } from "react"
import "./globals.css"

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: "POS System - Point of Sale & Inventory Management",
  description: "A comprehensive Point of Sale (POS) and inventory management system built for small to medium businesses with role-based access control.",
  keywords: ["POS", "Point of Sale", "Inventory Management", "Business", "Retail", "Shop Management"],
  authors: [{ name: "POS System" }],
  creator: "POS System",
  publisher: "POS System",
  metadataBase: new URL('http://localhost:3000'),
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'POS System - Point of Sale & Inventory Management',
    description: 'A comprehensive Point of Sale (POS) and inventory management system built for small to medium businesses with role-based access control.',
    siteName: 'POS System',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'POS System - Point of Sale & Inventory Management',
    description: 'A comprehensive Point of Sale (POS) and inventory management system built for small to medium businesses with role-based access control.',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${outfit.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <BusinessSettingsProvider>
              <DynamicTitle />
              <AuthProvider>
                <EmployeeThemeWrapper>
                  <DateFilterProvider>
                    <SyncProvider>
                      {children}
                    </SyncProvider>
                  </DateFilterProvider>
                </EmployeeThemeWrapper>
              </AuthProvider>
            </BusinessSettingsProvider>
          </Suspense>
          <Toaster richColors position="top-center" offset="20px" />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
