const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// User-facing text lives in src/i18n/locales. Arabic outside it is either a
// mistake or Quran data/matching, which is marked with a disable comment.
const arabic = '[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]';
const message = 'Put user-facing text in src/i18n/locales and use t(). For Quran data or text matching, add `// eslint-disable-next-line no-restricted-syntax -- <reason>`.';

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/i18n/locales/**'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: `Literal[value=/${arabic}/]`, message },
        { selector: `TemplateElement[value.raw=/${arabic}/]`, message },
        { selector: `JSXText[value=/${arabic}/]`, message },
      ],
    },
  },
]);
