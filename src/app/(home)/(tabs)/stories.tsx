import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../providers/AuthProvider';
import { useChatContext } from 'stream-chat-expo';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

interface Story {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  image_url: string;
  created_at: string;
  expires_at: string;
}

export default function StoriesScreen() {
  const { user } = useAuth();
  const { client } = useChatContext();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Load stories from Supabase
  const loadStories = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get all users that the current user follows or has chatted with
      const channels = await client.queryChannels({
        members: { $in: [user.id] },
      });

      const userIds = new Set<string>();
      channels.forEach(channel => {
        Object.keys(channel.state.members).forEach(memberId => {
          if (memberId !== user.id) {
            userIds.add(memberId);
          }
        });
      });

      // Get stories from these users
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select(`
          *,
          profiles!stories_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .in('user_id', Array.from(userIds))
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading stories:', error);
        return;
      }

      const formattedStories: Story[] = storiesData?.map(story => ({
        id: story.id,
        user_id: story.user_id,
        user_name: story.profiles?.full_name || 'Unknown User',
        user_avatar: story.profiles?.avatar_url,
        image_url: story.image_url,
        created_at: story.created_at,
        expires_at: story.expires_at,
      })) || [];

      setStories(formattedStories);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  }, [user, client]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const pickImage = async () => {
    if (!user) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16], // Story aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadStory(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    if (!user) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadStory(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadStory = async (imageUri: string) => {
    if (!user) return;

    try {
      setUploading(true);

      // Check if the bucket exists (but don't try to create it)
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error checking buckets:', bucketsError);
        Alert.alert('Error', 'Failed to access storage. Please check your Supabase configuration.');
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.id === 'story-images');
      
      if (!bucketExists) {
        console.error('story-images bucket not found');
        Alert.alert('Error', 'Storage bucket not found. Please run the database migration to create the "story-images" bucket.');
        return;
      }

      // Upload image to Supabase Storage
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      // Convert image to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('story-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Error', `Failed to upload story: ${uploadError.message}`);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('story-images')
        .getPublicUrl(filePath);

      // Save story to database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        Alert.alert('Error', 'Failed to save story');
        return;
      }

      // Reload stories
      await loadStories();
      Alert.alert('Success', 'Story posted successfully!');
    } catch (error) {
      console.error('Error uploading story:', error);
      Alert.alert('Error', 'Failed to upload story');
    } finally {
      setUploading(false);
    }
  };

  const showStoryOptions = () => {
    Alert.alert(
      'Add to Story',
      'Choose how you want to add to your story',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderStoryItem = ({ item }: { item: Story }) => (
    <TouchableOpacity style={styles.storyItem}>
      <View style={styles.storyImageContainer}>
        <Image source={{ uri: item.image_url }} style={styles.storyImage} />
        <View style={styles.storyOverlay}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: item.user_avatar || 'https://via.placeholder.com/40' }}
              style={styles.userAvatar}
            />
            <Text style={styles.userName}>{item.user_name}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMyStory = () => (
    <TouchableOpacity style={styles.myStoryItem} onPress={showStoryOptions}>
      <View style={styles.myStoryContainer}>
        <View style={styles.addStoryButton}>
          <Ionicons name="add" size={24} color="white" />
        </View>
        <Text style={styles.addStoryText}>Add to Story</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading stories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Stories',
          headerRight: () => (
            <TouchableOpacity onPress={showStoryOptions} style={styles.headerButton}>
              <Ionicons name="camera" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <FlatList
        data={stories}
        renderItem={renderStoryItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesList}
        ListHeaderComponent={renderMyStory}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="camera-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No stories yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share a story!</Text>
          </View>
        )}
      />

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.uploadingText}>Uploading story...</Text>
        </View>
      )}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  storiesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  myStoryItem: {
    marginRight: 16,
  },
  myStoryContainer: {
    alignItems: 'center',
  },
  addStoryButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addStoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  storyItem: {
    marginRight: 16,
  },
  storyImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  userName: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
});
