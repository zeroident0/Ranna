import { PropsWithChildren, useEffect, useState } from 'react';
import messaging from '@react-native-firebase/messaging';
import { StreamChat } from 'stream-chat';
import { useAuth } from './AuthProvider';

const client = StreamChat.getInstance(process.env.EXPO_PUBLIC_STREAM_API_KEY);

export default function NotificationsProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const { user } = useAuth();

  const requestPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
  };

  useEffect(() => {
    if (!user) {
      console.log('🔔 NotificationsProvider: No user available, waiting...');
      return;
    }

    console.log('🔔 NotificationsProvider: User available, initializing notifications for:', user.id);
    
    // Register FCM token with stream chat server.
    const registerPushToken = async () => {
      try {
        console.log('🔔 NotificationsProvider: Getting FCM token...');
        const token = await messaging().getToken();
        console.log('🔔 NotificationsProvider: FCM token received:', token ? 'Token valid' : 'No token');
        
        const push_provider = 'firebase';
        const push_provider_name = 'Firebase'; // name an alias for your push provider (optional)
        console.log('🔔 NotificationsProvider: Adding device to Stream Chat...');
        client.addDevice(token, push_provider, user.id, push_provider_name);
        console.log('🔔 NotificationsProvider: Device added successfully');
      } catch (error) {
        console.log('🔔 NotificationsProvider: Error registering push token:', error);
      }
    };

    const init = async () => {
      try {
        console.log('🔔 NotificationsProvider: Requesting permissions...');
        await requestPermission();
        console.log('🔔 NotificationsProvider: Permissions granted');
        
        await registerPushToken();
        console.log('🔔 NotificationsProvider: Initialization complete');
        setIsReady(true);
      } catch (error) {
        console.log('🔔 NotificationsProvider: Error during initialization:', error);
        setIsReady(true); // Set ready even if there's an error to prevent infinite loading
      }
    };

    init();
  }, [user]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}