"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Settings, Save, RefreshCw, Upload, X } from "lucide-react"
import { getBusinessSettings, updateBusinessSettings, createBusinessSettings } from "@/lib/database"
import type { BusinessSettings } from "@/lib/database-types"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

function SettingsContent() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    business_name: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
    tax_id: '',
    registration_number: '',
    footer_message: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const data = await getBusinessSettings()
      setSettings(data)
      setFormData({
        business_name: data.business_name || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        logo_url: data.logo_url || '',
        tax_id: data.tax_id || '',
        registration_number: data.registration_number || '',
        footer_message: data.footer_message || 'Thank you for your business!'
      })
      // Set logo preview if logo exists
      if (data.logo_url) {
        setLogoPreview(data.logo_url)
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
      toast.error("Failed to load business settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB')
      return
    }

    setLogoFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = async () => {
    setLogoFile(null)
    setLogoPreview(null)

    // If there's an existing logo in storage, delete it
    if (formData.logo_url) {
      try {
        // Extract file path from URL
        const urlParts = formData.logo_url.split('/logos/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0] // Remove query params
          await supabase.storage.from('logos').remove([filePath])
        }
      } catch (error) {
        console.error('Error removing old logo:', error)
      }
    }

    setFormData({ ...formData, logo_url: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return formData.logo_url || null

    try {
      setIsUploadingLogo(true)

      // Delete old logo if exists
      if (formData.logo_url) {
        const urlParts = formData.logo_url.split('/logos/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0]
          await supabase.storage.from('logos').remove([filePath])
        }
      }

      // Generate unique filename
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo')
      return null
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Upload logo if a new file was selected
      let logoUrl = formData.logo_url
      if (logoFile) {
        const uploadedUrl = await uploadLogo()
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        } else {
          // If upload failed, don't save
          return
        }
      }

      const dataToSave = { ...formData, logo_url: logoUrl }

      if (settings && settings.id) {
        await updateBusinessSettings(settings.id, dataToSave)
        toast.success("Business settings updated successfully")
      } else {
        await createBusinessSettings(dataToSave)
        toast.success("Business settings created successfully")
      }

      // Reset logo file state
      setLogoFile(null)
      await loadSettings()
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error("Failed to save business settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Business Settings</h1>
          </div>
          <Button onClick={handleSave} disabled={isSaving || isUploadingLogo}>
            {isSaving || isUploadingLogo ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {isUploadingLogo ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Update your business details. This information will appear on receipts and throughout the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Enter business name"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter business address"
                    rows={3}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+254 XXX XXXXXX"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="business@example.com"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="logo">Business Logo</Label>
                  <div className="flex flex-col gap-4">
                    {logoPreview && (
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-white">
                        <Image
                          src={logoPreview}
                          alt="Business logo preview"
                          fill
                          className="object-contain p-2"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        ref={fileInputRef}
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {logoPreview ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload an image file for your business logo (max 2MB)
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tax_id">Tax ID / PIN</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      placeholder="Enter tax identification number"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="registration_number">Registration Number</Label>
                    <Input
                      id="registration_number"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      placeholder="Enter business registration number"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="footer_message">Receipt Footer Message</Label>
                  <Textarea
                    id="footer_message"
                    value={formData.footer_message}
                    onChange={(e) => setFormData({ ...formData, footer_message: e.target.value })}
                    placeholder="Thank you for your business!"
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">
                    This message will appear at the bottom of all receipts
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute requireOwner>
      <SettingsContent />
    </ProtectedRoute>
  )
}
