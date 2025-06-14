module.exports = {
  testEnvironment: "jest-environment-jsdom", // or 'node' for API routes if preferred
  setupFilesAfterEnv: ["./jest.setup.js"], // For global setup like jest-fetch-mock
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  moduleFileExtensions: ["js", "jsx", "json", "node"],
  // Add any module name mappers if your project uses them (e.g., @/components/*)
  // moduleNameMapper: {
  //   "^@/(.*)$": "<rootDir>/src/$1",
  // },
  // Ignore Next.js specific files/folders if not needed for API tests
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/public/"
  ],
  // Collect coverage from API routes
  collectCoverageFrom: [
    "src/app/api/**/*.js",
    "!src/app/api/**/DESIGN.md", // Exclude markdown files
    "!**/node_modules/**",
    "!jest.config.js",
    "!babel.config.js",
    "!jest.setup.js"
  ],
  coverageReporters: ["json", "lcov", "text", "clover"],
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
};
