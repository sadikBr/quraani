const { AndroidConfig, withAndroidStyles } = require('expo/config-plugins');

const TEXT_VIEW_STYLE = 'QuraaniTextView';

/**
 * Android 15+ lays out TextView lines by glyph bounds (`useBoundsForWidth`), while
 * React Native sizes text by advance widths. Arabic glyphs in Plex Sans Arabic overhang
 * their advance, so a label sized to fit exactly could wrap when drawn, and the wrapped
 * last word was hidden (e.g. «كل الأهداف» showing only «كل»). Text views go back to
 * advance widths, matching React Native's measurement.
 */
function applyTextBounds(styles) {
  const { assignStylesValue, getAppThemeGroup } = AndroidConfig.Styles;
  styles = assignStylesValue(styles, {
    add: true,
    parent: { name: TEXT_VIEW_STYLE, parent: 'android:Widget.TextView' },
    name: 'android:useBoundsForWidth',
    targetApi: '35',
    value: 'false',
  });
  return assignStylesValue(styles, {
    add: true,
    parent: getAppThemeGroup(),
    name: 'android:textViewStyle',
    value: `@style/${TEXT_VIEW_STYLE}`,
  });
}

module.exports = config => withAndroidStyles(config, config => {
  config.modResults = applyTextBounds(config.modResults);
  return config;
});
module.exports.applyTextBounds = applyTextBounds;
