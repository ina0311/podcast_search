import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/seed/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  external: [
    '@prisma/client',
    '.prisma/client',
    '@prisma/client-runtime-utils',
    /^\.prisma\/.*/,
    /^@prisma\/.*/
  ],
  dts: false,
  clean: true
})
