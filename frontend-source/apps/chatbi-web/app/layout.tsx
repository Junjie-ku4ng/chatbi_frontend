import type { Metadata } from 'next'
import { Manrope, IBM_Plex_Sans } from 'next/font/google'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import './globals.css'
import 'antd/dist/reset.css'
import { AppProviders } from '@/modules/shared/providers'

const titleFont = Manrope({
  subsets: ['latin'],
  variable: '--font-title',
  weight: ['400', '500', '600', '700']
})

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600']
})

export const metadata: Metadata = {
  title: 'PA Nexus',
  description: 'PA Nexus: OLAP and AI attribution analysis workspace'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titleFont.variable} ${bodyFont.variable}`}>
      <body style={{ fontFamily: 'var(--font-body), sans-serif' }}>
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  )
}
