// Extends app.json with secrets from the environment (.env locally, EAS env vars in the cloud),
// so they never live in git.
//
// GOOGLE_MAPS_ANDROID_API_KEY: the live ambulance map (react-native-maps uses Google Maps on Android).
// iOS uses Apple Maps and needs no key. Without the key the app still runs; the map area stays blank.
module.exports = ({ config }) => {
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  if (!androidKey) {
    console.warn("[app.config] GOOGLE_MAPS_ANDROID_API_KEY not set: the ambulance map will be blank on Android. See .env.example.");
  }
  return {
    ...config,
    android: {
      ...config.android,
      config: { ...config.android?.config, googleMaps: { apiKey: androidKey } },
    },
  };
};
