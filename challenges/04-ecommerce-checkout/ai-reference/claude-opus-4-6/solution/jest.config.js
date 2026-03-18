module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
