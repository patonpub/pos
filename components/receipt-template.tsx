"use client"

import type React from "react"
import { forwardRef } from "react"
import type { SaleWithItems, BusinessSettings } from "@/lib/database-types"
import { format } from "date-fns"

interface ReceiptTemplateProps {
  sale: SaleWithItems
  businessSettings: BusinessSettings
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ sale, businessSettings }, ref) => {
    const subtotal = sale.sale_items.reduce((sum, item) => sum + item.total_price, 0)
    const tax = sale.tax_amount || 0
    const total = sale.total_amount

    return (
      <div
        ref={ref}
        className="thermal-receipt"
        style={{
          width: '80mm',
          padding: '10mm',
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.4',
          color: '#000',
          backgroundColor: '#fff'
        }}
      >
        {/* Business Logo */}
        {businessSettings.logo_url && (
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <img
              src={businessSettings.logo_url}
              alt="Business Logo"
              style={{
                maxWidth: '60mm',
                height: 'auto',
                margin: '0 auto'
              }}
            />
          </div>
        )}

        {/* Business Address */}
        {businessSettings.address && (
          <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '3px' }}>
            {businessSettings.address}
          </div>
        )}

        {/* Business Contact */}
        <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '3px' }}>
          {businessSettings.phone && <span>Tel: {businessSettings.phone}</span>}
          {businessSettings.phone && businessSettings.email && <span> | </span>}
          {businessSettings.email && <span>{businessSettings.email}</span>}
        </div>

        {/* Tax & Registration Numbers */}
        {(businessSettings.tax_id || businessSettings.registration_number) && (
          <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '10px' }}>
            {businessSettings.tax_id && <div>PIN: {businessSettings.tax_id}</div>}
            {businessSettings.registration_number && <div>Reg: {businessSettings.registration_number}</div>}
          </div>
        )}

        {/* Separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

        {/* Sale Information */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Receipt #:</span>
            <span style={{ fontWeight: 'bold' }}>{sale.sale_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date:</span>
            <span>{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          {sale.customer_name && sale.customer_name.toLowerCase() !== 'walk-in customer' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Customer:</span>
                <span>{sale.customer_name}</span>
              </div>
              {sale.customer_phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Phone:</span>
                  <span>{sale.customer_phone}</span>
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Served by:</span>
            <span>{sale.user_profiles?.email || ''}</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

        {/* Items Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 40px 60px',
          gap: '5px',
          fontWeight: 'bold',
          marginBottom: '5px',
          fontSize: '11px'
        }}>
          <div>ITEM</div>
          <div style={{ textAlign: 'center' }}>QTY</div>
          <div style={{ textAlign: 'right' }}>AMOUNT</div>
        </div>

        {/* Items List */}
        {sale.sale_items.map((item, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
              {item.products?.name || 'Unknown Product'}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 40px 60px',
              gap: '5px',
              fontSize: '11px'
            }}>
              <div style={{ fontSize: '10px', color: '#666' }}>
                @ KSh {Math.round(item.unit_price).toLocaleString()}
              </div>
              <div style={{ textAlign: 'center' }}>{item.quantity}</div>
              <div style={{ textAlign: 'right' }}>
                KSh {Math.round(item.total_price).toLocaleString()}
              </div>
            </div>
          </div>
        ))}

        {/* Separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

        {/* Totals */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Subtotal:</span>
            <span>KSh {Math.round(subtotal).toLocaleString()}</span>
          </div>
          {tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Tax:</span>
              <span>KSh {Math.round(tax).toLocaleString()}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: 'bold',
            marginTop: '5px',
            paddingTop: '5px',
            borderTop: '1px solid #000'
          }}>
            <span>TOTAL:</span>
            <span>KSh {Math.round(total).toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          marginBottom: '10px',
          padding: '5px',
          backgroundColor: '#f0f0f0'
        }}>
          Payment Method: <strong>{sale.payment_method.toUpperCase()}</strong>
        </div>

        {/* Status */}
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          marginBottom: '10px'
        }}>
          Status: <strong>{sale.status.toUpperCase()}</strong>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

        {/* Footer Message */}
        {businessSettings.footer_message && (
          <div style={{
            textAlign: 'center',
            fontSize: '11px',
            marginTop: '10px',
            marginBottom: '10px',
            fontStyle: 'italic'
          }}>
            {businessSettings.footer_message}
          </div>
        )}

        {/* Generated By */}
        <div style={{
          textAlign: 'center',
          fontSize: '9px',
          color: '#666',
          marginTop: '15px'
        }}>
          Powered by {businessSettings.business_name}
        </div>
      </div>
    )
  }
)

ReceiptTemplate.displayName = 'ReceiptTemplate'
