import React from "react";
import { Link, Stack, router } from "expo-router";
import { ChannelList } from "stream-chat-expo";
import { useAuth } from "../../../providers/AuthProvider";
import Octicons from '@expo/vector-icons/Octicons';
import { Image, View, TouchableOpacity, StyleSheet } from "react-native";
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
        <View style={styles.container}>
            <ChannelList
                filters={{ members: { $in: [user.id] } }}
                onSelect={(channel) => router.push(`/channel/${channel.cid}`)}
            />

            {/* WhatsApp-style floating action button for new chat */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/(home)/users')}
                activeOpacity={0.8}
            >
                <Octicons name="person-add" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#25D366', // WhatsApp green color
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
});