import { View, Text, Pressable, StyleSheet } from 'react-native';
import React from 'react';
import { useChatContext } from 'stream-chat-expo';
import { useAuth } from '../providers/AuthProvider';
import { router } from 'expo-router';
import ProfileImage from './ProfileImage';

const UserListItem = ({ user }) => {
  const { client } = useChatContext();
  const { user: me } = useAuth();

  const onPress = async () => {
    //start a chat with him
    const channel = client.channel('messaging', {
      members: [me.id, user.id],
    });
    await channel.watch();
    router.replace(`/(home)/channel/${channel.cid}`);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed
      ]}
    >
      <View style={styles.avatarContainer}>
        <ProfileImage
          avatarUrl={user.avatar_url}
          fullName={user.full_name}
          size={48}
          showBorder={false}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.subtitle}>Tap to start a chat</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pressed: {
    backgroundColor: '#f8f9fa',
    transform: [{ scale: 0.98 }],
  },
  avatarContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default UserListItem;
