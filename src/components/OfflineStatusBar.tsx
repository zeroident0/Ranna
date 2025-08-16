import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { offlineMessageHandler } from '../utils/offlineMessageHandler';

interface OfflineStatusBarProps {
    onSyncPress?: () => void;
}

export default function OfflineStatusBar({ onSyncPress }: OfflineStatusBarProps) {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingMessageCount, setPendingMessageCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected && state.isInternetReachable;
            setIsOnline(online);
            setIsVisible(!online);
        });

        // Check initial network status
        NetInfo.fetch().then(state => {
            const online = state.isConnected && state.isInternetReachable;
            setIsOnline(online);
            setIsVisible(!online);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const updatePendingCount = async () => {
            const count = await offlineMessageHandler.getOfflineMessageCount();
            setPendingMessageCount(count);
        };

        // Update count initially
        updatePendingCount();

        // Update count every 5 seconds when offline
        const interval = setInterval(() => {
            if (!isOnline) {
                updatePendingCount();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [isOnline]);

    const handleSyncPress = async () => {
        if (onSyncPress) {
            onSyncPress();
        } else {
            // Default sync behavior
            await offlineMessageHandler.syncOfflineMessages();
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.statusIndicator}>
                    <View style={[styles.dot, { backgroundColor: '#ff6b6b' }]} />
                    <Text style={styles.statusText}>You're offline</Text>
                </View>
                
                {pendingMessageCount > 0 && (
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
                )}
            </View>
        </View>
    );
}

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
