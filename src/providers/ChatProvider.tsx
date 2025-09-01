import { PropsWithChildren } from "react";
import { StreamChat } from 'stream-chat';
import { useEffect, useState, useRef } from 'react';
import { Chat, OverlayProvider } from 'stream-chat-expo';
import { ActivityIndicator } from "react-native";
import { useAuth } from "./AuthProvider";
import { supabase } from "../lib/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { offlineMessageHandler } from '../utils/offlineMessageHandler';
import { tokenProvider } from "../utils/tokenProvider";

// Configure StreamChat client with offline support
const client = StreamChat.getInstance(process.env.EXPO_PUBLIC_STREAM_API_KEY);

export default function ChatProvider({ children }: PropsWithChildren) {
    const [isReady, setIsReady] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const { profile } = useAuth();
    const currentUserId = useRef<string | null>(null);

    // Set the client in the offline message handler
    useEffect(() => {
        offlineMessageHandler.setClient(client);
    }, []);

    // Monitor network connectivity
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const wasOnline = isOnline;
            const nowOnline = state.isConnected && state.isInternetReachable;
            
            setIsOnline(nowOnline);
            
            if (wasOnline && !nowOnline) {
                console.log('Network disconnected - entering offline mode');
            } else if (!wasOnline && nowOnline) {
                console.log('Network reconnected - syncing offline data');
                // Trigger sync when coming back online
                if (client.userID) {
                    // StreamChat automatically handles reconnection and sync
                    console.log('Client will automatically sync when reconnected');
                }
            }
        });

        return () => unsubscribe();
    }, [isOnline]);

    useEffect(() => {
        if (!profile) return;

        const connect = async () => {
            const token = await tokenProvider();
            console.log('Token:', token);


            try {
                // Check if already connected to the same user
                if (client.userID === profile.id && isReady) {
                    console.log('Already connected to user:', profile.id);
                    return; // Already connected to this user
                }

                // Disconnect current user if different from new user
                if (currentUserId.current && currentUserId.current !== profile.id) {
                    console.log('Disconnecting from user:', currentUserId.current);
                    await client.disconnectUser();
                    setIsReady(false);
                }

                // Only connect if not already connected to this user
                if (currentUserId.current !== profile.id) {
                    console.log('Connecting to user:', profile.id);
                    await client.connectUser(
                        {
                            id: profile.id,
                            name: profile.full_name,
                            image: profile.avatar_url
                                ? supabase.storage
                                    .from('avatars')
                                    .getPublicUrl(profile.avatar_url).data.publicUrl
                                : undefined,
                        },
                        tokenProvider
                    );
                    currentUserId.current = profile.id;
                    setIsReady(true);
                    console.log('Successfully connected to user:', profile.id);
                }
            } catch (error) {
                console.error('Error connecting user:', error);
                setIsReady(false);
            }
        };

        connect();

        return () => {
            // Cleanup function
            if (isReady && currentUserId.current) {
                console.log('Cleanup: Disconnecting user:', currentUserId.current);
                client.disconnectUser().catch(console.error);
                currentUserId.current = null;
                setIsReady(false);
            }
        }

    }, [profile?.id, profile?.full_name, profile?.avatar_url]);

    if (!isReady) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <OverlayProvider>
            <Chat client={client}>
                {children}
            </Chat>
        </OverlayProvider>
    );
}