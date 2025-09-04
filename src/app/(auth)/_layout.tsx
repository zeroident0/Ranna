import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { Text } from 'react-native';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  console.log('🔐 AuthLayout: loading =', loading, 'user =', user ? 'logged in' : 'not logged in');

  if (loading) {
    console.log('🔐 AuthLayout: Showing loading state');
    return <Text>Loading...IN Auth Layout</Text>; // Let the root handle loading state
  }

  if (user) {
    console.log('🔐 AuthLayout: User logged in, redirecting to home');
    return <Redirect href="/(home)" />;
  }

  console.log('🔐 AuthLayout: No user, showing auth stack');
  return <Stack />;
}
