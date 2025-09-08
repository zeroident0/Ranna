import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo, memo } from 'react';
import { ActivityIndicator, Text, View, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Channel as ChannelType } from 'stream-chat';
import Ionicons from '@expo/vector-icons/Ionicons';
import ProfileImage from '../../../components/ProfileImage';
import { supabase } from '../../../lib/supabase';
import { themes } from '../../../constants/themes';

// Simple cache for profile data to avoid repeated queries
const profileCache = new Map<string, any>();

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
  const [isProfileLoading, setIsProfileLoading] = useState(false); // Start as false for faster initial render
  const [showDropdown, setShowDropdown] = useState(false);
  const { cid, channelData } = useLocalSearchParams<{ cid: string; channelData?: string }>();

  const { client } = useChatContext();
  const videoClient = useStreamVideoClient();
  const { user } = useAuth();
  const { alertState, showSuccess, showError, showWarning, showInfo, showConfirm, hideAlert } = useCustomAlert();

  // Parse channel data immediately for instant header rendering
  const initialChannelData = useMemo(() => {
    if (channelData) {
      try {
        return JSON.parse(channelData);
      } catch (error) {
        console.log('Error parsing initial channel data:', error);
        return null;
      }
    }
    return null;
  }, [channelData]);

  // Determine if this is a group chat (use initial data for instant header)
  const isGroupChat = useMemo(() => {
    const channelToCheck = channel || initialChannelData;
    if (!channelToCheck) {
      return false;
    }
    // Groups are identified by having a name (1-on-1 chats don't have names)
    if (!channelToCheck.data?.name) {
      return false;
    }
    
    // If it has a name, it's a group regardless of member count
    return true;
  }, [channel, initialChannelData]);

  // Check if current user has left this group
  const hasUserLeft = useMemo(() => {
    if (!user || !isGroupChat) return false;
    const channelToCheck = channel || initialChannelData;
    const leftMembers = channelToCheck?.data?.left_members as string[] || [];
    return leftMembers.includes(user.id);
  }, [user, isGroupChat, channel, initialChannelData]);

  useEffect(() => {
    // Use passed channel data if available (instant), otherwise fetch
    if (channelData) {
      try {
        const parsedChannelData = JSON.parse(channelData);
        // Create a minimal channel object with the passed data
        const channelObj = {
          cid: parsedChannelData.cid,
          data: parsedChannelData.data,
          state: parsedChannelData.state
        } as ChannelType;
        setChannel(channelObj);
        return;
      } catch (error) {
        console.log('Error parsing channel data:', error);
      }
    }

    // Fallback: fetch channel if no data passed
    const fetchChannel = async () => {
      try {
        const channels = await client.queryChannels({ cid });
        setChannel(channels[0]);
      } catch (error) {
        console.log('Error fetching channel:', error);
      }
    };

    fetchChannel();
  }, [cid, channelData]);

  // Fetch other participant's profile from Supabase (non-blocking)
  useEffect(() => {
    const fetchOtherParticipantProfile = async () => {
      if (!channel || !user) {
        return;
      }
      
      const members = Object.values(channel.state.members);
      const otherMember = members.find(member => member.user_id !== user.id);
      
      if (otherMember?.user_id) {
        // Check cache first
        const cachedProfile = profileCache.get(otherMember.user_id);
        if (cachedProfile) {
          setOtherParticipantProfile(cachedProfile);
          return;
        }
        
        // Only fetch if we don't already have the profile data
        if (!otherParticipantProfile) {
          setIsProfileLoading(true);
        }
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, full_name')
            .eq('id', otherMember.user_id)
            .single();
          
          if (!error && data) {
            // Cache the result
            profileCache.set(otherMember.user_id, data);
            setOtherParticipantProfile(data);
          }
        } catch (err) {
          console.log('Error fetching other participant profile:', err);
        } finally {
          setIsProfileLoading(false);
        }
      }
    };

    // Use setTimeout to make this non-blocking for initial render
    const timeoutId = setTimeout(fetchOtherParticipantProfile, 0);
    return () => clearTimeout(timeoutId);
  }, [channel, user]);

  const getChannelName = (): string => {
    const channelToCheck = channel || initialChannelData;
    if (!channelToCheck || !user) return 'Channel';
    
    // For group chats, use the channel name or generate one
    if (isGroupChat) {
      let baseName = '';
      if (channelToCheck.data?.name) {
        baseName = channelToCheck.data.name;
      } else {
        // Generate a name from member names (exclude left members)
        const leftMembers = channelToCheck.data?.left_members as string[] || [];
        const members = Object.values(channelToCheck.state?.members || {});
        const activeOtherMembers = members.filter((member: any) => 
          member.user_id !== user.id && !leftMembers.includes(member.user_id)
        );
        const memberNames = activeOtherMembers.map((member: any) => 
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
    const members = Object.values(channelToCheck.state?.members || {});
    const otherMember = members.find((member: any) => member.user_id !== user.id);
    
    const userName = (otherMember as any)?.user?.name as string;
    const userFullName = (otherMember as any)?.user?.full_name as string;
    
    return userName || userFullName || 'Channel';
  };

  const getOtherParticipantImage = (): string | null => {
    const channelToCheck = channel || initialChannelData;
    if (!channelToCheck || !user) return null;
    
    const members = Object.values(channelToCheck.state?.members || {});
    const otherMember = members.find((member: any) => member.user_id !== user.id);
    
    // Use Stream Chat user data first (immediate availability)
    const streamImage = (otherMember as any)?.user?.image as string;
    if (streamImage) {
      return streamImage;
    }
    
    // Fallback to profile data from Supabase if available
    if (otherParticipantProfile?.avatar_url) {
      return otherParticipantProfile.avatar_url;
    }
    
    return null;
  };

  const getOtherParticipantFullName = (): string => {
    const channelToCheck = channel || initialChannelData;
    if (!channelToCheck || !user) return '';
    
    const members = Object.values(channelToCheck.state?.members || {});
    const otherMember = members.find((member: any) => member.user_id !== user.id);
    
    // Use Stream Chat user data first (immediate availability)
    const streamName = (otherMember as any)?.user?.full_name as string;
    if (streamName) {
      return streamName;
    }
    
    // Fallback to profile data from Supabase if available
    if (otherParticipantProfile?.full_name) {
      return otherParticipantProfile.full_name;
    }
    
    return '';
  };

  const getGroupMemberNames = (): string => {
    const channelToCheck = channel || initialChannelData;
    if (!channelToCheck || !user || !isGroupChat) return '';
    
    // Exclude left members when showing member names
    const leftMembers = channelToCheck.data?.left_members as string[] || [];
    const members = Object.values(channelToCheck.state?.members || {});
    // Filter out the current user and left members
    const activeOtherMembers = members.filter((member: any) => 
      member.user_id !== user.id && !leftMembers.includes(member.user_id)
    );
    const memberNames = activeOtherMembers.map((member: any) => 
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
    const channelToCheck = channel || initialChannelData;
    if (!channelToCheck || !user) {
      return (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0' }} />
      );
    }

    // Check if group has a dedicated image
    if (channelToCheck.data?.image) {
      return (
        <ProfileImage
          avatarUrl={channelToCheck.data.image as string}
          fullName={(channelToCheck.data.name as string) || 'Group'}
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
      const channelToCheck = channel || initialChannelData;
      if (!channelToCheck || !user) return null;
      const members = Object.values(channelToCheck.state?.members || {});
      const otherMember = members.find((member: any) => member.user_id !== user.id);
      return (otherMember as any)?.user_id || null;
    };

    const otherParticipantId = getOtherParticipantId();
    
    // Render immediately with available data (Stream Chat data is available instantly)
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

  const HeaderLeft = memo(() => {
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
  });

  const HeaderTitle = memo(() => {
    const channelName = getChannelName();
    const memberNames = getGroupMemberNames();
    
    // For group chats, show group info with member names
    if (isGroupChat) {
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
      const channelToCheck = channel || initialChannelData;
      if (!channelToCheck || !user) return null;
      const members = Object.values(channelToCheck.state?.members || {});
      const otherMember = members.find((member: any) => member.user_id !== user.id);
      return (otherMember as any)?.user_id || null;
    };

    const otherParticipantId = getOtherParticipantId();
    
    if (otherParticipantId) {
      return (
        <TouchableOpacity 
          style={{ marginLeft: 8, flex: 1 }}
          onPress={() => router.push(`/(home)/user-profile/${otherParticipantId}`)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: themes.colors.text }}>
            {channelName}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600', color: themes.colors.text }}>
        {channelName}
      </Text>
    );
  });

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

  // Render header immediately, even if channel is still loading
  return (
    <>
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
      
      {!channel ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={themes.colors.text} />
        </View>
      ) : (
        <Channel channel={channel} audioRecordingEnabled>
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
        </Channel>
      )}
      
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
    </>
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
