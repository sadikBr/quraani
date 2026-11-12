const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Release APKs built outside EAS (the GitHub workflow, .github/workflows/android-apk.yml) are
 * signed with the key named by ANDROID_KEYSTORE_FILE, ANDROID_KEYSTORE_PASSWORD,
 * ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD, so each one installs over the last. Without them (EAS, local builds)
 * nothing changes: EAS signs with its own credentials and local release builds use the debug key.
 * ANDROID_VERSION_CODE, when set, is the build number (the workflow passes its run number), so a
 * newer APK is never refused as a downgrade; ANDROID_VERSION_NAME (from a v1.2.0 tag) is the
 * version shown to users.
 */
const SIGNING_CONFIG = `
        release {
            if (System.getenv('ANDROID_KEYSTORE_FILE')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_FILE'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }`;
const RELEASE_SIGNING = "signingConfig System.getenv('ANDROID_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug";

function applyReleaseSigning(gradle) {
  if (gradle.includes(RELEASE_SIGNING)) return gradle;
  const withConfig = gradle.replace(/signingConfigs\s*\{/, (match) => match + SIGNING_CONFIG);
  // The release build type's own line, not the debug one.
  const signed = withConfig.replace(/(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/, `$1${RELEASE_SIGNING}`);
  if (withConfig === gradle || signed === withConfig) throw new Error('with-release-signing: app/build.gradle no longer has the expected signing blocks');
  return signed;
}

module.exports = (config) => {
  const versionCode = Number(process.env.ANDROID_VERSION_CODE);
  if (Number.isSafeInteger(versionCode) && versionCode > 0) config.android = { ...config.android, versionCode };
  if (/^\d+\.\d+\.\d+$/.test(process.env.ANDROID_VERSION_NAME ?? '')) config.version = process.env.ANDROID_VERSION_NAME;
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = applyReleaseSigning(config.modResults.contents);
    return config;
  });
};
module.exports.applyReleaseSigning = applyReleaseSigning;
