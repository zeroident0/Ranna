import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { StreamChat } from 'stream-chat';
import { Chat, OverlayProvider } from 'stream-chat-expo';
import { useAuth } from './AuthProvider';
import { useNetwork } from './NetworkProvider';
import { supabase } from '../lib/supabase';
import { tokenProvider } from '../utils/tokenProvider';

const client = StreamChat.getInstance(process.env.EXPO_PUBLIC_STREAM_API_KEY);

export default function ChatProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { profile, loading } = useAuth();
  const { isOnline } = useNetwork();

  useEffect(() => {
    if (loading) {
      console.log('💬 ChatProvider: Auth still loading, waiting...');
      setIsReady(false);
      setConnectionError(null);
      return;
    }
    
    if (!profile) {
      console.log('💬 ChatProvider: No profile available, disconnecting and waiting...');
      // Disconnect user when no profile (logout)
      client.disconnectUser();
      setIsReady(false);
      setConnectionError(null);
      return;
    }

    // Don't attempt connection if offline
    if (!isOnline) {
      console.log('💬 ChatProvider: Device is offline, waiting for network...');
      setConnectionError('No internet connection');
      setIsReady(false);
      return;
    }
    
    console.log('💬 ChatProvider: Profile available, connecting user:', profile.id);
    setConnectionError(null);
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('💬 ChatProvider: Connection timeout, setting ready to prevent infinite loading');
      setConnectionError('Connection timeout');
      setIsReady(true);
    }, 15000); // 15 second timeout
    
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
        setConnectionError(null);
        setRetryCount(0);
      } catch (error) {
        console.log('💬 ChatProvider: Error connecting user:', error);
        clearTimeout(timeoutId); // Clear timeout on error
        
        // Handle specific error types
        let errorMessage = 'Failed to connect to chat service';
        if (error instanceof Error) {
          if (error.message.includes('Network Error') || error.message.includes('AxiosError')) {
            errorMessage = 'Network connection failed. Please check your internet connection.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'Connection timeout. Please try again.';
          } else {
            errorMessage = error.message;
          }
        }
        
        setConnectionError(errorMessage);
        
        // Retry logic for network errors
        if (retryCount < 3 && (errorMessage.includes('Network') || errorMessage.includes('timeout'))) {
          console.log(`💬 ChatProvider: Retrying connection (attempt ${retryCount + 1}/3)...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            connect();
          }, 2000 * (retryCount + 1)); // Exponential backoff
        } else {
          // Set ready even if there's an error to prevent infinite loading
          console.log('💬 ChatProvider: Setting ready despite connection error to allow app to function');
          setIsReady(true);
        }
      }
    };

    connect();

    return () => {
      console.log('💬 ChatProvider: Cleaning up connection');
      clearTimeout(timeoutId);
      client.disconnectUser();
      setIsReady(false);
    };
  }, [profile?.id, loading, isOnline, retryCount]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" color="#007AFF" />
        {connectionError && (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#FF3B30', textAlign: 'center', marginBottom: 8 }}>
              {connectionError}
            </Text>
            {retryCount > 0 && (
              <Text style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>
                Retrying... ({retryCount}/3)
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <OverlayProvider>
      <Chat client={client}>{children}</Chat>
    </OverlayProvider>
  );
}
