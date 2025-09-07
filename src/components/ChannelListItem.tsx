import React, { useState, useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, StatusBar } from 'react-native';
import { Channel as ChannelType } from 'stream-chat';
import { useAuth } from '../providers/AuthProvider';
import ProfileImage from './ProfileImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { usePresence } from '../hooks/usePresence';
import { formatTimestamp } from '../utils/formatTimestamp';

interface ChannelListItemProps {
  channel: ChannelType;
  matchingMessages?: any[];
  searchQuery?: string;
  isSearchResult?: boolean;
}

const ChannelListItem = memo(function ChannelListItem({ 
  channel, 
  matchingMessages, 
  searchQuery, 
  isSearchResult = false 
}: ChannelListItemProps) {
  const { user } = useAuth();
  const { isUserOnline, updatePresence } = usePresence();
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
    const messageText = mostRecentMatch.text || 'Sent an attachment';
    
    // Highlight the search query in the message text
    const highlightText = (text: string, query: string) => {
      if (!query) return text;
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '**$1**');
    };

    // Only show username prefix if it's the current user's message
    if (mostRecentMatch.user?.id === user?.id) {
      const senderName = mostRecentMatch.user?.name || mostRecentMatch.user?.full_name || 'You';
      return {
        text: `${senderName}: ${messageText}`,
        highlightedText: `${senderName}: ${highlightText(messageText, searchQuery || '')}`,
        matchCount: matchingMessages.length
      };
    }
    
    // For other users' messages, just show the message without username
    return {
      text: messageText,
      highlightedText: highlightText(messageText, searchQuery || ''),
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
    if (!lastMessage) {
      return 'No messages yet';
    }
    
    const messageText = lastMessage.text || 'Sent an attachment';
    
    // Only show username prefix if it's the current user's message
    if (lastMessage.user?.id === user?.id) {
      const senderName = lastMessage.user?.name || lastMessage.user?.full_name || 'You';
      return `${senderName}: ${messageText}`;
    }
    
    // For other users' messages, just show the message without username
    return messageText;
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

  // Update presence data for channel members (throttled)
  useEffect(() => {
    try {
      const members = Object.values(channel.state.members);
      const otherMembers = members.filter(member => member.user_id !== user?.id);
      
      // Only update presence for members we haven't checked recently
      // The usePresence hook will handle rate limiting internally
      otherMembers.forEach(member => {
        updatePresence(member.user_id);
      });
    } catch (error) {
      console.log('ChannelListItem: Error updating presence:', error);
      // Don't crash the component if presence update fails
    }
  }, [channel.state.members, user?.id, updatePresence]);


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
});

export default ChannelListItem;

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
