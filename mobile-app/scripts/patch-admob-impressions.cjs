// Keep the pinned SDK's native banner impression callback separate from revenue.
const fs = require('node:fs');
const path = require('node:path');
const base = path.dirname(require.resolve('react-native-google-mobile-ads/package.json'));
if (require(path.join(base, 'package.json')).version !== '13.6.1') {
  throw new Error('Review the Realgram impression bridge for the new Mobile Ads SDK version');
}
const patches = [
  {
    "file": "android/src/main/java/io/invertase/googlemobileads/ReactNativeGoogleMobileAdsBannerAdViewManager.java",
    "before": "          @Override\n          public void onAdOpened() {",
    "after": "          @Override\n          public void onAdImpression() {\n            sendEvent(reactViewGroup, \"onAdImpression\", null);\n          }\n\n          @Override\n          public void onAdOpened() {"
  },
  {
    "file": "src/types/BannerAdProps.ts",
    "before": "  onAdOpened?: () => void;",
    "after": "  /** Android SDK impression callback, independent of paid-event reporting. */\n  onAdImpression?: () => void;\n  onAdOpened?: () => void;"
  },
  {
    "file": "lib/typescript/types/BannerAdProps.d.ts",
    "before": "    onAdOpened?: () => void;",
    "after": "    onAdImpression?: () => void;\n    onAdOpened?: () => void;"
  },
  {
    "file": "src/ads/BaseAd.tsx",
    "before": "{ type: 'onAdOpened' | 'onAdClosed' }",
    "after": "{ type: 'onAdOpened' | 'onAdClosed' | 'onAdImpression' }"
  }
];
for (const p of patches) {
  const name = path.join(base, p.file);
  const source = fs.readFileSync(name, 'utf8');
  if (source.includes(p.after)) continue;
  if (!source.includes(p.before) || source.split(p.before).length !== 2) {
    throw new Error('Unexpected Mobile Ads source: ' + p.file);
  }
  fs.writeFileSync(name, source.replace(p.before, p.after));
}
console.log('Realgram Android banner impression bridge ready');
