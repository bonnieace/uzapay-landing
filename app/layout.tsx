import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UzaPay | Offline POS System for Kenyan Businesses',
  description:
    'UzaPay is an offline POS system for Kenyan businesses. Manage sales, inventory, receipts, staff and daily operations from mobile or desktop — even when the internet goes down.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
