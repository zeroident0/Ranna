import { Redirect, Stack } from 'expo-router';
import ChatProvider from '../../providers/ChatProvider';
import { useAuth } from '../../providers/AuthProvider';
// import VideoProvider from '../../providers/VideoProvider'; // Commented out - video calls disabled
// import CallProvider from '../../providers/CallProvider'; // Commented out - video calls disabled
import NotificationsProvider from '../../providers/NotificationsProvider';
import { Text } from 'react-native';
import { themes } from '../../constants/themes';

export default function HomeLayout() {
  const { user, loading } = useAuth();

  console.log('🏠 HomeLayout: loading =', loading, 'user =', user ? 'logged in' : 'not logged in');

  if (loading) {
    console.log('🏠 HomeLayout: Showing loading state');
    // return null; // Let the root handle loading state
    return <Text>Loading...IN Home Layout</Text>;
  }

  if (!user) {
    console.log('🏠 HomeLayout: No user, redirecting to auth');
    return <Redirect href="/(auth)/login" />;
  }

  console.log('🏠 HomeLayout: User logged in, rendering providers and stack');
  return (
    <ChatProvider>
      <NotificationsProvider>
        {/* Video calling providers - commented out for now */}
        {/* <VideoProvider>
          <CallProvider> */}
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="users" options={{ title: 'Users' }} />
              <Stack.Screen name="call" options={{ title: 'Audio Call' }} />
              <Stack.Screen name="channel/[cid]" options={{ title: 'Channel' }} />
              <Stack.Screen name="create-group" options={{ headerShown: false }} />
              <Stack.Screen 
                name="user-profile/[userId]" 
                options={{
                  title: '',
                  headerShown: true,
                  headerStyle: {
                    backgroundColor: themes.colors.background,
                  },
                  headerTintColor: themes.colors.text,
                  headerTitleStyle: {
                    color: themes.colors.text,
                  },
                }} 
              />
            </Stack>
        {/* </CallProvider>
        </VideoProvider> */}
      </NotificationsProvider>
    </ChatProvider>
  );
}
