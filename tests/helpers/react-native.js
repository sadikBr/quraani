/**
 * The one stand-in for `react-native` in tests that cannot load the real module. Bun keeps a
 * mocked module for the rest of the run, across test files, so every file that mocks it must give
 * all of this: a partial stand-in from one file breaks the imports of a file that runs after it
 * (on GitHub, reader-services.test.js left one without Platform for recitation.test.js).
 */
export const reactNative = () => ({
  Platform: { OS: 'android', select: (options) => options.android ?? options.native ?? options.default },
  AppState: { addEventListener: () => ({ remove() {} }) },
});
