import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { StreamChat } from 'stream-chat';
import { Chat, OverlayProvider } from 'stream-chat-expo';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { tokenProvider } from '../utils/tokenProvider';

const client = StreamChat.getInstance(process.env.EXPO_PUBLIC_STREAM_API_KEY);

export default function ChatProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) {
      console.log('💬 ChatProvider: No profile available, waiting...');
      return;
    }
    
    console.log('💬 ChatProvider: Profile available, connecting user:', profile.id);
    tokenProvider().then((token) => {
      console.log('💬 ChatProvider: Token received:', token ? 'Token valid' : 'No token');
    });
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('💬 ChatProvider: Connection timeout, setting ready to prevent infinite loading');
      setIsReady(true);
    }, 10000); // 10 second timeout
    
    const connect = async () => {
      try {
        console.log('💬 ChatProvider: Attempting to connect user...');
        console.log('💬 ChatProvider: Profile data:', { 
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
            console.log('💬 ChatProvider: Generated image URL:', imageUrl);
          } catch (urlError) {
            console.log('💬 ChatProvider: Error generating image URL:', urlError);
            imageUrl = null;
          }
        } else {
          console.log('💬 ChatProvider: No avatar_url in profile, using null');
        }
        
        await client.connectUser(
          {
            id: profile.id,
            name: profile.full_name || profile.username || 'User',
            image: imageUrl,
          },
          tokenProvider
        );
        console.log('💬 ChatProvider: User connected successfully');
        clearTimeout(timeoutId); // Clear timeout on success
        setIsReady(true);
      } catch (error) {
        console.log('💬 ChatProvider: Error connecting user:', error);
        clearTimeout(timeoutId); // Clear timeout on error
        // Set ready even if there's an error to prevent infinite loading
        setIsReady(true);
      }
    };

    connect();

    return () => {
      console.log('💬 ChatProvider: Cleaning up connection');
      clearTimeout(timeoutId);
      if (isReady) {
        client.disconnectUser();
      }
      setIsReady(false);
    };
  }, [profile?.id]);

  if (!isReady) {
    return <ActivityIndicator />;
  }

  return (
    <OverlayProvider>
      <Chat client={client}>{children}</Chat>
    </OverlayProvider>
  );
}
