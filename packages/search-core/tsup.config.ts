import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false
    }
  },
  outDir: 'dist',
  clean: true,
  tsconfig: 'tsconfig.json'
})
