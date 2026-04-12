import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PA Nexus V2',
  description: 'Onyx-inspired Ask workspace bootstrap for pa-chatbi'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
