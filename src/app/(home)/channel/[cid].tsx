import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, KeyboardAvoidingView, Platform, View } from "react-native";
import { Channel, MessageList, useChatContext } from "stream-chat-expo";
import type { Channel as ChannelType } from "stream-chat";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomMessageInput from "../../../components/CustomMessageInput";
import OfflineStatusBar from "../../../components/OfflineStatusBar";
import { globalRecordingManager } from "../../../utils/audioMessageHandler";
import { offlineMessageHandler } from "../../../utils/offlineMessageHandler";

export default function ChannelScreen() {
    const [channel, setChannel] = useState<ChannelType | null>(null);
    const { cid } = useLocalSearchParams<{ cid: string }>();

    const { client } = useChatContext();

    useEffect(() => {
        const fetchChannel = async () => {
            if (!cid) return;
            const res = await client.queryChannels({ cid });
            if (res.length > 0) {
                setChannel(res[0]);
            }
        };
        fetchChannel();
    }, [cid, client]);

    // Cleanup recording when component unmounts
    useEffect(() => {
        return () => {
            // Clean up any active recording when leaving the channel
            globalRecordingManager.cleanupCurrentRecording();
        };
    }, []);

    const handleSyncPress = async () => {
        try {
            await offlineMessageHandler.syncOfflineMessages();
        } catch (error) {
            console.error('Error syncing offline messages:', error);
        }
    };

    if (!channel) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <Channel channel={channel}>
            <SafeAreaView style={{ flex: 1 }}>
                <OfflineStatusBar onSyncPress={handleSyncPress} />
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <MessageList />
                    <CustomMessageInput />
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Channel>
    );
}
