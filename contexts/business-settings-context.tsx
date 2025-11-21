'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { BusinessSettings } from '@/lib/database-types';
import { getBusinessSettings } from '@/lib/database';

interface BusinessSettingsContextType {
  businessSettings: BusinessSettings | null;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextType | undefined>(undefined);

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await getBusinessSettings();
      setBusinessSettings(settings);
    } catch (error) {
      console.error('Failed to load business settings:', error);
      // Set default fallback
      setBusinessSettings({
        id: 'default',
        business_name: 'POS System',
        address: null,
        phone: null,
        email: null,
        logo_url: null,
        tax_id: null,
        registration_number: null,
        footer_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const refreshSettings = async () => {
    await loadSettings();
  };

  return (
    <BusinessSettingsContext.Provider
      value={{
        businessSettings,
        isLoading,
        refreshSettings,
      }}
    >
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  const context = useContext(BusinessSettingsContext);
  if (context === undefined) {
    throw new Error('useBusinessSettings must be used within a BusinessSettingsProvider');
  }
  return context;
}
