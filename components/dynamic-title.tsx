'use client';

import { useEffect } from 'react';
import { useBusinessSettings } from '@/contexts/business-settings-context';
import { usePathname } from 'next/navigation';

export function DynamicTitle() {
  const { businessSettings } = useBusinessSettings();
  const pathname = usePathname();

  useEffect(() => {
    if (businessSettings?.business_name) {
      // Get page-specific title suffix
      let pageName = '';

      if (pathname === '/') {
        pageName = 'Dashboard';
      } else {
        // Extract page name from pathname
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          pageName = segments[0]
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }

      // Update document title
      const newTitle = pageName
        ? `${pageName} - ${businessSettings.business_name}`
        : businessSettings.business_name;

      document.title = newTitle;
    }
  }, [businessSettings, pathname]);

  return null; // This component doesn't render anything
}
