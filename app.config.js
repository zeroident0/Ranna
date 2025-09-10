export default ({ config }) => ({
  ...config,
  name: "Tanna",
  slug: "Tanna",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/icone.png",
    resizeMode: "contain",
    backgroundColor: "#B19CD9" // rgb(177, 156, 217)
  },
  notification: {
    icon: "./assets/notificationicon.png"
  },
  assetBundlePatterns: ["**/*"],
  scheme: "ranna",
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
          disableVideoIos: true,
          includesCallsInRecentsIos: true
        }
      }
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/messaging",
    "@config-plugins/react-native-callkeep",
    "expo-audio",
    "expo-updates"
  ], 
  updates: {
    url: "https://u.expo.dev/c0f5e432-0a17-42f9-b06c-3c949c89e0ef"
  },
  extra: {
    router: {},
    eas: {
      projectId: "c0f5e432-0a17-42f9-b06c-3c949c89e0ef"
    }
  }
});
