const { getDefaultConfig } = require('expo/metro-config');
const resolveFrom = require('resolve-from');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    // If the bundle is resolving "event-target-shim" from a module that is part of "@stream-io/react-native-webrtc".
    moduleName.startsWith('event-target-shim') &&
    context.originModulePath.includes('@stream-io/react-native-webrtc')
  ) {
    // Resolve event-target-shim relative to the react-native-webrtc package to use v6.
    // React Native requires v5 which is not compatible with react-native-webrtc.
    const eventTargetShimPath = resolveFrom(
      context.originModulePath,
      moduleName
    );

    return {
      filePath: eventTargetShimPath,
      type: 'sourceFile',
    };
  }

  // Ensure you call the default resolver.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = {
  resolver: {
    alias: {
      // If the bundle is resolving "event-target-shim" from a module that is part of "@stream-io/react-native-webrtc".
      'event-target-shim': context => 
        context.originModulePath.includes('@stream-io/react-native-webrtc')
          ? require.resolve('@stream-io/react-native-webrtc/node_modules/event-target-shim')
          : require.resolve('event-target-shim')
    }
  }
};