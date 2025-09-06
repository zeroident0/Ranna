import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Channel as ChannelType } from 'stream-chat';
import { useAuth } from '../providers/AuthProvider';
import ProfileImage from './ProfileImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

interface ChannelListItemProps {
  channel: ChannelType;
}

export default function ChannelListItem({ channel }: ChannelListItemProps) {
  const { user } = useAuth();

  // Determine if this is a group chat
  const isGroupChat = () => {
    const memberCount = Object.keys(channel.state.members).length;
    // Check if it has a name (groups have names, 1-on-1 chats don't) or has more than 2 members
    return (
      (channel.data?.name && memberCount >= 2) || // If it has a name and at least 2 members, it's a group
      memberCount > 2 // More than 2 members is definitely a group
    );
  };

  // Get channel name
  const getChannelName = (): string => {
    if (isGroupChat()) {
      if (channel.data?.name) {
        return channel.data.name;
      }
      
      // Generate a name from member names
      const members = Object.values(channel.state.members);
      const otherMembers = members.filter(member => member.user_id !== user?.id);
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
    const otherMember = members.find(member => member.user_id !== user?.id);
    
    return (otherMember?.user?.name || otherMember?.user?.full_name || 'Chat') as string;
  };

  // Get channel avatar
  const getChannelAvatar = () => {
    if (isGroupChat()) {
      // Check if group has a dedicated image
      if (channel.data?.image) {
        return (
          <ProfileImage
            avatarUrl={channel.data.image as string}
            fullName={(channel.data.name as string) || 'Group'}
            size={48}
            showBorder={false}
          />
        );
      }

      // Fallback to member avatars if no group image
      const members = Object.values(channel.state.members);
      const otherMembers = members.filter(member => member.user_id !== user?.id);
      const displayMembers = otherMembers.slice(0, 3);

      if (displayMembers.length === 0) {
        return (
          <View style={styles.groupAvatarPlaceholder}>
            <Ionicons name="people" size={20} color="#666" />
          </View>
        );
      }

      if (displayMembers.length === 1) {
        const member = displayMembers[0];
        return (
          <ProfileImage
            avatarUrl={member.user?.image as string}
            fullName={(member.user?.name || member.user?.full_name) as string}
            size={48}
            showBorder={false}
          />
        );
      }

      // Multiple members - show overlapping avatars
      return (
        <View style={styles.groupAvatarContainer}>
          {displayMembers.slice(0, 2).map((member, index) => (
            <View
              key={member.user_id}
              style={[
                styles.groupAvatarOverlap,
                { left: index * 16, zIndex: 2 - index }
              ]}
            >
              <ProfileImage
                avatarUrl={member.user?.image as string}
                fullName={(member.user?.name || member.user?.full_name) as string}
                size={32}
                showBorder={false}
              />
            </View>
          ))}
          {otherMembers.length > 2 && (
            <View style={[styles.groupAvatarOverlap, styles.moreMembersBadge, { left: 32 }]}>
              <Text style={styles.moreMembersText}>
                +{otherMembers.length - 2}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // For 1-on-1 chats, show other participant's avatar
    const members = Object.values(channel.state.members);
    const otherMember = members.find(member => member.user_id !== user?.id);
    
    return (
      <ProfileImage
        avatarUrl={otherMember?.user?.image as string}
        fullName={(otherMember?.user?.name || otherMember?.user?.full_name) as string}
        size={48}
        showBorder={false}
      />
    );
  };

  // Get last message preview
  const getLastMessage = () => {
    const lastMessage = channel.state.messages[channel.state.messages.length - 1];
    if (!lastMessage) return 'No messages yet';
    
    const senderName = lastMessage.user?.name || lastMessage.user?.full_name || 'Someone';
    const messageText = lastMessage.text || 'Sent an attachment';
    
    return `${senderName}: ${messageText}`;
  };

  // Get member count for group chats
  const getMemberCount = (): string | null => {
    if (!isGroupChat()) return null;
    const memberCount = Object.keys(channel.state.members).length;
    return `${memberCount} members`;
  };

  const handlePress = () => {
    router.push(`/(home)/channel/${channel.cid}`);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {getChannelAvatar()}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.channelName} numberOfLines={1}>
            {getChannelName()}
          </Text>
          <View style={styles.metaContainer}>
            {isGroupChat() && (
              <View style={styles.groupBadge}>
                <Ionicons name="people" size={12} color="#007AFF" />
                <Text style={styles.groupBadgeText}>Group</Text>
              </View>
            )}
            <Text style={styles.timestamp}>
              {channel.state.last_message_at 
                ? new Date(channel.state.last_message_at).toLocaleDateString()
                : channel.data?.updated_at 
                ? new Date(channel.data.updated_at as string).toLocaleDateString()
                : ''
              }
            </Text>
          </View>
        </View>
        
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {getLastMessage()}
          </Text>
          {isGroupChat() && (
            <Text style={styles.memberCount}>
              {getMemberCount()}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  groupBadgeText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  memberCount: {
    fontSize: 12,
    color: '#999',
  },
  groupAvatarContainer: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  groupAvatarOverlap: {
    position: 'absolute',
    top: 0,
  },
  groupAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMembersBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMembersText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
