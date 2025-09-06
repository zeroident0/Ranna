import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  Modal,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useChatContext } from 'stream-chat-expo';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import ProfileImage from '../../components/ProfileImage';
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
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  
  const { cid } = useLocalSearchParams<{ cid: string }>();
  const { client } = useChatContext();
  const { user: currentUser } = useAuth();

  // Helper function to check if current user is admin
  const isCurrentUserAdmin = () => {
    if (!channel || !currentUser) return false;
    const admins = channel.data?.admins || [];
    return admins.includes(currentUser.id);
  };

  // Helper function to check if a member is admin
  const isMemberAdmin = (member: any) => {
    const admins = channel?.data?.admins || [];
    return admins.includes(member.user_id);
  };

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const channels = await client.queryChannels({ cid });
        const channelData = channels[0];
        setChannel(channelData);
        setNewGroupName(channelData?.data?.name || '');
        
        // Get member details
        const memberList = Object.values(channelData.state.members);
        setMembers(memberList);
        
        // Fetch all users for adding members
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUser.id);
        
        // Filter out users who are already members
        const existingMemberIds = memberList.map(member => member.user_id);
        const availableUsers = profiles?.filter(profile => 
          !existingMemberIds.includes(profile.id)
        ) || [];
        
        setAllUsers(availableUsers);
      } catch (error) {
        console.error('Error fetching channel:', error);
        Alert.alert('Error', 'Failed to load group information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannel();
  }, [cid, client, currentUser]);

  const handleRenameGroup = async () => {
    if (!isCurrentUserAdmin()) {
      Alert.alert('Error', 'Only admins can rename the group');
      return;
    }

    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }

    try {
      await channel.update({ name: newGroupName.trim() });
      setShowRenameModal(false);
      Alert.alert('Success', 'Group name updated successfully');
    } catch (error) {
      console.error('Error renaming group:', error);
      Alert.alert('Error', 'Failed to rename group');
    }
  };

  const handleAddMember = async (user: User) => {
    if (!isCurrentUserAdmin()) {
      Alert.alert('Error', 'Only admins can add members');
      return;
    }

    try {
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
      
      Alert.alert('Success', `${user.full_name} added to the group`);
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert('Error', 'Failed to add member');
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (!isCurrentUserAdmin()) {
      Alert.alert('Error', 'Only admins can remove members');
      return;
    }

    if (member.user_id === currentUser.id) {
      Alert.alert('Error', 'You cannot remove yourself from the group');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.name || member.user?.full_name} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await channel.removeMembers([member.user_id]);
              setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
              Alert.alert('Success', 'Member removed from the group');
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handlePromoteToAdmin = async (member: any) => {
    if (!isCurrentUserAdmin()) {
      Alert.alert('Error', 'Only admins can promote members');
      return;
    }

    Alert.alert(
      'Promote to Admin',
      `Are you sure you want to promote ${member.user?.name || member.user?.full_name} to admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            try {
              const currentAdmins = channel.data?.admins || [];
              const updatedAdmins = [...currentAdmins, member.user_id];
              await channel.update({ admins: updatedAdmins });
              Alert.alert('Success', 'Member promoted to admin');
            } catch (error) {
              console.error('Error promoting member:', error);
              Alert.alert('Error', 'Failed to promote member');
            }
          },
        },
      ]
    );
  };

  const handleDemoteFromAdmin = async (member: any) => {
    if (!isCurrentUserAdmin()) {
      Alert.alert('Error', 'Only admins can demote members');
      return;
    }

    if (member.user_id === currentUser.id) {
      Alert.alert('Error', 'You cannot demote yourself');
      return;
    }

    Alert.alert(
      'Remove Admin',
      `Are you sure you want to remove admin privileges from ${member.user?.name || member.user?.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentAdmins = channel.data?.admins || [];
              const updatedAdmins = currentAdmins.filter(adminId => adminId !== member.user_id);
              await channel.update({ admins: updatedAdmins });
              Alert.alert('Success', 'Admin privileges removed');
            } catch (error) {
              console.error('Error demoting member:', error);
              Alert.alert('Error', 'Failed to remove admin privileges');
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await channel.removeMembers([currentUser.id]);
              router.replace('/(home)/(tabs)/');
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const pickGroupImage = async () => {
    if (!isCurrentUserAdmin()) {
      Alert.alert('Error', 'Only admins can change the group image');
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
      Alert.alert('Error', 'Failed to pick image. Please try again.');
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
      
      Alert.alert('Success', 'Group image updated successfully');
    } catch (error) {
      console.error('Error updating group image:', error);
      Alert.alert('Upload Error', error.message || 'Failed to update group image');
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const removeGroupImage = () => {
    if (!isCurrentUserAdmin()) {
      Alert.alert('Error', 'Only admins can remove the group image');
      return;
    }

    Alert.alert(
      'Remove Group Image',
      'Are you sure you want to remove the group image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsUpdatingImage(true);
            try {
              await channel.update({ image: null });
              
              // Refresh channel data to ensure UI updates
              const channels = await client.queryChannels({ cid });
              setChannel(channels[0]);
              
              Alert.alert('Success', 'Group image removed successfully');
            } catch (error) {
              console.error('Error removing group image:', error);
              Alert.alert('Error', 'Failed to remove group image');
            } finally {
              setIsUpdatingImage(false);
            }
          },
        },
      ]
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
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleAddMember(item)}
    >
      <ProfileImage
        avatarUrl={item.avatar_url}
        fullName={item.full_name}
        size={40}
        showBorder={false}
      />
      <Text style={styles.userName}>{item.full_name}</Text>
      <Ionicons name="add-circle" size={24} color="#007AFF" />
    </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Group Name */}
      <View style={styles.groupNameSection}>
        <Text style={styles.groupName}>{channel?.data?.name || 'Group Chat'}</Text>
        {isCurrentUserAdmin() && (
          <TouchableOpacity
            onPress={() => setShowRenameModal(true)}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Group Image */}
      <View style={styles.groupImageSection}>
        <Text style={styles.sectionTitle}>Group Photo</Text>
        <View style={styles.groupImageContainer}>
          {channel?.data?.image ? (
            <View style={styles.groupImageWrapper}>
              <Image 
                source={{ uri: channel.data.image }} 
                style={styles.groupImage} 
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
          ) : (
            <TouchableOpacity
              style={styles.groupImagePlaceholder}
              onPress={pickGroupImage}
              disabled={!isCurrentUserAdmin() || isUpdatingImage}
            >
              <Ionicons name="camera" size={32} color="#666" />
              <Text style={styles.groupImagePlaceholderText}>
                {isCurrentUserAdmin() ? 'Add Group Photo' : 'No Group Photo'}
              </Text>
            </TouchableOpacity>
          )}
          {isUpdatingImage && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Updating...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Members Count */}
      <View style={styles.membersCountSection}>
        <Text style={styles.membersCount}>{members.length} members</Text>
      </View>

      {/* Members List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members</Text>
          {isCurrentUserAdmin() && (
            <TouchableOpacity
              onPress={() => setShowAddMembers(true)}
              style={styles.addButton}
            >
              <Ionicons name="person-add" size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.user_id}
          scrollEnabled={false}
        />
      </View>

      {/* Leave Group Button */}
      <TouchableOpacity
        style={styles.leaveButton}
        onPress={handleLeaveGroup}
      >
        <Text style={styles.leaveButtonText}>Leave Group</Text>
      </TouchableOpacity>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  groupNameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  membersCountSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  membersCount: {
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupImageContainer: {
    alignItems: 'center',
    marginTop: 12,
    position: 'relative',
  },
  groupImageWrapper: {
    position: 'relative',
  },
  groupImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  groupImageActions: {
    position: 'absolute',
    bottom: -5,
    right: -5,
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
  groupImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  groupImagePlaceholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
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
});
