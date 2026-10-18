const { withGradleProperties, withProjectBuildGradle } = require('expo/config-plugins');

// CMake shortens clang++.exe to CLANG_~1.EXE when the Windows SDK path has spaces.
// With -no-canonical-prefixes, Clang then omits libc++ unless its C++ mode is explicit.
const marker = '// BanabaConnect: preserve Clang C++ mode on Windows';
const gradleConfiguration = `
${marker}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
  subprojects { subproject ->
    ['com.android.application', 'com.android.library'].each { pluginId ->
      subproject.plugins.withId(pluginId) {
        subproject.android.defaultConfig.externalNativeBuild.cmake.arguments(
          '-DCMAKE_SHARED_LINKER_FLAGS=--driver-mode=g++'
        )
      }
    }
  }
}
`;

module.exports = function withWindowsCxxCompiler(config) {
  // Prebuild runs on the machine doing the build, so Mac, Linux and EAS builds keep their default
  // CMake and need no extra SDK package.
  if (process.platform !== 'win32') {
    return config;
  }
  config = withGradleProperties(config, (gradleConfig) => {
    // The Ninja shipped with CMake 3.22 cannot handle the generated Windows paths.
    const existing = gradleConfig.modResults.find(
      (item) => item.type === 'property' && item.key === 'android.cmakeVersion'
    );
    if (existing) {
      existing.value = '4.1.2';
    } else {
      gradleConfig.modResults.push({ type: 'property', key: 'android.cmakeVersion', value: '4.1.2' });
    }
    return gradleConfig;
  });

  return withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error('The Windows C++ compiler fix requires a Groovy build.gradle.');
    }
    if (!gradleConfig.modResults.contents.includes(marker)) {
      // React Native's root plugin eagerly configures :app. Register our hook first.
      const reactRootPlugin = 'apply plugin: "com.facebook.react.rootproject"';
      if (!gradleConfig.modResults.contents.includes(reactRootPlugin)) {
        throw new Error('Cannot locate the React Native root plugin in build.gradle.');
      }
      gradleConfig.modResults.contents = gradleConfig.modResults.contents.replace(
        reactRootPlugin,
        `${gradleConfiguration}\n${reactRootPlugin}`
      );
    }
    return gradleConfig;
  });
};
