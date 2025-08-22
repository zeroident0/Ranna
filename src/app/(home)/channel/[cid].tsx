import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { ActivityIndicator, Text, KeyboardAvoidingView, Platform, View } from "react-native";
import { Channel, MessageList, useChatContext } from "stream-chat-expo";
import type { Channel as ChannelType } from "stream-chat";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomMessageInput from "../../../components/CustomMessageInput";
import OfflineStatusBar from "../../../components/OfflineStatusBar";
import { globalRecordingManager } from "../../../utils/audioMessageHandler";
import { offlineMessageHandler } from "../../../utils/offlineMessageHandler";
import { networkOptimizer, memoryManager } from "../../../utils/performanceOptimizer";
import { usePerformanceMonitor, useOperationTimer } from "../../../utils/usePerformanceMonitor";

// Memoized components to prevent unnecessary re-renders
const MemoizedMessageList = memo(MessageList);
const MemoizedCustomMessageInput = memo(CustomMessageInput);
const MemoizedOfflineStatusBar = memo(OfflineStatusBar);

export default function ChannelScreen() {
    const [channel, setChannel] = useState<ChannelType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { cid } = useLocalSearchParams<{ cid: string }>();

    const { client } = useChatContext();

    // Performance monitoring
    usePerformanceMonitor({
        componentName: 'ChannelScreen',
        threshold: 16, // 60fps target
        onMetrics: (metrics) => {
            if (__DEV__ && metrics.renderTime > 16) {
                console.warn('ChannelScreen render time exceeded 16ms:', metrics.renderTime);
            }
        }
    });

    const { startTimer, endTimer } = useOperationTimer('Channel Fetch');

    // Memoize the channel fetching function to prevent recreation on every render
    const fetchChannel = useCallback(async () => {
        if (!cid || !client) return;
        
        try {
            setIsLoading(true);
            startTimer();
            
            // Use retry logic for better reliability
            const res = await networkOptimizer.retryWithBackoff(
                () => client.queryChannels({ cid }),
                3, // max retries
                1000 // base delay
            );
            
            endTimer();
            
            if (res.length > 0) {
                setChannel(res[0]);
            }
        } catch (error) {
            endTimer();
            console.error('Error fetching channel:', error);
        } finally {
            setIsLoading(false);
        }
    }, [cid, client, startTimer, endTimer]);

    // Fetch channel only when cid or client changes
    useEffect(() => {
        fetchChannel();
    }, [fetchChannel]);

    // Memoize the sync handler to prevent recreation
    const handleSyncPress = useCallback(async () => {
        try {
            await offlineMessageHandler.syncOfflineMessages();
        } catch (error) {
            console.error('Error syncing offline messages:', error);
        }
    }, []);

    // Cleanup recording when component unmounts
    useEffect(() => {
        // Add cleanup task to memory manager
        const cleanupTask = () => {
            globalRecordingManager.cleanupCurrentRecording();
        };
        
        memoryManager.addCleanupTask(cleanupTask);
        
        return () => {
            // Clean up any active recording when leaving the channel
            cleanupTask();
        };
    }, []);

    // Memoize the loading component
    const loadingComponent = useMemo(() => (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0000ff" />
        </View>
    ), []);

    // Memoize the main content to prevent re-renders
    const channelContent = useMemo(() => {
        if (!channel) return null;
        
        return (
            <Channel 
            channel={channel}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <MemoizedOfflineStatusBar onSyncPress={handleSyncPress} />
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <MemoizedMessageList />
                        <MemoizedCustomMessageInput />
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Channel>
        );
    }, [channel, handleSyncPress]);

    if (isLoading) {
        return loadingComponent;
    }

    return channelContent;
}
