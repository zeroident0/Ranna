import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { Text } from 'react-native';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  console.log('🔐 AuthLayout: loading =', loading, 'user =', user ? 'logged in' : 'not logged in');

  if (loading) {
    console.log('🔐 AuthLayout: Showing loading state');
    return null; // Let the root handle loading state to prevent flash
  }

  if (user) {
    console.log('🔐 AuthLayout: User logged in, redirecting to home tabs');
    return <Redirect href="/(home)/(tabs)" />;
  }

  console.log('🔐 AuthLayout: No user, showing auth stack');
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
