import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, StatusBar } from 'react-native';
import { Channel as ChannelType } from 'stream-chat';
import { useAuth } from '../providers/AuthProvider';
import ProfileImage from './ProfileImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

interface ChannelListItemProps {
  channel: ChannelType;
  matchingMessages?: any[];
  searchQuery?: string;
  isSearchResult?: boolean;
}

export default function ChannelListItem({ 
  channel, 
  matchingMessages, 
  searchQuery, 
  isSearchResult = false 
}: ChannelListItemProps) {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [selectedImageName, setSelectedImageName] = useState<string>('');

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
           <TouchableOpacity 
             style={styles.avatarWithIndicator}
             onPress={(event) => handleImagePress(channel.data.image as string || '', (channel.data.name as string) || 'Group', event)}
             activeOpacity={0.7}
           >
            <ProfileImage
              avatarUrl={channel.data.image as string}
              fullName={(channel.data.name as string) || 'Group'}
              size={48}
              showBorder={false}
            />
            {/* For groups, show online indicator if any member is online */}
            {Object.values(channel.state.members).some(member => 
              member.user_id !== user?.id && isUserOnline(member.user_id)
            ) && (
              <View style={styles.onlineIndicator} />
            )}
          </TouchableOpacity>
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
           <TouchableOpacity 
             style={styles.avatarWithIndicator}
             onPress={(event) => handleImagePress(member.user?.image as string || '', (member.user?.name || member.user?.full_name) as string || 'User', event)}
             activeOpacity={0.7}
           >
            <ProfileImage
              avatarUrl={member.user?.image as string}
              fullName={(member.user?.name || member.user?.full_name) as string}
              size={48}
              showBorder={false}
            />
            {isUserOnline(member.user_id) && (
              <View style={styles.onlineIndicator} />
            )}
          </TouchableOpacity>
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
       <TouchableOpacity 
         style={styles.avatarWithIndicator}
         onPress={(event) => handleImagePress(otherMember?.user?.image as string || '', (otherMember?.user?.name || otherMember?.user?.full_name) as string || 'User', event)}
         activeOpacity={0.7}
       >
        <ProfileImage
          avatarUrl={otherMember?.user?.image as string}
          fullName={(otherMember?.user?.name || otherMember?.user?.full_name) as string}
          size={48}
          showBorder={false}
        />
        {otherMember && isUserOnline(otherMember.user_id) && (
          <View style={styles.onlineIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  // Get matching message text for search results
  const getMatchingMessageText = () => {
    if (!isSearchResult || !matchingMessages || matchingMessages.length === 0) {
      return null;
    }

    // Get the most recent matching message
    const mostRecentMatch = matchingMessages[matchingMessages.length - 1];
    const senderName = mostRecentMatch.user?.name || mostRecentMatch.user?.full_name || 'Someone';
    const messageText = mostRecentMatch.text || 'Sent an attachment';
    
    // Highlight the search query in the message text
    const highlightText = (text: string, query: string) => {
      if (!query) return text;
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '**$1**');
    };

    return {
      text: `${senderName}: ${messageText}`,
      highlightedText: `${senderName}: ${highlightText(messageText, searchQuery || '')}`,
      matchCount: matchingMessages.length
    };
  };

  // Get last message preview
  const getLastMessage = () => {
    // If this is a search result, show matching message
    if (isSearchResult) {
      const matchingMessage = getMatchingMessageText();
      if (matchingMessage) {
        return matchingMessage.text;
      }
    }

    // Otherwise show the last message
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

  // Get unread message count
  const getUnreadCount = (): number => {
    // Stream Chat provides unread count in channel.state.unreadCount
    // or we can calculate it from channel.state.read
    if (channel.state.unreadCount !== undefined) {
      return channel.state.unreadCount;
    }
    
    // Fallback: calculate unread count from read receipts
    if (user && channel.state.read) {
      const userRead = channel.state.read[user.id];
      if (userRead) {
        const lastMessage = channel.state.messages[channel.state.messages.length - 1];
        if (lastMessage && lastMessage.created_at > userRead.last_read) {
          // Count messages after last read
          return channel.state.messages.filter(
            msg => msg.created_at > userRead.last_read && msg.user?.id !== user.id
          ).length;
        }
      } else {
        // User hasn't read any messages, count all messages from others
        return channel.state.messages.filter(msg => msg.user?.id !== user.id).length;
      }
    }
    
    return 0;
  };

  // Check if user is online
  const isUserOnline = (userId: string): boolean => {
    // Stream Chat provides online status in channel.state.members
    const member = channel.state.members[userId];
    if (member && member.user) {
      // Check if user is online (last_active_at is recent)
      const lastActive = member.user.last_active_at;
      if (lastActive && typeof lastActive === 'string') {
        const now = new Date();
        const lastActiveDate = new Date(lastActive);
        const diffInMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);
        // Consider online if last active within 5 minutes
        return diffInMinutes <= 5;
      }
    }
    return false;
  };

  // Format timestamp based on date
  const formatTimestamp = (timestamp: string | Date | undefined): string => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    // If message was sent today, show time
    if (messageDay.getTime() === today.getTime()) {
      return messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    
    // If message was sent yesterday, show "Yesterday"
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDay.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    // For older messages, show date
    return messageDate.toLocaleDateString();
  };

  const handlePress = () => {
    router.push(`/(home)/channel/${channel.cid}`);
  };

  const handleImagePress = (imageUrl: string, imageName: string, event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    // Always open modal, ProfileImage will handle placeholder internally
    setSelectedImageUrl(imageUrl || '');
    setSelectedImageName(imageName || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImageUrl('');
    setSelectedImageName('');
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
              {formatTimestamp(channel.state.last_message_at || (channel.data?.updated_at as string))}
            </Text>
          </View>
        </View>
        
        <View style={styles.messageRow}>
          <View style={styles.messageContainer}>
            <View style={styles.messageWithBadge}>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {getLastMessage()}
              </Text>
              {!isSearchResult && getUnreadCount() > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {getUnreadCount() > 99 ? '99+' : getUnreadCount()}
                  </Text>
                </View>
              )}
            </View>
            {isSearchResult && getMatchingMessageText() && (
              <Text style={styles.matchCount}>
                {getMatchingMessageText()?.matchCount} match{getMatchingMessageText()?.matchCount !== 1 ? 'es' : ''}
              </Text>
            )}
          </View>
          {isGroupChat() && !isSearchResult && (
            <Text style={styles.memberCount}>
              {getMemberCount()}
            </Text>
          )}
        </View>
      </View>
      
      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
          <TouchableOpacity 
            style={styles.modalCloseArea} 
            activeOpacity={1} 
            onPress={closeModal}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
              
               <ProfileImage
                 avatarUrl={selectedImageUrl}
                 fullName={selectedImageName}
                 size={300}
                 showBorder={false}
               />
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
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
  messageContainer: {
    flex: 1,
    marginRight: 8,
  },
  messageWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  matchCount: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 2,
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
  avatarWithIndicator: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
