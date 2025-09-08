import { Channel as ChannelType } from 'stream-chat';
import { Alert } from 'react-native';

/**
 * Reusable function to delete/leave a chat channel
 * @param channel - The Stream Chat channel object
 * @param user - The current user object
 * @param isGroupChat - Function to determine if this is a group chat
 * @param onSuccess - Optional callback when deletion is successful
 * @param onError - Optional callback when deletion fails
 */
export const deleteChat = async (
  channel: ChannelType,
  user: any,
  isGroupChat: () => boolean,
  onSuccess?: () => void,
  onError?: (error: string) => void
) => {
  if (!channel || !user) {
    const errorMsg = 'Missing channel or user data';
    onError?.(errorMsg);
    return;
  }

  Alert.alert(
    'Delete Chat',
    'Are you sure you want to delete this chat? This action cannot be undone.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // For group chats, remove the user from the channel
            if (isGroupChat()) {
              await channel.removeMembers([user.id]);
            } else {
              // For 1-on-1 chats, hide the channel
              await channel.hide();
            }
            
            onSuccess?.();
          } catch (error) {
            console.error('Error deleting chat:', error);
            const errorMsg = 'Failed to delete chat. Please try again.';
            onError?.(errorMsg);
            Alert.alert('Error', errorMsg);
          }
        },
      },
    ]
  );
};

/**
 * Helper function to determine if a channel is a group chat
 * @param channel - The Stream Chat channel object
 * @returns boolean indicating if this is a group chat
 */
export const isGroupChat = (channel: ChannelType): boolean => {
  // Groups are identified by having a name (1-on-1 chats don't have names)
  if (!channel.data?.name) return false;
  
  // If it has a name, it's a group regardless of member count
  return true;
};
