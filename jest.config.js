/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps'],
  testMatch: ['**/*.steps.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'feature'],
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
    '^@podcast_search/config$': '<rootDir>/packages/config/src/index.ts',
    '^@podcast_search/database$': '<rootDir>/packages/database/src/index.ts',
    '^@podcast_search/search-core$': '<rootDir>/packages/search-core/src/index.ts'
  },
  transformIgnorePatterns: ['node_modules/(?!(@prisma)/)'],
  collectCoverageFrom: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts', '!**/*.d.ts'],
  coverageDirectory: 'coverage',
  verbose: true
}
