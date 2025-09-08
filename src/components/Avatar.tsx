import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ProfileImage from './ProfileImage';
import ImageCacheService from '../services/ImageCacheService';

interface Props {
  size: number;
  url: string | null;
  onUpload: (filePath: string) => void;
  onDelete?: () => void;
  userId?: string; // Add userId for cache invalidation
}

export default function Avatar({ url, size = 150, onUpload, onDelete, userId }: Props) {
  const [uploading, setUploading] = useState(false);

  async function uploadAvatar() {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Restrict to only images
        allowsMultipleSelection: false, // Can only select one image
        allowsEditing: true, // Allows the user to crop / rotate their photo before uploading it
        quality: 1,
        exif: false, // We don't want nor need that data.
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picker.');
        return;
      }

      const image = result.assets[0];
      console.log('Got image', image);

      if (!image.uri) {
        throw new Error('No image uri!'); // Realistically, this should never happen, but just in case...
      }

      const arraybuffer = await fetch(image.uri).then((res) =>
        res.arrayBuffer()
      );

      const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const path = `${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Invalidate cache for this user since they uploaded a new image
      if (userId) {
        const cacheService = ImageCacheService.getInstance();
        await cacheService.invalidateUserCache(userId);
      }

      onUpload(data.path);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      } else {
        throw error;
      }
    } finally {
      setUploading(false);
    }
  }

  async function deleteAvatar() {
    if (!url || !onDelete) return;
    
    Alert.alert(
      'Delete Avatar',
      'Are you sure you want to delete your avatar?',
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
              setUploading(true);
              
              // Extract the file path from the URL
              const urlParts = url.split('/');
              const fileName = urlParts[urlParts.length - 1];
              
              // Delete from storage
              const { error } = await supabase.storage
                .from('avatars')
                .remove([fileName]);
              
              if (error) {
                throw error;
              }
              
              // Invalidate cache for this user since they deleted their image
              if (userId) {
                const cacheService = ImageCacheService.getInstance();
                await cacheService.invalidateUserCache(userId);
              }
              
              // Call the onDelete callback
              onDelete();
            } catch (error) {
              if (error instanceof Error) {
                Alert.alert('Error', error.message);
              }
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <ProfileImage
        avatarUrl={url}
        fullName=""
        size={size}
        showBorder={true}
        borderColor="#007AFF"
        style={styles.avatar}
        userId={userId}
      />
      <TouchableOpacity
        style={styles.cameraButton}
        onPress={uploadAvatar}
        disabled={uploading}
      >
        <Ionicons 
          name={uploading ? "hourglass" : "camera"} 
          size={28} 
          color="#fff" 
        />
      </TouchableOpacity>
      {url && onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={deleteAvatar}
          disabled={uploading}
        >
          <Ionicons 
            name="trash" 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatar: {
    maxWidth: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: '#FF4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
