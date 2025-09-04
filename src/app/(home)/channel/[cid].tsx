import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, Image, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel as ChannelType } from 'stream-chat';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Channel,
  MessageInput,
  MessageList,
  useChatContext,
} from 'stream-chat-expo';
import { useStreamVideoClient } from '@stream-io/video-react-native-sdk';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../../../providers/AuthProvider';

export default function ChannelScreen() {
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const { cid } = useLocalSearchParams<{ cid: string }>();

  const { client } = useChatContext();
  const videoClient = useStreamVideoClient();
  const { user } = useAuth();

  useEffect(() => {
    const fetchChannel = async () => {
      const channels = await client.queryChannels({ cid });
      setChannel(channels[0]);
    };

    fetchChannel();
  }, [cid]);

  const getOtherParticipantName = (): string => {
    if (!channel || !user) return 'Channel';
    
    const members = Object.values(channel.state.members);
    const otherMember = members.find(member => member.user_id !== user.id);
    
    const userName = otherMember?.user?.name as string;
    const userFullName = otherMember?.user?.full_name as string;
    
    return userName || userFullName || 'Channel';
  };

  const getOtherParticipantImage = (): string | null => {
    if (!channel || !user) return null;
    
    const members = Object.values(channel.state.members);
    const otherMember = members.find(member => member.user_id !== user.id);
    
    return otherMember?.user?.image as string || null;
  };

  const ProfilePicture = () => {
    const imageUrl = getOtherParticipantImage();
    
    if (imageUrl) {
      return (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
          }}
        />
      );
    }
    
    return (
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#e0e0e0',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="person" size={20} color="#666" />
      </View>
    );
  };

  const HeaderLeft = () => {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <ProfilePicture />
      </View>
    );
  };

  const HeaderTitle = () => {
    return (
      <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600' }}>
        {getOtherParticipantName()}
      </Text>
    );
  };

  const joinCall = async () => {
    const members = Object.values(channel.state.members).map((member) => ({
      user_id: member.user_id,
    }));

    // create a call using the channel members
    const call = videoClient.call('default', Crypto.randomUUID());
    await call.getOrCreate({
      ring: true,
      data: {
        members,
      },
    });

    // navigate to the call screen
    // router.push(`/call`);
  };

  if (!channel) {
    return <ActivityIndicator />;
  }

  return (
    <Channel channel={channel} audioRecordingEnabled>
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderTitle />,
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <Ionicons name="call" size={24} color="gray" onPress={joinCall} />
          ),
        }}
      />
      <MessageList />
      <SafeAreaView edges={['bottom']}>
        <MessageInput />
      </SafeAreaView>
    </Channel>
  );
}
