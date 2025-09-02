export default ({ config }) => ({
  ...config,
  name: "Ranna",
  slug: "Ranna",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: ["**/*"],
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    // 🔑 Reference secret file here
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    permissions: [
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MICROPHONE",
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.BLUETOOTH_ADMIN",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.CAMERA",
      "android.permission.INTERNET",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.WAKE_LOCK",
      "android.permission.FOREGROUND_SERVICE_CAMERA",
      "android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE",
      "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
      "android.permission.BIND_TELECOM_CONNECTION_SERVICE",
      "android.permission.READ_PHONE_STATE",
      "android.permission.CALL_PHONE"
    ],
    package: "com.SaifDev.Ranna"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        android: {
          googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
          minSdkVersion: 24,
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          extraMavenRepos: [
            "../../node_modules/@notifee/react-native/android/libs"
          ]
        },
        ios: {
          useFrameworks: "static"
        }
      }
    ],
    [
      "@stream-io/video-react-native-sdk",
      {
        ringingPushNotifications: {
          disableVideoIos: false,
          includesCallsInRecentsIos: true
        }
      }
    ],
    [
      "@config-plugins/react-native-webrtc",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone"
      }
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/messaging",
    "@config-plugins/react-native-callkeep",
    "expo-audio"
  ],
  extra: {
    router: {},
    eas: {
      projectId: "8dae4b3d-8170-4ee2-baed-03f3d17df1bd"
    }
  }
});
