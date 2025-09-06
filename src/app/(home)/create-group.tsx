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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatContext } from 'stream-chat-expo';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import UserListItem from '../../components/UserListItem';
import ProfileImage from '../../components/ProfileImage';
import * as ImagePicker from 'expo-image-picker';

interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export default function CreateGroupScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [groupImage, setGroupImage] = useState<string | null>(null);
  
  const { client } = useChatContext();
  const { user: currentUser } = useAuth();

  // Fetch all users except current user
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id);

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(profiles || []);
      setFilteredUsers(profiles || []);
    };

    fetchUsers();
  }, [currentUser]);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(selected => selected.id === user.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const testSupabaseConnection = async () => {
    try {
      console.log('=== SUPABASE CONNECTION TEST ===');
      console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('Supabase Key exists:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
      console.log('Supabase Key length:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.length);
      
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        Alert.alert('Configuration Error', 'Missing Supabase environment variables. Please check your .env file.');
        return;
      }

      // Test basic connection by trying to list buckets
      console.log('Testing storage connection...');
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Supabase storage test failed:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        Alert.alert('Storage Test Failed', `Error: ${error.message}\n\nCheck your Supabase project configuration.`);
      } else {
        console.log('Supabase storage test successful');
        console.log('Available buckets:', data?.map(b => b.name));
        
        // Check if avatars bucket exists
        const hasAvatarsBucket = data?.some(bucket => bucket.name === 'avatars');
        if (hasAvatarsBucket) {
          Alert.alert('Connection Test', '✅ Supabase connection is working!\n✅ avatars bucket found');
        } else {
          Alert.alert('Connection Test', '✅ Supabase connection is working!\n❌ avatars bucket not found\n\nPlease create an "avatars" bucket in your Supabase project.');
        }
      }
    } catch (error) {
      console.error('Connection test error:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Connection Test Failed', `Network error: ${error.message}\n\nThis usually means:\n1. No internet connection\n2. Supabase URL is incorrect\n3. Firewall blocking requests`);
    }
  };

  const pickGroupImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setGroupImage(result.assets[0].uri);
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

  const createGroupChat = async (skipImageUpload = false) => {
    if (selectedUsers.length === 0) {
      Alert.alert('No Members Selected', 'Please select at least one person to create a group chat.');
      return;
    }

    if (!groupName.trim()) {
      Alert.alert('Group Name Required', 'Please enter a name for the group chat.');
      return;
    }

    // Ensure we have at least 2 total members (current user + at least 1 other)
    if (selectedUsers.length < 1) {
      Alert.alert('Invalid Group', 'A group must have at least 2 members.');
      return;
    }

    setIsCreating(true);

    try {
      // Upload group image if one was selected and not skipping
      let groupImageUrl = null;
      if (groupImage && !skipImageUpload) {
        try {
          groupImageUrl = await uploadGroupImage(groupImage);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          setIsCreating(false);
          
          // Ask user if they want to continue without image
          Alert.alert(
            'Upload Failed', 
            `${uploadError.message}\n\nWould you like to create the group without an image?`,
            [
              {
                text: 'Cancel',
                style: 'cancel'
              },
              {
                text: 'Continue Without Image',
                onPress: () => createGroupChat(true) // Retry without image
              }
            ]
          );
          return;
        }
      }

      // Create member list including current user
      const memberIds = [currentUser.id, ...selectedUsers.map(user => user.id)];
      
      console.log('Creating group with members:', memberIds);
      console.log('Group name:', groupName.trim());
      console.log('Group image:', groupImageUrl);
      console.log('Total members:', memberIds.length);
      
      // Generate a unique channel ID to ensure it's treated as a group
      const channelId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the group channel with creator as admin
      console.log('Creating channel with group name...');
      const channel = client.channel('messaging', channelId, {
        name: groupName.trim(),
        image: groupImageUrl, // Add group image to channel data
        members: memberIds,
        created_by_id: currentUser.id,
        // Store admins as custom field since role changes aren't allowed client-side
        admins: [currentUser.id]
      });

      console.log('Channel created, watching...');
      
      // Watch the channel to create it
      await channel.watch();

      console.log('Group channel created successfully!');
      console.log('Channel CID:', channel.cid);
      console.log('Channel members:', Object.keys(channel.state.members));
      console.log('Channel data:', channel.data);
      console.log('Member count:', Object.keys(channel.state.members).length);
      console.log('Channel name:', channel.data?.name);
      console.log('Channel image:', channel.data?.image);
      console.log('Is group?', channel.data?.name && Object.keys(channel.state.members).length >= 2);

      // Small delay to ensure channel is fully created
      setTimeout(() => {
        // Navigate to the new group chat
        router.replace(`/(home)/channel/${channel.cid}`);
      }, 500);
    } catch (error) {
      console.error('Error creating group chat:', error);
      Alert.alert('Error', 'Failed to create group chat. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.some(selected => selected.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.selectedUserItem]}
        onPress={() => toggleUserSelection(item)}
      >
        <View style={styles.userInfo}>
          <ProfileImage
            avatarUrl={item.avatar_url}
            fullName={item.full_name}
            size={48}
            showBorder={false}
          />
          <Text style={styles.userName}>{item.full_name}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectedUser = ({ item }: { item: User }) => (
    <View style={styles.selectedUserChip}>
      <ProfileImage
        avatarUrl={item.avatar_url}
        fullName={item.full_name}
        size={32}
        showBorder={false}
      />
      <Text style={styles.selectedUserName}>{item.full_name}</Text>
      <TouchableOpacity
        onPress={() => toggleUserSelection(item)}
        style={styles.removeButton}
      >
        <Ionicons name="close" size={16} color="#666" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group Chat</Text>
        <TouchableOpacity
          onPress={createGroupChat}
          disabled={isCreating || selectedUsers.length === 0 || !groupName.trim()}
          style={[
            styles.createButton,
            (isCreating || selectedUsers.length === 0 || !groupName.trim()) && styles.createButtonDisabled
          ]}
        >
          <Text style={[
            styles.createButtonText,
            (isCreating || selectedUsers.length === 0 || !groupName.trim()) && styles.createButtonTextDisabled
          ]}>
            {isCreating ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group Name Input */}
      <View style={styles.groupNameContainer}>
        <TextInput
          style={styles.groupNameInput}
          placeholder="Group name"
          placeholderTextColor="#999"
          value={groupName}
          onChangeText={setGroupName}
          maxLength={50}
        />
      </View>

      {/* Group Image Picker */}
      <View style={styles.groupImageContainer}>
        <Text style={styles.groupImageTitle}>Group Photo (Optional)</Text>
        <TouchableOpacity style={styles.groupImagePicker} onPress={pickGroupImage}>
          {groupImage ? (
            <Image source={{ uri: groupImage }} style={styles.groupImagePreview} />
          ) : (
            <View style={styles.groupImagePlaceholder}>
              <Ionicons name="camera" size={24} color="#666" />
              <Text style={styles.groupImagePlaceholderText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>
        {groupImage && (
          <TouchableOpacity 
            style={styles.removeImageButton} 
            onPress={() => setGroupImage(null)}
          >
            <Ionicons name="close-circle" size={20} color="#ff4444" />
          </TouchableOpacity>
        )}
        
        {/* Debug button - remove this in production */}
        <TouchableOpacity 
          style={styles.debugButton} 
          onPress={testSupabaseConnection}
        >
          <Text style={styles.debugButtonText}>Test Connection</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedUsersContainer}>
          <Text style={styles.selectedUsersTitle}>Selected ({selectedUsers.length})</Text>
          <FlatList
            data={selectedUsers}
            renderItem={renderSelectedUser}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedUsersList}
          />
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for people to add..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.usersList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  createButtonTextDisabled: {
    color: '#999',
  },
  groupNameContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupNameInput: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
  },
  selectedUsersContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  selectedUsersList: {
    paddingRight: 16,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedUserName: {
    marginLeft: 8,
    marginRight: 4,
    fontSize: 14,
    color: '#000',
  },
  removeButton: {
    padding: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  usersList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  selectedUserItem: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    marginLeft: 12,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  groupImageContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  groupImageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  groupImagePicker: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  groupImagePreview: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  groupImagePlaceholder: {
    alignItems: 'center',
  },
  groupImagePlaceholderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  debugButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ff9500',
    borderRadius: 8,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
