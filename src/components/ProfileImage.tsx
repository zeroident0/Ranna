import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { supabase } from '../lib/supabase';

interface ProfileImageProps {
  avatarUrl?: string | null;
  fullName?: string;
  size?: number;
  style?: ViewStyle;
  showBorder?: boolean;
  borderColor?: string;
}

export default function ProfileImage({
  avatarUrl,
  fullName = '',
  size = 48,
  style,
  showBorder = false,
  borderColor = '#007AFF'
}: ProfileImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const avatarSize = { height: size, width: size };
  const borderRadius = size / 2;

  useEffect(() => {
    if (avatarUrl) {
      downloadImage(avatarUrl);
    } else {
      setImageUrl(null);
      setError(false);
      setLoading(false);
    }
    setHasInitialized(true);
  }, [avatarUrl]);

  async function downloadImage(path: string) {
    try {
      setLoading(true);
      setError(false);

      const { data, error } = await supabase.storage
        .from('avatars')
        .download(path);

      if (error) {
        throw error;
      }

      const fr = new FileReader();
      fr.readAsDataURL(data);
      fr.onload = () => {
        setImageUrl(fr.result as string);
        setLoading(false);
      };
    } catch (error) {
      console.log('Error downloading image: ', error);
      setError(true);
      setLoading(false);
    }
  }

  const getInitials = () => {
    if (!fullName) return '?';
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const getBackgroundColor = () => {
    if (!fullName) return '#6B7280';
    
    // Generate a consistent color based on the name
    const colors = [
      '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
      '#FF2D92', '#5AC8FA', '#FFCC00', '#FF6B6B', '#4ECDC4',
      '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'
    ];
    
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Don't render anything until we've initialized to prevent flashing
  if (!hasInitialized) {
    return (
      <View
        style={[
          avatarSize,
          styles.container,
          {
            borderRadius,
            backgroundColor: '#e0e0e0',
            borderWidth: showBorder ? 2 : 0,
            borderColor: showBorder ? borderColor : 'transparent',
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        avatarSize,
        styles.container,
        {
          borderRadius,
          backgroundColor: getBackgroundColor(),
          borderWidth: showBorder ? 2 : 0,
          borderColor: showBorder ? borderColor : 'transparent',
        },
        style,
      ]}
    >
      {imageUrl && !error && !loading ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            avatarSize,
            styles.image,
            { borderRadius }
          ]}
          onError={() => setError(true)}
        />
      ) : (
        <View style={[avatarSize, styles.placeholder, { borderRadius }]}>
          <Text style={[styles.placeholderText, { fontSize: size * 0.4 }]}>
            {getInitials()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
});
