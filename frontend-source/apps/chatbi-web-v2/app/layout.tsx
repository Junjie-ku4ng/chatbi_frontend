import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '镜元智算',
  description: '镜元智算智能问答工作台'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
