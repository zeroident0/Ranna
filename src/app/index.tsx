import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  const { user, loading } = useAuth();

  // Show loading while checking authentication state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Redirect based on authentication state
  if (user) {
    return <Redirect href={'/(home)'} />;
  } else {
    return <Redirect href={'/(auth)/login'} />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
