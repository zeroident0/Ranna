import React from "react";
import { Link, Stack, router } from "expo-router";
import { ChannelList } from "stream-chat-expo";
import { useAuth } from "../../../providers/AuthProvider";
import Octicons from '@expo/vector-icons/Octicons';
import { Image, View, TouchableOpacity } from "react-native";
import { supabase } from "../../../lib/supabase";

export default function MainTabScreen() {
    const { user, profile } = useAuth();

    // Don't render if user is not available
    if (!user) {
        return null;
    }

    // Get the public URL for the user's avatar
    const avatarUrl = profile?.avatar_url
        ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
        : null;

    return (
        <>
            <Stack.Screen options={{
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.push('/(home)/(tabs)/profile')}
                        style={{ marginHorizontal: 15 }}
                    >
                        {avatarUrl ? (
                            <Image
                                source={{ uri: avatarUrl }}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                }}
                            />
                        ) : (
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#ddd',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Octicons name="person" size={20} color="#666" />
                            </View>
                        )}
                    </TouchableOpacity>
                ),
                headerRight: () =>
                    <Link href="/(home)/users" asChild>
                        <Octicons
                            name="person-add"
                            size={22} color="gray"
                            style={{ marginHorizontal: 15 }}
                        />
                    </Link>

            }} />

            <ChannelList
                filters={{ members: { $in: [user.id] } }}
                onSelect={(channel) => router.push(`/channel/${channel.cid}`)}
            />
        </>
    );
}