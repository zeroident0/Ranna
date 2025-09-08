import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Modal,
  Image,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useChatContext } from 'stream-chat-expo';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import ProfileImage from '../../components/ProfileImage';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import CustomAlert from '../../components/CustomAlert';
import * as ImagePicker from 'expo-image-picker';

interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export default function GroupInfoScreen() {
  const [channel, setChannel] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showInviteMembers, setShowInviteMembers] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  
  const { cid } = useLocalSearchParams<{ cid: string }>();
  const { client } = useChatContext();
  const { user: currentUser } = useAuth();
  const { alertState, showSuccess, showError, showWarning, showInfo, showConfirm, hideAlert } = useCustomAlert();

  // Helper function to check if current user is admin
  const isCurrentUserAdmin = () => {
    if (!channel || !currentUser) return false;
    const admins = channel.data?.admins || [];
    return admins.includes(currentUser.id);
  };

  // Helper function to check if current user has left the group
  const hasCurrentUserLeft = () => {
    if (!channel || !currentUser) return false;
    const leftMembers = channel.data?.left_members as string[] || [];
    return leftMembers.includes(currentUser.id);
  };

  // Helper function to check if a member is admin
  const isMemberAdmin = (member: any) => {
    const admins = channel?.data?.admins || [];
    return admins.includes(member.user_id);
  };

  // Helper function to check if current user has a pending invite
  const hasCurrentUserPendingInvite = () => {
    if (!channel || !currentUser) return false;
    const invites = channel.data?.invites as string[] || [];
    return invites.includes(currentUser.id);
  };

  // Function to query pending invites for this channel
  const fetchPendingInvites = async () => {
    try {
      const channels = await client.queryChannels({
        invite: 'pending',
        cid: cid
      });
      
      if (channels.length > 0) {
        const channelData = channels[0];
        // Get invited users from channel data
        const invitedUserIds = (channelData.data?.invites as string[]) || [];
        if (invitedUserIds.length > 0) {
          // Fetch user details for invited users
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', invitedUserIds);
          
          setPendingInvites(profiles || []);
        }
      }
    } catch (error) {
      console.error('Error fetching pending invites:', error);
    }
  };

  // Function to accept an invite
  const handleAcceptInvite = async () => {
    try {
      await channel.acceptInvite({
        message: { text: `${(currentUser as any)?.full_name || 'User'} joined the group!` }
      });
      
      // Refresh channel data
      const channels = await client.queryChannels({ cid });
      setChannel(channels[0]);
      
      // Update members list
      const leftMembers = channels[0].data?.left_members as string[] || [];
      const allMembers = Object.values(channels[0].state.members);
      const activeMembers = allMembers.filter(member => 
        !leftMembers.includes(member.user_id)
      );
      setMembers(activeMembers);
      
      showSuccess('Success', 'You have joined the group!');
    } catch (error) {
      console.error('Error accepting invite:', error);
      showError('Error', 'Failed to accept invitation');
    }
  };

  // Function to reject an invite
  const handleRejectInvite = async () => {
    showConfirm(
      'Reject Invitation',
      'Are you sure you want to reject this group invitation?',
      async () => {
        try {
          await channel.rejectInvite();
          showSuccess('Success', 'Invitation rejected');
          router.replace('/(home)/(tabs)/');
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

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const channels = await client.queryChannels({ cid });
        const channelData = channels[0];
        setChannel(channelData);
        setNewGroupName(channelData?.data?.name || '');
        
        // Get member details (exclude left members)
        const leftMembers = channelData.data?.left_members as string[] || [];
        const allMembers = Object.values(channelData.state.members);
        const activeMembers = allMembers.filter(member => 
          !leftMembers.includes(member.user_id)
        );
        setMembers(activeMembers);
        
        // Fetch all users for adding members
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUser.id);
        
        // Filter out users who are already active members
        const existingMemberIds = activeMembers.map(member => member.user_id);
        const availableUsers = profiles?.filter(profile => 
          !existingMemberIds.includes(profile.id)
        ) || [];
        
        setAllUsers(availableUsers);
        
        // Fetch pending invites
        await fetchPendingInvites();
      } catch (error) {
        console.error('Error fetching channel:', error);
        showError('Error', 'Failed to load group information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannel();
  }, [cid, client, currentUser]);

  const handleRenameGroup = async () => {
    if (!isCurrentUserAdmin()) {
      showError('Error', 'Only admins can rename the group');
      return;
    }

    if (!newGroupName.trim()) {
      showError('Error', 'Group name cannot be empty');
      return;
    }

    try {
      await channel.update({ name: newGroupName.trim() });
      setShowRenameModal(false);
      showSuccess('Success', 'Group name updated successfully');
    } catch (error) {
      console.error('Error renaming group:', error);
      showError('Error', 'Failed to rename group');
    }
  };

  // Function to directly add a member (no invitation needed)
  const handleAddMember = async (user: User) => {
    if (!isCurrentUserAdmin()) {
      showError('Error', 'Only admins can add members');
      return;
    }

    try {
      // Directly add the member to the group
      await channel.addMembers([user.id]);
      
      // Update local state
      const newMember = {
        user_id: user.id,
        user: {
          id: user.id,
          name: user.full_name,
          full_name: user.full_name,
          image: user.avatar_url,
        },
      };
      setMembers(prev => [...prev, newMember]);
      setAllUsers(prev => prev.filter(u => u.id !== user.id));
      
      showSuccess('Success', `${user.full_name} added to the group`);
    } catch (error) {
      console.error('Error adding member:', error);
      showError('Error', 'Failed to add member');
    }
  };

  // Function to invite a member (they need to accept)
  const handleInviteMember = async (user: User) => {
    if (!isCurrentUserAdmin()) {
      showError('Error', 'Only admins can invite members');
      return;
    }

    try {
      // Use inviteMembers to send an invitation
      await channel.inviteMembers([user.id]);
      
      // Remove user from available users list since they've been invited
      setAllUsers(prev => prev.filter(u => u.id !== user.id));
      
      showSuccess('Success', `Invitation sent to ${user.full_name}`);
    } catch (error) {
      console.error('Error inviting member:', error);
      showError('Error', 'Failed to send invitation');
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (!isCurrentUserAdmin()) {
      showError('Error', 'Only admins can remove members');
      return;
    }

    if (member.user_id === currentUser.id) {
      showError('Error', 'You cannot remove yourself from the group');
      return;
    }

    showConfirm(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.name || member.user?.full_name} from the group?`,
      async () => {
        try {
          await channel.removeMembers([member.user_id]);
          setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
          showSuccess('Success', 'Member removed from the group');
        } catch (error) {
          console.error('Error removing member:', error);
          showError('Error', 'Failed to remove member');
        }
      },
      undefined,
      'Remove',
      'Cancel'
    );
  };

  const handlePromoteToAdmin = async (member: any) => {
    if (!isCurrentUserAdmin()) {
      showError('Error', 'Only admins can promote members');
      return;
    }

    showConfirm(
      'Promote to Admin',
      `Are you sure you want to promote ${member.user?.name || member.user?.full_name} to admin?`,
      async () => {
        try {
          const currentAdmins = channel.data?.admins || [];
          const updatedAdmins = [...currentAdmins, member.user_id];
          await channel.update({ admins: updatedAdmins });
          showSuccess('Success', 'Member promoted to admin');
        } catch (error) {
          console.error('Error promoting member:', error);
          showError('Error', 'Failed to promote member');
        }
      },
      undefined,
      'Promote',
      'Cancel'
    );
  };

  const handleDemoteFromAdmin = async (member: any) => {
    if (!isCurrentUserAdmin()) {
      showError('Error', 'Only admins can demote members');
      return;
    }

    if (member.user_id === currentUser.id) {
      showError('Error', 'You cannot demote yourself');
      return;
    }

    showConfirm(
      'Remove Admin',
      `Are you sure you want to remove admin privileges from ${member.user?.name || member.user?.full_name}?`,
      async () => {
        try {
          const currentAdmins = channel.data?.admins || [];
          const updatedAdmins = currentAdmins.filter(adminId => adminId !== member.user_id);
          await channel.update({ admins: updatedAdmins });
          showSuccess('Success', 'Admin privileges removed');
        } catch (error) {
          console.error('Error demoting member:', error);
          showError('Error', 'Failed to remove admin privileges');
        }
      },
      undefined,
      'Remove',
      'Cancel'
    );
  };

  const handleLeaveGroup = () => {
    const isAdmin = isCurrentUserAdmin();
    const currentAdmins = channel?.data?.admins || [];
    const isOnlyAdmin = isAdmin && currentAdmins.length === 1;

    if (isOnlyAdmin) {
      // If current user is the only admin, automatically assign a new admin
      const nonAdminMembers = members.filter(member => 
        member.user_id !== currentUser.id && !isMemberAdmin(member)
      );

      if (nonAdminMembers.length === 0) {
        showWarning('Cannot Leave', 'You are the only member of this group. You cannot leave.');
        return;
      }

      // Automatically choose the first available member as the new admin
      const newAdmin = nonAdminMembers[0];
      
      showConfirm(
        'Leave Group',
        `You are the only admin. ${newAdmin.user?.name || newAdmin.user?.full_name} will automatically become the new admin. Are you sure you want to leave?`,
        async () => {
          try {
            // Assign the selected member as admin
            const updatedAdmins = [...currentAdmins, newAdmin.user_id];
            await channel.update({ admins: updatedAdmins });

            // Remove current user from admins
            const finalAdmins = updatedAdmins.filter(adminId => adminId !== currentUser.id);
            await channel.update({ admins: finalAdmins });
            
            // Mark user as left but keep them as a member so they can still see the channel
            const leftMembers = channel.data?.left_members || [];
            if (!leftMembers.includes(currentUser.id)) {
              const updatedLeftMembers = [...leftMembers, currentUser.id];
              await channel.update({ left_members: updatedLeftMembers });
            }
            
            router.replace('/(home)/(tabs)/');
          } catch (error) {
            console.error('Error leaving group:', error);
            showError('Error', 'Failed to leave group');
          }
        },
        undefined,
        'Leave',
        'Cancel'
      );
    } else {
      // Normal leave flow for non-admins or when there are other admins
      showConfirm(
        'Leave Group',
        'Are you sure you want to leave this group? You can still view the chat history but won\'t be able to send messages.',
        async () => {
          try {
            // If current user is admin but not the only one, remove from admins first
            if (isAdmin) {
              const updatedAdmins = currentAdmins.filter(adminId => adminId !== currentUser.id);
              await channel.update({ admins: updatedAdmins });
            }
            
            // Mark user as left but keep them as a member so they can still see the channel
            const leftMembers = channel.data?.left_members || [];
            if (!leftMembers.includes(currentUser.id)) {
              const updatedLeftMembers = [...leftMembers, currentUser.id];
              await channel.update({ left_members: updatedLeftMembers });
            }
            
            router.replace('/(home)/(tabs)/');
          } catch (error) {
            console.error('Error leaving group:', error);
            showError('Error', 'Failed to leave group');
          }
        },
        undefined,
        'Leave',
        'Cancel'
      );
    }
  };


  const pickGroupImage = async () => {
    if (!isCurrentUserAdmin()) {
      showError('Error', 'Only admins can change the group image');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await updateGroupImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showError('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadGroupImage = async (imageUri: string): Promise<string | null> => {
    try {
      console.log('Starting image upload process...');
      console.log('Image URI:', imageUri);
      
      // Check if we have valid Supabase configuration
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Supabase configuration missing');
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      console.log('Fetching image data...');
      const response = await fetch(imageUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Image blob size:', blob.size, 'bytes');
      
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `group_${Date.now()}.${fileExt}`;
      const filePath = `group-images/${fileName}`;

      console.log('Uploading to Supabase storage...');
      console.log('File path:', filePath);
      console.log('Content type:', `image/${fileExt}`);

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        console.error('Supabase storage error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Storage error: ${error.message}`);
      }

      console.log('Upload successful, getting public URL...');
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      console.error('Error stack:', error.stack);
      
      // Provide more specific error messages
      if (error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else if (error.message.includes('Supabase configuration')) {
        throw new Error('App configuration error. Please contact support.');
      } else if (error.message.includes('Storage error')) {
        throw new Error('Failed to upload to storage. Please try again.');
      } else {
        throw new Error(`Upload failed: ${error.message}`);
      }
    }
  };

  const updateGroupImage = async (imageUri: string) => {
    setIsUpdatingImage(true);
    
    try {
      const imageUrl = await uploadGroupImage(imageUri);
      
      await channel.update({ image: imageUrl });
      
      // Refresh channel data to ensure UI updates
      const channels = await client.queryChannels({ cid });
      setChannel(channels[0]);
      
      showSuccess('Success', 'Group image updated successfully');
    } catch (error) {
      console.error('Error updating group image:', error);
      showError('Upload Error', error.message || 'Failed to update group image');
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const removeGroupImage = () => {
    if (!isCurrentUserAdmin()) {
      showError('Error', 'Only admins can remove the group image');
      return;
    }

    showConfirm(
      'Remove Group Image',
      'Are you sure you want to remove the group image?',
      async () => {
        setIsUpdatingImage(true);
        try {
          await channel.update({ image: null });
          
          // Refresh channel data to ensure UI updates
          const channels = await client.queryChannels({ cid });
          setChannel(channels[0]);
          
          showSuccess('Success', 'Group image removed successfully');
        } catch (error) {
          console.error('Error removing group image:', error);
          showError('Error', 'Failed to remove group image');
        } finally {
          setIsUpdatingImage(false);
        }
      },
      undefined,
      'Remove',
      'Cancel'
    );
  };

  const renderMember = ({ item }: { item: any }) => {
    const isCurrentUser = item.user_id === currentUser.id;
    const isAdmin = isMemberAdmin(item);
    const canManageAdmins = isCurrentUserAdmin();
    
    return (
      <View style={styles.memberItem}>
        <ProfileImage
          avatarUrl={item.user?.image}
          fullName={item.user?.name || item.user?.full_name}
          size={48}
          showBorder={false}
        />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.user?.name || item.user?.full_name}
            {isCurrentUser && ' (You)'}
          </Text>
          {isAdmin && (
            <Text style={styles.adminBadge}>Admin</Text>
          )}
        </View>
        <View style={styles.memberActions}>
          {!isCurrentUser && canManageAdmins && (
            <>
              {!isAdmin ? (
                <TouchableOpacity
                  onPress={() => handlePromoteToAdmin(item)}
                  style={styles.adminActionButton}
                >
                  <Ionicons name="arrow-up-circle" size={24} color="#007AFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleDemoteFromAdmin(item)}
                  style={styles.adminActionButton}
                >
                  <Ionicons name="arrow-down-circle" size={24} color="#ff9500" />
                </TouchableOpacity>
              )}
            </>
          )}
          {!isCurrentUser && canManageAdmins && (
            <TouchableOpacity
              onPress={() => handleRemoveMember(item)}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={24} color="#ff3b30" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderAvailableUser = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <ProfileImage
        avatarUrl={item.avatar_url}
        fullName={item.full_name}
        size={40}
        showBorder={false}
      />
      <Text style={styles.userName}>{item.full_name}</Text>
      <View style={styles.userActions}>
        <TouchableOpacity
          onPress={() => handleAddMember(item)}
          style={styles.userActionButton}
        >
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleInviteMember(item)}
          style={styles.userActionButton}
        >
          <Ionicons name="mail" size={24} color="#34C759" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: '' }} />

      {/* Group Image */}
      <View style={styles.groupImageSection}>
        <View style={styles.groupImageContainer}>
          <View style={styles.groupImageWrapper}>
            <ProfileImage
              avatarUrl={channel?.data?.image}
              fullName={channel?.data?.name || 'Group'}
              size={120}
              showBorder={false}
            />
            {isCurrentUserAdmin() && (
              <View style={styles.groupImageActions}>
                <TouchableOpacity
                  onPress={pickGroupImage}
                  style={styles.imageActionButton}
                  disabled={isUpdatingImage}
                >
                  <Ionicons name="camera" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={removeGroupImage}
                  style={styles.imageActionButton}
                  disabled={isUpdatingImage}
                >
                  <Ionicons name="trash" size={20} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {isUpdatingImage && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Updating...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Group Name */}
      <View style={styles.groupNameSection}>
        <Text style={styles.groupName}>{channel?.data?.name || 'Group Chat'}</Text>
        {isCurrentUserAdmin() && !hasCurrentUserLeft() && (
          <TouchableOpacity
            onPress={() => setShowRenameModal(true)}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Members Count */}
      <View style={styles.membersCountSection}>
        <Text style={styles.membersCount}>{members.length} members</Text>
      </View>

      {/* Members List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{members.length} members</Text>
          {isCurrentUserAdmin() && !hasCurrentUserLeft() && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                onPress={() => setShowAddMembers(true)}
                style={[styles.actionButton, styles.addButton]}
              >
                <Ionicons name="person-add" size={16} color="#007AFF" />
                <Text style={styles.actionButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowInviteMembers(true)}
                style={[styles.actionButton, styles.inviteButton]}
              >
                <Ionicons name="mail" size={16} color="#34C759" />
                <Text style={[styles.actionButtonText, styles.inviteButtonText]}>Invite</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.user_id}
          scrollEnabled={false}
        />
      </View>

      {/* Pending Invites Section (for admins) */}
      {isCurrentUserAdmin() && pendingInvites.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Invitations ({pendingInvites.length})</Text>
          </View>
          <FlatList
            data={pendingInvites}
            renderItem={({ item }) => (
              <View style={styles.memberItem}>
                <ProfileImage
                  avatarUrl={item.avatar_url}
                  fullName={item.full_name}
                  size={48}
                  showBorder={false}
                />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.full_name}</Text>
                  <Text style={styles.pendingInviteText}>Invitation sent</Text>
                </View>
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    onPress={() => {
                      // Remove from pending invites (cancel invitation)
                      setPendingInvites(prev => prev.filter(invite => invite.id !== item.id));
                      showInfo('Info', 'Invitation cancelled');
                    }}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Invite Response Buttons or Leave Group Button */}
      {hasCurrentUserPendingInvite() ? (
        <View style={styles.inviteButtonContainer}>
          <TouchableOpacity
            style={[styles.inviteResponseButton, styles.acceptButton]}
            onPress={handleAcceptInvite}
          >
            <Text style={styles.inviteResponseButtonText}>Accept Invitation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inviteResponseButton, styles.rejectButton]}
            onPress={handleRejectInvite}
          >
            <Text style={styles.inviteResponseButtonText}>Reject Invitation</Text>
          </TouchableOpacity>
        </View>
      ) : hasCurrentUserLeft() ? (
        <TouchableOpacity
          style={[styles.leaveButton, styles.rejoinButton]}
          onPress={() => {
            // TODO: Implement rejoin functionality
            showInfo('Info', 'Rejoin functionality will be implemented soon');
          }}
        >
          <Text style={styles.leaveButtonText}>Rejoin Group</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={handleLeaveGroup}
        >
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>
      )}

      {/* Add Members Modal */}
      <Modal
        visible={showAddMembers}
        animationType="slide"
        onRequestClose={() => setShowAddMembers(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddMembers(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Members</Text>
            <View style={{ width: 60 }} />
          </View>
          
          <View style={styles.modalDescription}>
            <Text style={styles.modalDescriptionText}>
              Users will be added directly to the group without needing to accept an invitation.
            </Text>
          </View>
          
          <FlatList
            data={allUsers}
            renderItem={renderAvailableUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.usersList}
          />
        </SafeAreaView>
      </Modal>

      {/* Invite Members Modal */}
      <Modal
        visible={showInviteMembers}
        animationType="slide"
        onRequestClose={() => setShowInviteMembers(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInviteMembers(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invite Members</Text>
            <View style={{ width: 60 }} />
          </View>
          
          <View style={styles.modalDescription}>
            <Text style={styles.modalDescriptionText}>
              Users will receive an invitation and need to accept it to join the group.
            </Text>
          </View>
          
          <FlatList
            data={allUsers}
            renderItem={renderAvailableUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.usersList}
          />
        </SafeAreaView>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.renameModalOverlay}>
          <View style={styles.renameModalContainer}>
            <Text style={styles.renameModalTitle}>Rename Group</Text>
            <TextInput
              style={styles.renameInput}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Group name"
              maxLength={50}
              autoFocus
            />
            <View style={styles.renameModalButtons}>
              <TouchableOpacity
                style={styles.renameCancelButton}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.renameSaveButton}
                onPress={handleRenameGroup}
              >
                <Text style={styles.renameSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


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
    </SafeAreaView>
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
  groupNameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'white',

    position: 'relative',
  },
  groupName: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  editButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  membersCountSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',

  },
  membersCount: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButton: {
    backgroundColor: '#f0f8ff',
  },
  inviteButton: {
    backgroundColor: '#f0fff4',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  addButtonText: {
    color: '#007AFF',
  },
  inviteButtonText: {
    color: '#34C759',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  adminBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminActionButton: {
    padding: 4,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  leaveButton: {
    margin: 16,
    paddingVertical: 16,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    alignItems: 'center',
  },
  rejoinButton: {
    backgroundColor: '#007AFF',
  },
  leaveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  usersList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  userActionButton: {
    padding: 4,
  },
  modalDescription: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalDescriptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  renameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    minWidth: 280,
  },
  renameModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  renameInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  renameModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  renameCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  renameCancelText: {
    fontSize: 16,
    color: '#666',
  },
  renameSaveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  renameSaveText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  groupImageSection: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 5,
    paddingBottom: 20, // Add extra padding to accommodate buttons
  },
  groupImageContainer: {
    alignItems: 'center',
    marginTop: 12,
    position: 'relative',
    paddingBottom: 15, // Add padding to prevent clipping
  },
  groupImageWrapper: {
    position: 'relative',
  },
  groupImageActions: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageActionButton: {
    padding: 8,
    marginHorizontal: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  inviteButtonContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  inviteResponseButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  inviteResponseButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  pendingInviteText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
    marginTop: 2,
  },
});
