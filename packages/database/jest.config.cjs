/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          target: 'esnext'
        },
        isolatedModules: false
      }
    ]
  },
  moduleNameMapper: {
    '^@podcast_search/config$': '<rootDir>/../../packages/config/src/index.ts'
  },
  verbose: true
}
