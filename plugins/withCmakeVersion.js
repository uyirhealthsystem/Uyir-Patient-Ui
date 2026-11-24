// Builds the app's native (C++) code with a newer CMake whose bundled ninja
// (>= 1.12) supports Windows long paths. The Android Gradle default (CMake
// 3.22.1, ninja 1.10) fails on React Native codegen object paths longer than
// 260 characters with "ninja: error: mkdir(...): No such file or directory".
// Needs that CMake version installed in the Android SDK (SDK Manager > SDK Tools > CMake).
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// uyir:cmake-version";

module.exports = function withCmakeVersion(config, { version = "3.31.6" } = {}) {
  return withAppBuildGradle(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    cfg.modResults.contents = src.replace(
      /^android\s*\{/m,
      (m) => `${m}\n    ${MARKER}\n    externalNativeBuild {\n        cmake {\n            version "${version}"\n        }\n    }\n`,
    );
    return cfg;
  });
};
