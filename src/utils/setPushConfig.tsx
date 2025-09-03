import {
  StreamVideoClient,
  StreamVideoRN,
} from "@stream-io/video-react-native-sdk";
import { AndroidImportance } from "@notifee/react-native";
import { tokenProvider } from "./tokenProvider.js";
import AsyncStorage from '@react-native-async-storage/async-storage';

export function setPushConfig() {
  console.log("Set push");
  StreamVideoRN.setPushConfig({
    // pass true to inform the SDK that this is an expo app
    isExpo: true,
    ios: {
      // add your push_provider_name for iOS that you have setup in Stream dashboard
      pushProviderName: "APN",
    },
    android: {
      // add your push_provider_name for Android that you have setup in Stream dashboard
      pushProviderName: "Firebase",
      // configure the notification channel to be used for incoming calls for Android.
      incomingCallChannel: {
        id: "stream_incoming_call",
        name: "Incoming call notifications",
        // This is the advised importance of receiving incoming call notifications.
        // This will ensure that the notification will appear on-top-of applications.
        importance: AndroidImportance.HIGH,
        // optional: if you dont pass a sound, default ringtone will be used
        // sound: <your sound url>
      },
      // configure the functions to create the texts shown in the notification
      // for incoming calls in Android.
      incomingCallNotificationTextGetters: {
        getTitle: (createdUserName: string) =>
          `Incoming call from ${createdUserName}`,
        getBody: (_createdUserName: string) => "Tap to answer the call",
      },
    },
    // add the callback to be executed a call is accepted, used for navigation
    navigateAcceptCall: () => {
      // staticNavigateToRingingCall();
    },
    // add the callback to be executed when a notification is tapped,
    // but the user did not press accept or decline, used for navigation
    navigateToIncomingCall: () => {
      // staticNavigateToRingingCall();
    },
    // add the async callback to create a video client
    // for incoming calls in the background on a push notification
    createStreamVideoClient: async () => {
      try {
        // Get user data from AsyncStorage (stored during login)
        const userId = await AsyncStorage.getItem("@userId");
        const userName = await AsyncStorage.getItem("@userName");
        
        if (!userId || !userName) {
          console.warn("No user data found in storage for push notifications");
          return undefined;
        }

        // Get fresh token from your Supabase Edge Function
        const token = await tokenProvider();
        
        if (!token) {
          console.error("Failed to get Stream token for push notifications");
          return undefined;
        }

        const user = {
          id: userId,
          name: userName,
        };

        return new StreamVideoClient({
          apiKey: process.env.EXPO_PUBLIC_STREAM_API_KEY,
          user,
          token,
        });
      } catch (error) {
        console.error("Error creating Stream video client for push notifications:", error);
        return undefined;
      }
    },
  });
}