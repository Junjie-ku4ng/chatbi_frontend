import path from 'node:path'
import { defineConfig } from 'vitest/config'

const localNodeModules = path.resolve(__dirname, 'node_modules')

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@opal': path.resolve(__dirname, '../../vendor/onyx-foss/web/lib/opal/src'),
      '@metad/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      '@metad/contracts/analytics/semantic-model': path.resolve(
        __dirname,
        '../../packages/contracts/src/analytics/semantic-model.ts'
      ),
      '@metad/store': path.resolve(__dirname, '../../packages/store/src/index.ts'),
      '@metad/ocap-core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@metad/ocap-echarts': path.resolve(__dirname, '../../packages/echarts/src/index.ts'),
      '@metad/ocap-sql': path.resolve(__dirname, '../../packages/sql/src/index.ts'),
      '@metad/ocap-xmla': path.resolve(__dirname, '../../packages/xmla/src/index.ts'),
      '@radix-ui/react-slot': path.resolve(localNodeModules, '@radix-ui/react-slot'),
      '@radix-ui/react-tooltip': path.resolve(localNodeModules, '@radix-ui/react-tooltip'),
      'clsx': path.resolve(localNodeModules, 'clsx'),
      'next/link': path.resolve(localNodeModules, 'next/link.js'),
      'next/navigation': path.resolve(localNodeModules, 'next/navigation.js'),
      'react-markdown': path.resolve(localNodeModules, 'react-markdown'),
      'remark-gfm': path.resolve(localNodeModules, 'remark-gfm'),
      'tailwind-merge': path.resolve(localNodeModules, 'tailwind-merge')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.tsx']
  }
})
