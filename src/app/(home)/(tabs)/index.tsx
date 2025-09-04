import { Link, router } from 'expo-router';
import { ChannelList } from 'stream-chat-expo';
import { useAuth } from '../../../providers/AuthProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

export default function MainTabScreen() {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChannelList
        filters={{ members: { $in: [user.id] } }}
        onSelect={(channel) => router.push(`/(home)/channel/${channel.cid}`)}
        options={{
          headerRight: () => (
            <Link href={'/(home)/users'} asChild>
              <FontAwesome5
                name="users"
                size={22}
                color="gray"
                style={{ marginHorizontal: 15 }}
              />
            </Link>
          ),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
