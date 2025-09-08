import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Text, View, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel as ChannelType } from 'stream-chat';
import Ionicons from '@expo/vector-icons/Ionicons';
import ProfileImage from '../../../components/ProfileImage';
import { supabase } from '../../../lib/supabase';
import { themes } from '../../../constants/themes';

import {
  Channel,
  MessageInput,
  MessageList,
  useChatContext,
} from 'stream-chat-expo';
import { useStreamVideoClient } from '@stream-io/video-react-native-sdk';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../../../providers/AuthProvider';
import { handleLeaveGroup } from '../../../utils/groupUtils';
import { useCustomAlert } from '../../../hooks/useCustomAlert';
import CustomAlert from '../../../components/CustomAlert';

export default function ChannelScreen() {
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [otherParticipantProfile, setOtherParticipantProfile] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const { cid } = useLocalSearchParams<{ cid: string }>();

  const { client } = useChatContext();
  const videoClient = useStreamVideoClient();
  const { user } = useAuth();
  const { alertState, showSuccess, showError, showWarning, showInfo, showConfirm, hideAlert } = useCustomAlert();

  // Determine if this is a group chat
  const isGroupChat = useMemo(() => {
    if (!channel) {
      console.log('🔍 isGroupChat: No channel');
      return false;
    }
    // Groups are identified by having a name (1-on-1 chats don't have names)
    if (!channel.data?.name) {
      console.log('🔍 isGroupChat: No channel name, treating as 1-on-1');
      return false;
    }
    
    // If it has a name, it's a group regardless of member count
    console.log('🔍 isGroupChat: Has channel name, treating as group');
    return true;
  }, [channel]);

  // Check if current user has left this group
  const hasUserLeft = useMemo(() => {
    if (!user || !isGroupChat) return false;
    const leftMembers = channel?.data?.left_members as string[] || [];
    return leftMembers.includes(user.id);
  }, [user, isGroupChat, channel]);

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
      let baseName = '';
      if (channel.data?.name) {
        baseName = channel.data.name;
      } else {
        // Generate a name from member names (exclude left members)
        const leftMembers = channel.data?.left_members as string[] || [];
        const members = Object.values(channel.state.members);
        const activeOtherMembers = members.filter(member => 
          member.user_id !== user.id && !leftMembers.includes(member.user_id)
        );
        const memberNames = activeOtherMembers.map(member => 
          member.user?.name || member.user?.full_name || 'Unknown'
        );
        
        if (memberNames.length <= 2) {
          baseName = memberNames.join(', ');
        } else {
          baseName = `${memberNames.slice(0, 2).join(', ')} and ${memberNames.length - 2} others`;
        }
      }
      
      // Add indicator if user has left
      if (hasUserLeft) {
        return `${baseName} (Left)`;
      }
      
      return baseName;
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

  const getGroupMemberNames = (): string => {
    if (!channel || !user || !isGroupChat) return '';
    
    // Exclude left members when showing member names
    const leftMembers = channel.data?.left_members as string[] || [];
    const members = Object.values(channel.state.members);
    // Filter out the current user and left members
    const activeOtherMembers = members.filter(member => 
      member.user_id !== user.id && !leftMembers.includes(member.user_id)
    );
    const memberNames = activeOtherMembers.map(member => 
      member.user?.name || member.user?.full_name || 'Unknown'
    );
    
    // Join member names with commas, but limit to first 3-4 names to avoid overflow
    if (memberNames.length <= 4) {
      return memberNames.join(', ');
    } else {
      return `${memberNames.slice(0, 3).join(', ')} and ${memberNames.length - 3} others`;
    }
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

    // Fallback to group's first letter if no group image (same as ChannelListItem)
    const groupName = getChannelName();
    return (
      <ProfileImage
        avatarUrl={null}
        fullName={groupName}
        size={32}
        showBorder={false}
      />
    );
  };

  const ProfilePicture = () => {
    // Show loading placeholder while fetching profile data
    if (isProfileLoading) {
      return (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0' }} />
      );
    }
    
    // For group chats, show group avatar and make it clickable
    if (isGroupChat) {
      return (
        <TouchableOpacity 
          onPress={() => router.push(`/(home)/group-info?cid=${cid}`)}
          activeOpacity={0.7}
        >
          <GroupAvatar />
        </TouchableOpacity>
      );
    }
    
    // For 1-on-1 chats, show other participant's avatar and make it clickable
    const imageUrl = getOtherParticipantImage();
    const fullName = getOtherParticipantFullName();
    
    // Get other participant ID for navigation
    const getOtherParticipantId = (): string | null => {
      if (!channel || !user) return null;
      const members = Object.values(channel.state.members);
      const otherMember = members.find(member => member.user_id !== user.id);
      return otherMember?.user_id || null;
    };

    const otherParticipantId = getOtherParticipantId();
    
    // Only render when we have at least the name to avoid flashing
    if (!fullName && !otherParticipantProfile) {
      return (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0' }} />
      );
    }
    
    // Make the profile picture clickable for 1-on-1 chats
    if (otherParticipantId) {
      return (
        <TouchableOpacity 
          onPress={() => router.push(`/(home)/user-profile/${otherParticipantId}`)}
          activeOpacity={0.7}
        >
          <ProfileImage
            avatarUrl={imageUrl}
            fullName={fullName}
            size={32}
            showBorder={false}
          />
        </TouchableOpacity>
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
          <Ionicons name="arrow-back" size={24} color={themes.colors.text} />
        </TouchableOpacity>
        <ProfilePicture />
      </View>
    );
  };

  const HeaderTitle = () => {
    const channelName = getChannelName();
    const memberNames = getGroupMemberNames();
    
    // Debug logging
    console.log('🔍 HeaderTitle Debug:', {
      isGroupChat,
      channelName,
      memberNames,
      channelData: channel?.data,
      channelDataName: channel?.data?.name
    });
    
    // For group chats, show group info with member names
    if (isGroupChat) {
      console.log('🔍 Rendering group chat header');
      return (
        <TouchableOpacity 
          style={{ marginLeft: 8, flex: 1 }}
          onPress={() => router.push(`/(home)/group-info?cid=${cid}`)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: themes.colors.text }}>
            {channelName}
          </Text>
          {memberNames && (
            <Text 
              style={{ 
                fontSize: 13, 
                color: themes.colors.textSecondary, 
                marginTop: 1
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {memberNames}
            </Text>
          )}
        </TouchableOpacity>
      );
    }
    
    // For 1-on-1 chats, make the username clickable to navigate to profile
    const getOtherParticipantId = (): string | null => {
      if (!channel || !user) return null;
      const members = Object.values(channel.state.members);
      const otherMember = members.find(member => member.user_id !== user.id);
      return otherMember?.user_id || null;
    };

    const otherParticipantId = getOtherParticipantId();
    
    console.log('🔍 1-on-1 chat debug:', {
      otherParticipantId,
      channelMembers: Object.values(channel?.state?.members || {}),
      currentUserId: user?.id
    });
    
    if (otherParticipantId) {
      console.log('🔍 Rendering clickable 1-on-1 header');
      return (
        <TouchableOpacity 
          style={{ marginLeft: 8, flex: 1 }}
          onPress={() => {
            console.log('🔍 Navigating to user profile:', otherParticipantId);
            router.push(`/(home)/user-profile/${otherParticipantId}`);
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: themes.colors.text }}>
            {channelName}
          </Text>
        </TouchableOpacity>
      );
    }
    
    console.log('🔍 Rendering fallback header');
    return (
      <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600', color: themes.colors.text }}>
        {channelName}
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

  const handleGroupInfo = () => {
    setShowDropdown(false);
    router.push(`/(home)/group-info?cid=${cid}`);
  };

  // Helper function to check if current user is admin
  const isCurrentUserAdmin = () => {
    if (!channel || !user) return false;
    const admins = (channel.data?.admins as string[]) || [];
    return admins.includes(user.id);
  };

  // Helper function to check if a member is admin
  const isMemberAdmin = (member: any) => {
    const admins = (channel?.data?.admins as string[]) || [];
    return admins.includes(member.user_id);
  };

  const handleLeaveGroupAction = () => {
    if (!channel || !user) return;
    
    setShowDropdown(false);
    
    // Get current members for the leave group function
    const members = Object.values(channel.state.members);
    
    handleLeaveGroup({
      channel,
      currentUser: user,
      members,
      isCurrentUserAdmin,
      isMemberAdmin,
      showConfirm,
      showWarning,
      showError,
    });
  };

  const DropdownMenu = () => {
    if (!showDropdown) return null;

    return (
      <View style={styles.dropdownContainer}>
        <View style={styles.dropdownMenu}>
          {isGroupChat && (
            <>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleGroupInfo}
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={20} color="#000" />
                <Text style={styles.dropdownItemText}>Group Info</Text>
              </TouchableOpacity>
              {!hasUserLeft && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleLeaveGroupAction}
                  activeOpacity={0.7}
                >
                  <Ionicons name="exit-outline" size={20} color="#ff3b30" />
                  <Text style={[styles.dropdownItemText, { color: '#ff3b30' }]}>Leave Group</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  if (!channel) {
    return <ActivityIndicator />;
  }

  return (
    <Channel channel={channel} audioRecordingEnabled>
      <StatusBar backgroundColor={themes.colors.background} barStyle="light-content" />
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderTitle />,
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setShowDropdown(!showDropdown)}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="ellipsis-vertical" size={24} color={themes.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={joinCall}>
                <Ionicons name="call" size={24} color={themes.colors.text} />
              </TouchableOpacity>
            </View>
          ),
          headerStyle: {
            backgroundColor: themes.colors.background,
          },
          headerTintColor: themes.colors.text,
        }}
      />
      <TouchableOpacity 
        style={{ flex: 1 }} 
        activeOpacity={1} 
        onPress={() => setShowDropdown(false)}
      >
        <MessageList />
        <SafeAreaView edges={['bottom']}>
          {hasUserLeft ? (
            <View style={styles.leftGroupMessageContainer}>
              <Text style={styles.leftGroupMessage}>
                You left this group. You can view the chat history but cannot send messages.
              </Text>
            </View>
          ) : (
            <MessageInput />
          )}
        </SafeAreaView>
      </TouchableOpacity>
      <DropdownMenu />
      
      {/* Custom Alert */}
      <CustomAlert
        visible={alertState.visible}
        title={alertState.options.title}
        message={alertState.options.message}
        type={alertState.options.type}
        buttons={alertState.options.buttons}
        onDismiss={hideAlert}
        showCloseButton={alertState.options.showCloseButton}
        icon={alertState.options.icon}
        customIcon={alertState.options.customIcon}
        animationType={alertState.options.animationType}
        backgroundColor={alertState.options.backgroundColor}
        overlayColor={alertState.options.overlayColor}
        borderRadius={alertState.options.borderRadius}
        maxWidth={alertState.options.maxWidth}
        showIcon={alertState.options.showIcon}
      />
    </Channel>
  );
}

const styles = StyleSheet.create({
  dropdownContainer: {
    position: 'absolute',
    top: 0,
    right: 20,
    zIndex: 1000,
  },
  dropdownMenu: {
    backgroundColor: 'white',
    paddingVertical: 4,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  leftGroupMessageContainer: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  leftGroupMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
