import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { applyReleaseSigning } from '../plugins/with-release-signing';

// The `android { … }` block of app/build.gradle as `expo prebuild` writes it for SDK 57.
const gradle = readFileSync(new URL('./fixtures/expo-57-app-build-gradle.txt', import.meta.url), 'utf8');

test('release builds sign with the CI key when it is given, and with the debug key otherwise', () => {
  const signed = applyReleaseSigning(gradle);
  expect(signed).toContain("storeFile file(System.getenv('ANDROID_KEYSTORE_FILE'))");
  const release = signed.slice(signed.indexOf('buildTypes')).match(/release\s*\{[^}]*\}/)[0];
  expect(release).toContain("signingConfig System.getenv('ANDROID_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug");
  const debug = signed.slice(signed.indexOf('buildTypes')).match(/debug\s*\{[^}]*\}/)[0];
  expect(debug).toContain('signingConfig signingConfigs.debug');
  // Applying it twice changes nothing.
  expect(applyReleaseSigning(signed)).toBe(signed);
});

test('a template without the expected blocks fails the build instead of signing with the debug key', () => {
  expect(() => applyReleaseSigning('android { }')).toThrow();
});
