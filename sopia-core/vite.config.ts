import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      outDir: 'dist',
      insertTypesEntry: true,
      copyDtsFiles: false,
      rollupTypes: false // 개별 d.ts 파일 유지 (subpath export 지원)
    })
  ],
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'extension/index': resolve(__dirname, 'src/extension/index.ts')
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: [
        'lodash',
        'class-transformer',
        'reflect-metadata',
        'ws',
        // Node.js 내장 모듈
        'fs',
        'path',
        'node:fs',
        'node:path'
      ]
    },
    sourcemap: true
  },
  esbuild: {
    target: 'es2020'
  }
})
