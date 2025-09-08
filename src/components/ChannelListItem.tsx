// ________________________________________IMPORTS________________________________________
import React, { useState, useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, StatusBar } from 'react-native';
import { Channel as ChannelType } from 'stream-chat';
import { useAuth } from '../providers/AuthProvider';
import ProfileImage from './ProfileImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { usePresence } from '../hooks/usePresence';
import { formatTimestamp } from '../utils/formatTimestamp';
import { useChatContext } from 'stream-chat-expo';

// ________________________________________INTERFACES________________________________________
interface ChannelListItemProps {
  channel: ChannelType;
  matchingMessages?: any[];
  searchQuery?: string;
  isSearchResult?: boolean;
}

// ________________________________________MAIN COMPONENT________________________________________
const ChannelListItem = memo(function ChannelListItem({ 
  channel, 
  matchingMessages, 
  searchQuery, 
  isSearchResult = false 
}: ChannelListItemProps) {
  const { user } = useAuth();
  const { client } = useChatContext();
  const { isUserOnline, updatePresence } = usePresence();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [isBlocked, setIsBlocked] = useState(false);

  // Check block status on mount
  useEffect(() => {
    checkIfBlocked();
  }, [channel.id]);

  // ________________________________________HELPER FUNCTIONS________________________________________
  // Check if this channel is blocked (for 1-on-1 chats only)
  const checkIfBlocked = async () => {
    if (!client || !user || isGroupChat()) return;
    
    try {
      const members = Object.values(channel.state.members);
      const otherMember = members.find(member => member.user_id !== user.id);
      
      if (otherMember) {
        const response = await client.getBlockedUsers();
        const blocks = (response as any).blocks || [];
        const blockedUserIds = blocks.map((block: any) => block.blocked_user_id);
        setIsBlocked(blockedUserIds.includes(otherMember.user_id));
      }
    } catch (error) {
      console.log('❌ ChannelListItem: Error checking block status:', error);
    }
  };

  // Determine if this is a group chat
  const isGroupChat = () => {
    // Groups are identified by having a name (1-on-1 chats don't have names)
    if (!channel.data?.name) return false;
    
    // Also check if it was originally a group by counting active members
    const leftMembers = channel.data?.left_members as string[] || [];
    const activeMembers = Object.values(channel.state.members).filter(member => 
      !leftMembers.includes(member.user_id)
    );
    
    // If there are 2 or more active members, it's still a group
    // If there's only 1 active member, it should still be considered a group if it has a name
    return true; // If it has a name, it's a group regardless of member count
  };

  // Check if current user has left this group
  const hasUserLeft = () => {
    if (!user || !isGroupChat()) return false;
    const leftMembers = channel.data?.left_members as string[] || [];
    return leftMembers.includes(user.id);
  };

  // Get channel name
  const getChannelName = (): string => {
    if (isGroupChat()) {
      let baseName = '';
      if (channel.data?.name) {
        baseName = channel.data.name;
      } else {
        // Generate a name from member names (exclude left members)
        const leftMembers = channel.data?.left_members as string[] || [];
        const members = Object.values(channel.state.members);
        const activeOtherMembers = members.filter(member => 
          member.user_id !== user?.id && !leftMembers.includes(member.user_id)
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
      if (hasUserLeft()) {
        return `${baseName} (Left)`;
      }
      
      return baseName;
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

      // Fallback to group's first letter if no group image
      const groupName = getChannelName();
      return (
        <TouchableOpacity 
          style={styles.avatarWithIndicator}
          onPress={(event) => handleImagePress('', groupName, event)}
          activeOpacity={0.7}
        >
          <ProfileImage
            avatarUrl={null}
            fullName={groupName}
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
          userId={otherMember?.user_id}
        />
        {otherMember && isUserOnline(otherMember.user_id) && (
          <View style={styles.onlineIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  // ________________________________________MESSAGE DISPLAY FUNCTIONS________________________________________
  // Get matching message text for search results
  const getMatchingMessageText = () => {
    if (!isSearchResult || !matchingMessages || matchingMessages.length === 0) {
      return null;
    }

    // Get the most recent matching message
    const mostRecentMatch = matchingMessages[matchingMessages.length - 1];
    
    // Check if message has attachments
    const attachmentText = getAttachmentDisplayText(mostRecentMatch);
    const messageText = mostRecentMatch.text || attachmentText || 'Sent an attachment';
    
    // Highlight the search query in the message text
    const highlightText = (text: string, query: string) => {
      if (!query) return text;
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '**$1**');
    };

    // For current user's messages, just show the message text (read receipts shown separately)
    if (mostRecentMatch.user?.id === user?.id) {
      return {
        text: messageText,
        highlightedText: highlightText(messageText, searchQuery || ''),
        matchCount: matchingMessages.length
      };
    }
    
    // For group chats, show sender username with message
    if (isGroupChat()) {
      const senderName = mostRecentMatch.user?.name || mostRecentMatch.user?.full_name || 'Unknown';
      const fullMessageText = `${senderName}: ${messageText}`;
      return {
        text: fullMessageText,
        highlightedText: highlightText(fullMessageText, searchQuery || ''),
        matchCount: matchingMessages.length
      };
    }
    
    // For 1-on-1 chats, just show the message without username
    return {
      text: messageText,
      highlightedText: highlightText(messageText, searchQuery || ''),
      matchCount: matchingMessages.length
    };
  };

  // Get attachment display text with appropriate icon
  const getAttachmentDisplayText = (message: any) => {
    if (!message.attachments || message.attachments.length === 0) {
      return null;
    }

    const attachment = message.attachments[0]; // Get first attachment
    
    // Check for image
    if (attachment.type === 'image' || attachment.image_url) {
      return 'Image';
    }
    
    // Check for video
    if (attachment.type === 'video' || attachment.asset_url?.includes('video') || attachment.mime_type?.startsWith('video/')) {
      return 'Video';
    }
    
    // Check for audio/recording
    if (attachment.type === 'audio' || attachment.asset_url?.includes('audio') || attachment.mime_type?.startsWith('audio/')) {
      // Try to get duration if available
      const duration = attachment.duration || attachment.file_size; // Some APIs provide duration
      if (duration && typeof duration === 'number') {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      return '';
    }
    
    // Check for file
    if (attachment.type === 'file' || attachment.asset_url) {
      return 'File';
    }
    
    // Default fallback
    return 'Attachment';
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
    
    // Check if message has attachments
    const attachmentText = getAttachmentDisplayText(lastMessage);
    const messageText = lastMessage.text || attachmentText || 'Sent an attachment';
    
    // For current user's messages, just show the message text (read receipts shown separately)
    if (lastMessage.user?.id === user?.id) {
      return messageText;
    }
    
    // For group chats, show sender username with message
    if (isGroupChat()) {
      const senderName = lastMessage.user?.name || lastMessage.user?.full_name || 'Unknown';
      return `${senderName}: ${messageText}`;
    }
    
    // For 1-on-1 chats, just show the message without username
    return messageText;
  };

  // Get attachment icon name for the last message
  const getAttachmentIconName = () => {
    const lastMessage = channel.state.messages[channel.state.messages.length - 1];
    if (!lastMessage || !lastMessage.attachments?.[0]) return null;
    
    const attachment = lastMessage.attachments[0];
    if (attachment.type === 'image' || attachment.image_url) {
      return 'image';
    } else if (attachment.type === 'video' || attachment.asset_url?.includes('video') || attachment.mime_type?.startsWith('video/')) {
      return 'videocam';
    } else if (attachment.type === 'audio' || attachment.asset_url?.includes('audio') || attachment.mime_type?.startsWith('audio/')) {
      return 'mic';
    } else {
      return 'document';
    }
  };

  // ________________________________________READ RECEIPT FUNCTIONS________________________________________
  // Get read receipt info for rendering
  const getReadReceiptInfo = (message: any) => {
    if (!message || message.user?.id !== user?.id) {
      return null;
    }
    
    const readStatus = getReadReceiptStatus(message);
    return {
      read: readStatus.read,
      delivered: readStatus.delivered,
      sent: !readStatus.delivered
    };
  };

  // Get member count for group chats
  const getMemberCount = (): string | null => {
    if (!isGroupChat()) return null;
    
    // Count only active members (exclude left members)
    const leftMembers = channel.data?.left_members as string[] || [];
    const activeMembers = Object.values(channel.state.members).filter(member => 
      !leftMembers.includes(member.user_id)
    );
    
    const memberCount = activeMembers.length;
    return `${memberCount} members`;
  };

  // Get read receipt status for a message
  const getReadReceiptStatus = (message: any): { delivered: boolean; read: boolean; readBy: string[] } => {
    if (!message || !user) {
      return { delivered: false, read: false, readBy: [] };
    }

    // Get all members except the sender
    const members = Object.values(channel.state.members);
    const otherMembers = members.filter(member => member.user_id !== message.user?.id);
    
    // Check if message is delivered (exists in channel)
    const delivered = true; // If message exists, it's delivered
    
    // Check who has read the message
    const readBy: string[] = [];
    if (channel.state.read) {
      otherMembers.forEach(member => {
        const memberRead = channel.state.read[member.user_id];
        if (memberRead && memberRead.last_read >= message.created_at) {
          readBy.push(member.user_id);
        }
      });
    }
    
    const read = readBy.length === otherMembers.length && otherMembers.length > 0;
    
    return { delivered, read, readBy };
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

  // ________________________________________EFFECTS________________________________________
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


  // ________________________________________EVENT HANDLERS________________________________________
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


  // ________________________________________RENDER________________________________________
  return (
    <TouchableOpacity
      style={[styles.container, hasUserLeft() && styles.leftGroupContainer]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {getChannelAvatar()}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View style={styles.nameContainer}>
            <Text style={[styles.channelName, hasUserLeft() && styles.leftGroupName, isBlocked && styles.blockedChannelName]} numberOfLines={1}>
              {getChannelName()}
            </Text>
            {isBlocked && (
              <View style={styles.blockedBadge}>
                <Ionicons name="ban" size={12} color="#FF3B30" />
                <Text style={styles.blockedBadgeText}>Blocked</Text>
              </View>
            )}
          </View>
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
              <View style={styles.messageAndReceipt}>
                {(() => {
                  const lastMessage = channel.state.messages[channel.state.messages.length - 1];
                  const receiptInfo = getReadReceiptInfo(lastMessage);
                  
                  if (receiptInfo && !isSearchResult) {
                    return (
                      <View style={styles.readReceiptContainer}>
                        {receiptInfo.read ? (
                          <Ionicons 
                            name="checkmark-done" 
                            size={16} 
                            color="blue" 
                            style={styles.readReceiptIcon}
                          />
                        ) : receiptInfo.delivered ? (
                          <Ionicons 
                            name="checkmark" 
                            size={16} 
                            color="#007AFF" 
                            style={styles.readReceiptIcon}
                          />
                        ) : (
                          <Ionicons 
                            name="time" 
                            size={16} 
                            color="#8E8E93" 
                            style={styles.readReceiptIcon}
                          />
                        )}
                      </View>
                    );
                  }
                  return null;
                })()}
                <View style={styles.messageWithIcon}>
                  {(() => {
                    const lastMessage = channel.state.messages[channel.state.messages.length - 1];
                    if (!lastMessage) return null;
                    
                    const attachmentText = getAttachmentDisplayText(lastMessage);
                    if (!attachmentText) return null;
                    
                    // For group chats, show icon after username
                    if (isGroupChat() && lastMessage.user?.id !== user?.id) {
                      const senderName = lastMessage.user?.name || lastMessage.user?.full_name || 'Unknown';
                      const iconName = getAttachmentIconName();
                      
                      return (
                        <>
                          <Text style={styles.usernameText} numberOfLines={1}>
                            {senderName as string}:
                          </Text>
                          <Ionicons 
                            name={iconName as any} 
                            size={14} 
                            color="#666" 
                            style={[styles.attachmentIcon, { marginLeft: 0 }]}
                          />
                          <Text style={styles.attachmentText} numberOfLines={1}>
                            {attachmentText}
                          </Text>
                        </>
                      );
                    }
                    
                    // For other cases, show icon before message
                    const iconName = getAttachmentIconName();
                    return (
                      <>
                        <Ionicons 
                          name={iconName as any} 
                          size={14} 
                          color="#666" 
                          style={styles.attachmentIcon}
                        />
                        <Text style={styles.lastMessage} numberOfLines={1}>
                          {getLastMessage()}
                        </Text>
                      </>
                    );
                  })()}
                  {(() => {
                    const lastMessage = channel.state.messages[channel.state.messages.length - 1];
                    if (!lastMessage || lastMessage.attachments?.[0]) return null;
                    
                    return (
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {getLastMessage()}
                      </Text>
                    );
                  })()}
                </View>
              </View>
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
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if the channel data that affects the display has changed
  const prevChannel = prevProps.channel;
  const nextChannel = nextProps.channel;
  
  // Check if channel ID changed
  if (prevChannel.cid !== nextChannel.cid) return false;
  
  // Check if search-related props changed
  if (prevProps.searchQuery !== nextProps.searchQuery) return false;
  if (prevProps.isSearchResult !== nextProps.isSearchResult) return false;
  if (prevProps.matchingMessages !== nextProps.matchingMessages) return false;
  
  // Check if channel data that affects display changed
  if (prevChannel.data?.name !== nextChannel.data?.name) return false;
  if (prevChannel.data?.image !== nextChannel.data?.image) return false;
  if (prevChannel.data?.left_members !== nextChannel.data?.left_members) return false;
  
  // Check if last message changed (for preview text)
  const prevLastMessage = prevChannel.state.messages[prevChannel.state.messages.length - 1];
  const nextLastMessage = nextChannel.state.messages[nextChannel.state.messages.length - 1];
  if (prevLastMessage?.id !== nextLastMessage?.id) return false;
  if (prevLastMessage?.text !== nextLastMessage?.text) return false;
  if (prevLastMessage?.created_at !== nextLastMessage?.created_at) return false;
  
  // Check if unread count changed
  if (prevChannel.state.unreadCount !== nextChannel.state.unreadCount) return false;
  
  // Check if last message timestamp changed
  if (prevChannel.state.last_message_at !== nextChannel.state.last_message_at) return false;
  
  // Check if members changed (for online status and group info)
  const prevMembers = Object.keys(prevChannel.state.members);
  const nextMembers = Object.keys(nextChannel.state.members);
  if (prevMembers.length !== nextMembers.length) return false;
  if (!prevMembers.every(memberId => nextMembers.includes(memberId))) return false;
  
  // If all checks pass, don't re-render
  return true;
});

export default ChannelListItem;

// ________________________________________STYLES________________________________________
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  blockedChannelName: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe6e6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  blockedBadgeText: {
    fontSize: 10,
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 2,
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
  messageAndReceipt: {
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
  readReceiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  readReceiptIcon: {
    marginRight: 2,
  },
  messageWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attachmentIcon: {
    marginRight: 4,
    marginLeft: 2,
  },
  usernameText: {
    fontSize: 14,
    color: '#666',
  },
  attachmentText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  leftGroupContainer: {
    opacity: 0.6,
    backgroundColor: '#f8f8f8',
  },
  leftGroupName: {
    color: '#999',
    fontStyle: 'italic',
  },
});
