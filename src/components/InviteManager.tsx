import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useChatContext } from 'stream-chat-expo';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import ProfileImage from './ProfileImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from './CustomAlert';

interface InviteChannel {
  cid: string;
  data: {
    name?: string;
    image?: string;
    invites?: string[];
  };
  state: {
    members: any;
  };
}

export default function InviteManager() {
  const [pendingInvites, setPendingInvites] = useState<InviteChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const { client } = useChatContext();
  const { user } = useAuth();
  const { alertState, showSuccess, showError, showConfirm, hideAlert } = useCustomAlert();

  // Fetch pending invites for the current user
  const fetchPendingInvites = async () => {
    try {
      setIsLoading(true);
      const channels = await client.queryChannels({
        invite: 'pending',
      });
      
      setPendingInvites(channels);
    } catch (error) {
      console.error('Error fetching pending invites:', error);
      showError('Error', 'Failed to load pending invitations');
    } finally {
      setIsLoading(false);
    }
  };

  // Accept an invite
  const handleAcceptInvite = async (channel: InviteChannel) => {
    try {
      await channel.acceptInvite({
        message: { text: `${user?.full_name || 'User'} joined the group!` }
      });
      
      showSuccess('Success', 'You have joined the group!');
      
      // Remove from pending invites
      setPendingInvites(prev => prev.filter(invite => invite.cid !== channel.cid));
      
      // Navigate to the channel
      router.push(`/(home)/channel/${channel.cid}`);
    } catch (error) {
      console.error('Error accepting invite:', error);
      showError('Error', 'Failed to accept invitation');
    }
  };

  // Reject an invite
  const handleRejectInvite = async (channel: InviteChannel) => {
    showConfirm(
      'Reject Invitation',
      `Are you sure you want to reject the invitation to "${channel.data.name || 'this group'}"?`,
      async () => {
        try {
          await channel.rejectInvite();
          showSuccess('Success', 'Invitation rejected');
          
          // Remove from pending invites
          setPendingInvites(prev => prev.filter(invite => invite.cid !== channel.cid));
        } catch (error) {
          console.error('Error rejecting invite:', error);
          showError('Error', 'Failed to reject invitation');
        }
      },
      undefined,
      'Reject',
      'Cancel'
    );
  };

  // Get channel name
  const getChannelName = (channel: InviteChannel): string => {
    if (channel.data?.name) {
      return channel.data.name;
    }
    
    // Generate name from members if no name is set
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
  };

  // Get member count
  const getMemberCount = (channel: InviteChannel): number => {
    return Object.keys(channel.state.members).length;
  };

  useEffect(() => {
    fetchPendingInvites();
  }, []);

  const renderInviteItem = ({ item }: { item: InviteChannel }) => (
    <View style={styles.inviteItem}>
      <View style={styles.inviteHeader}>
        <ProfileImage
          avatarUrl={item.data?.image}
          fullName={getChannelName(item)}
          size={48}
          showBorder={false}
        />
        <View style={styles.inviteInfo}>
          <Text style={styles.channelName}>{getChannelName(item)}</Text>
          <Text style={styles.memberCount}>{getMemberCount(item)} members</Text>
        </View>
      </View>
      
      <View style={styles.inviteActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptInvite(item)}
        >
          <Ionicons name="checkmark" size={20} color="white" />
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectInvite(item)}
        >
          <Ionicons name="close" size={20} color="white" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading invitations...</Text>
      </View>
    );
  }

  if (pendingInvites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="mail-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No pending invitations</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Group Invitations</Text>
        <Text style={styles.headerSubtitle}>{pendingInvites.length} pending</Text>
      </View>
      
      <FlatList
        data={pendingInvites}
        renderItem={renderInviteItem}
        keyExtractor={(item) => item.cid}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  listContainer: {
    padding: 16,
  },
  inviteItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
