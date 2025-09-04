import {
  StreamVideoClient,
  StreamVideo,
} from '@stream-io/video-react-native-sdk';
import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { tokenProvider } from '../utils/tokenProvider';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY;

export default function VideoProvider({ children }: PropsWithChildren) {
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(
    null
  );
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) {
      console.log('📹 VideoProvider: No profile available, waiting...');
      return;
    }

    console.log('📹 VideoProvider: Profile available, initializing video client for user:', profile.id);
    const initVideoClient = async () => {
      try {
        console.log('📹 VideoProvider: Profile data:', { 
          id: profile.id, 
          name: profile.full_name, 
          avatar_url: profile.avatar_url 
        });
        
        // Handle null avatar_url
        let imageUrl = null;
        if (profile.avatar_url) {
          try {
            imageUrl = supabase.storage
              .from('avatars')
              .getPublicUrl(profile.avatar_url).data.publicUrl;
            console.log('📹 VideoProvider: Generated image URL:', imageUrl);
          } catch (urlError) {
            console.log('📹 VideoProvider: Error generating image URL:', urlError);
            imageUrl = null;
          }
        } else {
          console.log('📹 VideoProvider: No avatar_url in profile, using null');
        }
        
        const user = {
          id: profile.id,
          name: profile.full_name || profile.username || 'User',
          image: imageUrl,
        };
        
        console.log('📹 VideoProvider: Creating StreamVideoClient...');
        const client = new StreamVideoClient({ apiKey, user, tokenProvider });
        console.log('📹 VideoProvider: StreamVideoClient created successfully');
        setVideoClient(client);
      } catch (error) {
        console.log('📹 VideoProvider: Error creating video client:', error);
        // Set a dummy client to prevent infinite loading
        setVideoClient(null);
      }
    };

    initVideoClient();

    return () => {
      console.log('📹 VideoProvider: Cleaning up video client');
      if (videoClient) {
        videoClient.disconnectUser();
      }
    };
  }, [profile?.id]);

  if (!videoClient) {
    console.log('📹 VideoProvider: No video client, showing loading or fallback');
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10 }}>Initializing Video...</Text>
      </View>
    );
  }

  return <StreamVideo client={videoClient}>{children}</StreamVideo>;
}
