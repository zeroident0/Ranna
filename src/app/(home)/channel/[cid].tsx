// Navigation and routing imports
import { Stack, router, useLocalSearchParams } from 'expo-router';
// React hooks for state management and performance optimization
import { useEffect, useState, useMemo, memo } from 'react';
// React Native UI components
import { ActivityIndicator, Text, View, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
// Safe area handling for different device screens
import { SafeAreaView } from 'react-native-safe-area-context';
// Stream Chat types for channel data
import { Channel as ChannelType } from 'stream-chat';
// Icon library for UI icons
import Ionicons from '@expo/vector-icons/Ionicons';
// Custom profile image component
import ProfileImage from '../../../components/ProfileImage';
// Supabase client for database operations
import { supabase } from '../../../lib/supabase';
// App theme configuration
import { themes } from '../../../constants/themes';

// Simple cache for profile data to avoid repeated queries
const profileCache = new Map<string, any>();

// Stream Chat components for messaging functionality
import {
  Channel,
  MessageInput,
  MessageList,
  useChatContext,
} from 'stream-chat-expo';
// Video calling functionality
import { useStreamVideoClient } from '@stream-io/video-react-native-sdk';
// Cryptographic utilities for generating unique IDs
import * as Crypto from 'expo-crypto';
// Authentication context provider
import { useAuth } from '../../../providers/AuthProvider';
// Utility function for handling group leave operations
import { handleLeaveGroup } from '../../../utils/groupUtils';
// Utility function for handling chat deletion
import { deleteChat } from '../../../utils/deleteChatUtils';
// Custom alert hook for showing notifications
import { useCustomAlert } from '../../../hooks/useCustomAlert';
// Custom alert component
import CustomAlert from '../../../components/CustomAlert';

export default function ChannelScreen() {
  // State for the current channel data
  const [channel, setChannel] = useState<ChannelType | null>(null);
  // State for the other participant's profile information (for 1-on-1 chats)
  const [otherParticipantProfile, setOtherParticipantProfile] = useState<any>(null);
  // Loading state for profile data fetching
  const [isProfileLoading, setIsProfileLoading] = useState(false); // Start as false for faster initial render
  // State to control dropdown menu visibility
  const [showDropdown, setShowDropdown] = useState(false);
  // State to track if the other user is blocked (for 1-on-1 chats)
  const [isBlocked, setIsBlocked] = useState(false);
  // Loading state for block/unblock operations
  const [blockLoading, setBlockLoading] = useState(false);
  // Get channel ID and optional channel data from navigation params
  const { cid, channelData } = useLocalSearchParams<{ cid: string; channelData?: string }>();

  // Stream Chat client for messaging operations
  const { client } = useChatContext();
  // Video client for call functionality
  const videoClient = useStreamVideoClient();
  // Current authenticated user data
  const { user } = useAuth();
  // Custom alert system for notifications
  const { alertState, showSuccess, showError, showWarning, showInfo, showConfirm, hideAlert } = useCustomAlert();

  // Parse channel data immediately for instant header rendering
  // This allows the header to show immediately without waiting for channel fetch
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
  // Groups are identified by having a name OR being of type 'group' OR having is_permanent_group flag
  // 1-on-1 chats don't have names and use 'messaging' type
  const isGroupChat = useMemo(() => {
    const channelToCheck = channel || initialChannelData;
    if (!channelToCheck) {
      return false;
    }
    // Groups are identified by having a name OR being of type 'group' OR having is_permanent_group flag
    if (channelToCheck.type === 'group') return true;
    if (channelToCheck.data?.name) return true;
    if (channelToCheck.data?.is_permanent_group) return true;
    
    return false;
  }, [channel, initialChannelData]);

  // Check if current user has left this group
  // Used to show appropriate UI and disable message input
  const hasUserLeft = useMemo(() => {
    if (!user || !isGroupChat) return false;
    const channelToCheck = channel || initialChannelData;
    const leftMembers = channelToCheck?.data?.left_members as string[] || [];
    return leftMembers.includes(user.id);
  }, [user, isGroupChat, channel, initialChannelData]);

  // Effect to load channel data on component mount
  // Uses passed channel data for instant loading, otherwise fetches from Stream Chat or cache
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
        // First try queryChannels (works for channels user is member of)
        const channels = await client.queryChannels({ cid });
        if (channels.length > 0) {
          setChannel(channels[0]);
          return;
        }
        
        // If queryChannels fails, try to get channel by CID
        const [channelType, channelId] = cid?.split(':') || ['messaging', ''];
        const channelInstance = client.channel(channelType, channelId);
        
        // Try to watch the channel to get full data
        try {
          await channelInstance.watch();
          setChannel(channelInstance);
          return;
        } catch (watchError) {
          // If watch fails, try to query the channel
          console.log('Watch failed, trying query:', watchError);
          try {
            const basicChannel = await channelInstance.query();
            setChannel(channelInstance);
            return;
          } catch (queryError) {
            console.log('Query failed, using minimal channel:', queryError);
            // Use the channel instance as is (might have basic data)
            setChannel(channelInstance);
            return;
          }
        }
      } catch (error) {
        console.log('Error fetching channel:', error);
        // As last resort, try to create a minimal channel object
        try {
          const [channelType, channelId] = cid?.split(':') || ['messaging', ''];
          const channelInstance = client.channel(channelType, channelId);
          setChannel(channelInstance);
        } catch (fallbackError) {
          console.log('Fallback channel creation failed:', fallbackError);
        }
      }
    };

    fetchChannel();
  }, [cid, channelData]);

  // Fetch other participant's profile from Supabase (non-blocking)
  // This runs after initial render to avoid blocking the UI
  useEffect(() => {
    const fetchOtherParticipantProfile = async () => {
      if (!channel || !user) {
        return;
      }
      
      const members = Object.values(channel.state.members);
      const otherMember = members.find(member => member.user_id !== user.id);
      
      if (otherMember?.user_id) {
        // Check cache first to avoid unnecessary API calls
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
          // Fetch profile data from Supabase
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, full_name')
            .eq('id', otherMember.user_id)
            .single();
          
          if (!error && data) {
            // Cache the result for future use
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

  // Check block status for 1-on-1 channels
  // Only runs for direct messages, not group chats
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!client || !user || isGroupChat) return;
      
      const members = Object.values(channel?.state.members || {});
      const otherMember = members.find((member: any) => member.user_id !== user.id);
      
      if (otherMember?.user_id) {
        try {
          // Get list of blocked users from Stream Chat
          const response = await client.getBlockedUsers();
          const blocks = (response as any).blocks || [];
          const blockedUserIds = blocks.map((block: any) => block.blocked_user_id);
          setIsBlocked(blockedUserIds.includes(otherMember.user_id));
        } catch (error) {
          console.log('Error checking block status:', error);
        }
      }
    };

    if (channel && !isGroupChat) {
      checkBlockStatus();
    }
  }, [channel, user, client, isGroupChat]);

  // Get the display name for the channel
  // For groups: uses channel name or generates from member names
  // For 1-on-1: uses other participant's name
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

  // Get the other participant's profile image URL
  // Prioritizes Stream Chat data (immediate) over Supabase data (cached)
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

  // Get the other participant's full name
  // Prioritizes Stream Chat data (immediate) over Supabase data (cached)
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

  // Get formatted list of group member names for display
  // Excludes current user and left members, limits display to avoid overflow
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

  // Component to render group avatar
  // Shows group image if available, otherwise shows first letter of group name
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

  // Component to render profile picture in header
  // For groups: shows group avatar, navigates to group info
  // For 1-on-1: shows other user's avatar, navigates to user profile
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
            userId={otherParticipantId}
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
        userId={otherParticipantId}
      />
    );
  };

  // Header left component with back button and profile picture
  // Memoized for performance optimization
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

  // Header title component showing channel name and member info
  // For groups: shows group name and member list, navigates to group info
  // For 1-on-1: shows user name, navigates to user profile
  // Memoized for performance optimization
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

  // Start an audio-only call with channel members
  // Currently disabled but ready for future implementation
  const joinCall = async () => {
    const members = Object.values(channel.state.members).map((member) => ({
      user_id: member.user_id,
    }));

    // create an audio-only call using the channel members
    const call = videoClient.call('default', Crypto.randomUUID());
    await call.getOrCreate({
      ring: true,
      data: {
        members,
        // Configure call as audio-only
        settings_override: {
          audio: {
            default_device: 'speaker',
            mic_default_on: true,
          },
          video: {
            camera_default_on: false,
            camera_facing: 'front',
          },
          screensharing: {
            access_request_enabled: false,
          },
        },
      },
    });

    // navigate to the call screen
    // router.push(`/call`);
  };

  // Navigate to group info screen and close dropdown
  const handleGroupInfo = () => {
    setShowDropdown(false);
    router.push(`/(home)/group-info?cid=${cid}`);
  };

  // Helper function to check if current user is admin of the group
  const isCurrentUserAdmin = () => {
    if (!channel || !user) return false;
    const admins = (channel.data?.admins as string[]) || [];
    return admins.includes(user.id);
  };

  // Helper function to check if a specific member is admin of the group
  const isMemberAdmin = (member: any) => {
    const admins = (channel?.data?.admins as string[]) || [];
    return admins.includes(member.user_id);
  };

  // Handle leaving a group chat
  // Uses utility function to handle the leave logic and confirmations
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

  // Navigate to other user's profile and close dropdown
  const handleViewProfile = () => {
    if (!channel || !user) return;
    
    setShowDropdown(false);
    
    const members = Object.values(channel.state.members);
    const otherMember = members.find((member: any) => member.user_id !== user.id);
    
    if (otherMember?.user_id) {
      router.push(`/(home)/user-profile/${otherMember.user_id}`);
    }
  };

  // Block the other user in a 1-on-1 chat
  // Shows loading state and success/error messages
  const handleBlockUser = async () => {
    if (!client || !user || !channel) return;
    
    setShowDropdown(false);
    
    const members = Object.values(channel.state.members);
    const otherMember = members.find((member: any) => member.user_id !== user.id);
    
    if (otherMember?.user_id) {
      try {
        setBlockLoading(true);
        await client.blockUser(otherMember.user_id);
        setIsBlocked(true);
        showSuccess('Success', 'User has been blocked');
      } catch (error) {
        console.log('Error blocking user:', error);
        showError('Error', 'Failed to block user');
      } finally {
        setBlockLoading(false);
      }
    }
  };

  // Unblock the other user in a 1-on-1 chat
  // Shows loading state and success/error messages
  const handleUnblockUser = async () => {
    if (!client || !user || !channel) return;
    
    setShowDropdown(false);
    
    const members = Object.values(channel.state.members);
    const otherMember = members.find((member: any) => member.user_id !== user.id);
    
    if (otherMember?.user_id) {
      try {
        setBlockLoading(true);
        await client.unBlockUser(otherMember.user_id);
        setIsBlocked(false);
        showSuccess('Success', 'User has been unblocked');
      } catch (error) {
        console.log('Error unblocking user:', error);
        showError('Error', 'Failed to unblock user');
      } finally {
        setBlockLoading(false);
      }
    }
  };

  // Handle deleting the chat using reusable function
  const handleDeleteChat = () => {
    if (!channel || !user) return;
    
    setShowDropdown(false);
    
    deleteChat(
      channel,
      user,
      () => isGroupChat,
      () => {
        // Success callback - navigate back to home
        showSuccess('Success', 'Chat deleted successfully');
        router.back();
      },
      (error) => {
        // Error callback - show error message
        showError('Error', error);
      }
    );
  };

  // Dropdown menu component for channel options
  // Shows different options for group chats vs 1-on-1 chats
  const DropdownMenu = () => {
    if (!showDropdown) return null;

    return (
      <View style={styles.dropdownContainer}>
        <View style={styles.dropdownMenu}>
          {isGroupChat ? (
            // Group chat options: Group Info, Leave Group, and Delete Chat
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
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleDeleteChat}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                <Text style={[styles.dropdownItemText, { color: '#ff3b30' }]}>Delete Chat</Text>
              </TouchableOpacity>
            </>
          ) : (
            // 1-on-1 chat options: View Profile, Block/Unblock, and Delete Chat
            <>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleViewProfile}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={20} color="#000" />
                <Text style={styles.dropdownItemText}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={isBlocked ? handleUnblockUser : handleBlockUser}
                activeOpacity={0.7}
                disabled={blockLoading}
              >
                <Ionicons 
                  name={isBlocked ? "checkmark-circle-outline" : "ban-outline"} 
                  size={20} 
                  color={isBlocked ? "#34C759" : "#ff3b30"} 
                />
                <Text style={[
                  styles.dropdownItemText, 
                  { color: isBlocked ? "#34C759" : "#ff3b30" }
                ]}>
                  {blockLoading 
                    ? (isBlocked ? 'Unblocking...' : 'Blocking...') 
                    : (isBlocked ? 'Unblock User' : 'Block User')
                  }
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleDeleteChat}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                <Text style={[styles.dropdownItemText, { color: '#ff3b30' }]}>Delete Chat</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // Main render function
  // Shows loading state while channel loads, then renders chat interface
  return (
    <>
      {/* Status bar configuration */}
      <StatusBar backgroundColor={themes.colors.background} barStyle="light-content" />
      
      {/* Navigation header with custom components */}
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderTitle />,
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Dropdown menu toggle button */}
              <TouchableOpacity
                onPress={() => setShowDropdown(!showDropdown)}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="ellipsis-vertical" size={24} color={themes.colors.text} />
              </TouchableOpacity>
              {/* Call button (currently disabled) */}
              {/* <TouchableOpacity onPress={joinCall}>
                <Ionicons name="call" size={24} color={themes.colors.text} />
              </TouchableOpacity> */}
            </View>
          ),
          headerStyle: {
            backgroundColor: themes.colors.background,
          },
          headerTintColor: themes.colors.text,
        }}
      />
      
      {/* Main content area */}
      {!channel ? (
        // Loading state while channel data is being fetched
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={themes.colors.text} />
        </View>
      ) : (
        // Chat interface with message list and input
        <Channel channel={channel} audioRecordingEnabled>
          {/* Touchable area to close dropdown when tapping outside */}
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowDropdown(false)}
          >
            {/* Message list showing chat history */}
            <MessageList />
            
            {/* Message input area with safe area handling */}
            <SafeAreaView edges={['bottom']}>
              {hasUserLeft ? (
                // Show message for users who have left the group
                <View style={styles.leftGroupMessageContainer}>
                  <Text style={styles.leftGroupMessage}>
                    You left this group. You can view the chat history but cannot send messages.
                  </Text>
                </View>
              ) : (
                // Normal message input for active users
                <MessageInput />
              )}
            </SafeAreaView>
          </TouchableOpacity>
          
          {/* Dropdown menu overlay */}
          <DropdownMenu />
        </Channel>
      )}
      
      {/* Custom alert system for notifications */}
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

// Component styles
const styles = StyleSheet.create({
  // Dropdown menu positioning and layering
  dropdownContainer: {
    position: 'absolute',
    top: 1,
    right: 20,
    zIndex: 1000,
  },
  // Dropdown menu appearance with shadow and border
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
  // Individual dropdown menu item styling
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // Dropdown menu item text styling
  dropdownItemText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  // Container for the 'left group' message
  leftGroupMessageContainer: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  // Styling for the 'left group' message text
  leftGroupMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
