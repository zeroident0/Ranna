import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel as ChannelType } from 'stream-chat';
import Ionicons from '@expo/vector-icons/Ionicons';
import ProfileImage from '../../../components/ProfileImage';
import { supabase } from '../../../lib/supabase';

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
  const [otherParticipantProfile, setOtherParticipantProfile] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const { cid } = useLocalSearchParams<{ cid: string }>();

  const { client } = useChatContext();
  const videoClient = useStreamVideoClient();
  const { user } = useAuth();

  // Determine if this is a group chat
  const isGroupChat = useMemo(() => {
    if (!channel) return false;
    // Groups are identified by having a name (1-on-1 chats don't have names)
    return !!channel.data?.name;
  }, [channel]);

  useEffect(() => {
    const fetchChannel = async () => {
      const channels = await client.queryChannels({ cid });
      setChannel(channels[0]);
    };

    fetchChannel();
  }, [cid]);

  // Fetch other participant's profile from Supabase
  useEffect(() => {
    const fetchOtherParticipantProfile = async () => {
      if (!channel || !user) {
        setIsProfileLoading(false);
        return;
      }
      
      const members = Object.values(channel.state.members);
      const otherMember = members.find(member => member.user_id !== user.id);
      
      if (otherMember?.user_id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, full_name')
            .eq('id', otherMember.user_id)
            .single();
          
          if (!error && data) {
            setOtherParticipantProfile(data);
          }
        } catch (err) {
          console.log('Error fetching other participant profile:', err);
        }
      }
      
      setIsProfileLoading(false);
    };

    fetchOtherParticipantProfile();
  }, [channel, user]);

  const getChannelName = (): string => {
    if (!channel || !user) return 'Channel';
    
    // For group chats, use the channel name or generate one
    if (isGroupChat) {
      if (channel.data?.name) {
        return channel.data.name;
      }
      
      // Generate a name from member names
      const members = Object.values(channel.state.members);
      const otherMembers = members.filter(member => member.user_id !== user.id);
      const memberNames = otherMembers.map(member => 
        member.user?.name || member.user?.full_name || 'Unknown'
      );
      
      if (memberNames.length <= 2) {
        return memberNames.join(', ');
      } else {
        return `${memberNames.slice(0, 2).join(', ')} and ${memberNames.length - 2} others`;
      }
    }
    
    // For 1-on-1 chats, use the other participant's name
    const members = Object.values(channel.state.members);
    const otherMember = members.find(member => member.user_id !== user.id);
    
    const userName = otherMember?.user?.name as string;
    const userFullName = otherMember?.user?.full_name as string;
    
    return userName || userFullName || 'Channel';
  };

  const getOtherParticipantImage = (): string | null => {
    // Use profile data from Supabase if available
    if (otherParticipantProfile?.avatar_url) {
      return otherParticipantProfile.avatar_url;
    }
    
    // Fallback to Stream Chat user data
    if (!channel || !user) return null;
    
    const members = Object.values(channel.state.members);
    const otherMember = members.find(member => member.user_id !== user.id);
    
    return otherMember?.user?.image as string || null;
  };

  const getOtherParticipantFullName = (): string => {
    // Use profile data from Supabase if available
    if (otherParticipantProfile?.full_name) {
      return otherParticipantProfile.full_name;
    }
    
    // Fallback to Stream Chat user data
    if (!channel || !user) return '';
    
    const members = Object.values(channel.state.members);
    const otherMember = members.find(member => member.user_id !== user.id);
    
    return otherMember?.user?.full_name as string || '';
  };

  const GroupAvatar = () => {
    if (!channel || !user) {
      return (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0' }} />
      );
    }

    // Check if group has a dedicated image
    if (channel.data?.image) {
      return (
        <ProfileImage
          avatarUrl={channel.data.image as string}
          fullName={(channel.data.name as string) || 'Group'}
          size={32}
          showBorder={false}
        />
      );
    }

    // Fallback to member avatars if no group image
    const members = Object.values(channel.state.members);
    const otherMembers = members.filter(member => member.user_id !== user.id);
    const displayMembers = otherMembers.slice(0, 3); // Show max 3 avatars

    if (displayMembers.length === 0) {
      return (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0' }} />
      );
    }

    if (displayMembers.length === 1) {
      const member = displayMembers[0];
      return (
            <ProfileImage
              avatarUrl={member.user?.image as string}
              fullName={(member.user?.name || member.user?.full_name) as string}
              size={32}
              showBorder={false}
            />
      );
    }

    // Multiple members - show overlapping avatars
    return (
      <View style={{ width: 32, height: 32, flexDirection: 'row' }}>
        {displayMembers.slice(0, 2).map((member, index) => (
          <View
            key={member.user_id}
            style={{
              position: 'absolute',
              left: index * 12,
              zIndex: 2 - index,
            }}
          >
            <ProfileImage
              avatarUrl={member.user?.image as string}
              fullName={(member.user?.name || member.user?.full_name) as string}
              size={24}
              showBorder={false}
            />
          </View>
        ))}
        {otherMembers.length > 2 && (
          <View
            style={{
              position: 'absolute',
              left: 24,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#007AFF',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 0,
            }}
          >
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
              +{otherMembers.length - 2}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const ProfilePicture = () => {
    // Show loading placeholder while fetching profile data
    if (isProfileLoading) {
      return (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0' }} />
      );
    }
    
    // For group chats, show group avatar
    if (isGroupChat) {
      return <GroupAvatar />;
    }
    
    // For 1-on-1 chats, show other participant's avatar
    const imageUrl = getOtherParticipantImage();
    const fullName = getOtherParticipantFullName();
    
    // Only render when we have at least the name to avoid flashing
    if (!fullName && !otherParticipantProfile) {
      return (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0' }} />
      );
    }
    
    return (
      <ProfileImage
        avatarUrl={imageUrl}
        fullName={fullName}
        size={32}
        showBorder={false}
      />
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
        {getChannelName()}
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isGroupChat && (
                <TouchableOpacity
                  onPress={() => router.push(`/(home)/group-info?cid=${cid}`)}
                  style={{ marginRight: 16 }}
                >
                  <Ionicons name="information-circle-outline" size={24} color="gray" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={joinCall}>
                <Ionicons name="call" size={24} color="gray" />
              </TouchableOpacity>
            </View>
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
