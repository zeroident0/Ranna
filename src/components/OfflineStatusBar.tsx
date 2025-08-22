import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { offlineMessageHandler } from '../utils/offlineMessageHandler';
import { useNetwork } from '../providers/NetworkProvider';

interface OfflineStatusBarProps {
    onSyncPress?: () => void;
}

function OfflineStatusBar({ onSyncPress }: OfflineStatusBarProps) {
    const { isOnline } = useNetwork(); // Use shared network context
    const [pendingMessageCount, setPendingMessageCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    // Update visibility based on network status
    useEffect(() => {
        setIsVisible(!isOnline);
    }, [isOnline]);

    // Memoize the update pending count function
    const updatePendingCount = useCallback(async () => {
        try {
            const count = await offlineMessageHandler.getOfflineMessageCount();
            setPendingMessageCount(count);
        } catch (error) {
            console.error('Error updating pending count:', error);
        }
    }, []);

    useEffect(() => {
        // Update count initially
        updatePendingCount();

        // Only poll when offline and reduce frequency to 10 seconds
        let interval: NodeJS.Timeout | null = null;
        if (!isOnline) {
            interval = setInterval(updatePendingCount, 10000); // Changed from 5000 to 10000
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isOnline, updatePendingCount]);

    // Memoize the sync handler
    const handleSyncPress = useCallback(async () => {
        if (onSyncPress) {
            onSyncPress();
        } else {
            // Default sync behavior
            await offlineMessageHandler.syncOfflineMessages();
        }
    }, [onSyncPress]);

    // Memoize the status indicator
    const statusIndicator = useMemo(() => (
        <View style={styles.statusIndicator}>
            <View style={[styles.dot, { backgroundColor: '#ff6b6b' }]} />
            <Text style={styles.statusText}>You're offline</Text>
        </View>
    ), []);

    // Memoize the message info section
    const messageInfo = useMemo(() => {
        if (pendingMessageCount <= 0) return null;
        
        return (
            <View style={styles.messageInfo}>
                <Text style={styles.messageText}>
                    {pendingMessageCount} message{pendingMessageCount !== 1 ? 's' : ''} pending
                </Text>
                <TouchableOpacity 
                    style={styles.syncButton}
                    onPress={handleSyncPress}
                >
                    <Text style={styles.syncButtonText}>Sync</Text>
                </TouchableOpacity>
            </View>
        );
    }, [pendingMessageCount, handleSyncPress]);

    // Memoize the main content
    const content = useMemo(() => (
        <View style={styles.content}>
            {statusIndicator}
            {messageInfo}
        </View>
    ), [statusIndicator, messageInfo]);

    if (!isVisible) {
        return null;
    }

    return (
        <View style={styles.container}>
            {content}
        </View>
    );
}

// Export as memoized component to prevent unnecessary re-renders from parent
export default memo(OfflineStatusBar);

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff3cd',
        borderBottomWidth: 1,
        borderBottomColor: '#ffeaa7',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        color: '#856404',
        fontWeight: '500',
    },
    messageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    messageText: {
        fontSize: 12,
        color: '#856404',
        marginRight: 8,
    },
    syncButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
    },
    syncButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
    },
});
