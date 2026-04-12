'use client'

import '@ant-design/v5-patch-for-react-19'
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd'
import type { ReactNode } from 'react'

const brandPrimary = '#0d5fd8'

export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: [antdTheme.defaultAlgorithm],
        token: {
          colorPrimary: brandPrimary,
          colorInfo: '#0d5fd8',
          colorSuccess: '#13795b',
          colorWarning: '#9d5d00',
          colorError: '#c53338',
          colorBgLayout: '#edf2f8',
          colorBgContainer: '#ffffff',
          borderRadius: 13,
          borderRadiusLG: 16,
          fontFamily: 'var(--font-body), sans-serif'
        },
        components: {
          Layout: {
            siderBg: '#f4f8ff',
            bodyBg: '#edf2f8',
            headerBg: '#fdfefe'
          },
          Card: {
            borderRadiusLG: 16
          },
          Input: {
            borderRadius: 12
          },
          Button: {
            borderRadius: 12
          }
        }
      }}
    >
      <AntdApp>
        <span data-testid="antd-provider-ready" hidden>
          ready
        </span>
        {children}
      </AntdApp>
    </ConfigProvider>
  )
}
