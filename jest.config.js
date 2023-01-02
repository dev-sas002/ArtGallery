/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  // Restrict discovery to *.test.ts(x) so helper/mock files living under
  // __tests__ are not picked up as (empty) test suites.
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      // tsconfig.json keeps `jsx: "preserve"` for the Next.js compiler, but
      // ts-jest has to emit real JSX factory calls to run components.
      { tsconfig: { jsx: 'react-jsx' } },
    ],
  },
  moduleNameMapper: {
    '\\.(css|sass|scss)$': '<rootDir>/__tests__/__mocks__/styleMock.js',
    // next/image needs the Next runtime to resolve its optimiser config; the
    // stub renders a plain <img> so component tests can assert on real DOM.
    '^next/image$': '<rootDir>/__tests__/__mocks__/nextImageMock.tsx',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'hooks/**/*.ts',
    'components/**/*.tsx',
    'pages/**/*.{ts,tsx}',
    '!pages/_app.tsx',
  ],
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 },
  },
}
