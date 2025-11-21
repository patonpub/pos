import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'POS System - Point of Sale & Inventory Management'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Image generation
export default async function OpenGraphImage() {
  // Fetch business settings
  let businessName = 'POS System';

  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select('business_name')
      .single();

    if (data && !error) {
      businessName = data.business_name;
    }
  } catch (error) {
    console.error('Failed to fetch business settings for OG image:', error);
  }

  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: 'white',
        }}
      >
        {/* Shopping Cart Icon */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            padding: '40px',
            marginBottom: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="m2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57L23 6H6" />
          </svg>
        </div>
        
        {/* App Name */}
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            margin: '0 0 20px 0',
            textAlign: 'center',
          }}
        >
          {businessName}
        </h1>
        
        {/* Subtitle */}
        <p
          style={{
            fontSize: '32px',
            margin: '0',
            textAlign: 'center',
            opacity: 0.9,
          }}
        >
          Point of Sale & Inventory Management System
        </p>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  )
}