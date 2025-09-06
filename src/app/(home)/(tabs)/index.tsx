import { router } from 'expo-router';
import { ChannelList } from 'stream-chat-expo';
import { useAuth } from '../../../providers/AuthProvider';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NewChatButton from '../../../components/NewChatButton';
import ChannelListItem from '../../../components/ChannelListItem';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useChatContext } from 'stream-chat-expo';

export default function MainTabScreen() {
  const { user } = useAuth();
  const { client } = useChatContext();
  const [refreshKey, setRefreshKey] = useState(0);
  
  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }


  const refreshChannelList = async () => {
    console.log('Manually refreshing channel list...');
    try {
      // Query channels to see what's available
      const channels = await client.queryChannels({ 
        members: { $in: [user.id] } 
      });
      console.log('Found channels:', channels.length);
      channels.forEach(channel => {
        console.log(`- ${channel.cid}: ${channel.data?.name || 'No name'} (${Object.keys(channel.state.members).length} members)`);
      });
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing channels:', error);
    }
  };

  // Refresh channel list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('MainTabScreen focused - refreshing channel list');
      // Force refresh by updating the key
      setRefreshKey(prev => prev + 1);
      refreshChannelList();
    }, [])
  );

  return (
    <View style={styles.container}>
      <ChannelList
        key={refreshKey}
        filters={{ members: { $in: [user.id] } }}
        Preview={ChannelListItem}
        sort={{ updated_at: -1 }}
      />
      <NewChatButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
