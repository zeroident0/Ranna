import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { MessageInput, useChatContext, useChannelContext } from 'stream-chat-expo';
import AudioRecorder from './AudioRecorder';
import { createAudioMessage, getFileSize, AudioFile } from '../utils/audioMessageHandler';
import { offlineMessageHandler } from '../utils/offlineMessageHandler';
import NetInfo from '@react-native-community/netinfo';

export default function CustomMessageInput() {
    const [isRecording, setIsRecording] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const { client } = useChatContext();
    const { channel } = useChannelContext();

    // Monitor network status
    React.useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected && state.isInternetReachable);
        });

        return () => unsubscribe();
    }, []);

    const handleAudioRecorded = async (uri: string, duration: number) => {
        console.log('=== handleAudioRecorded called ===');
        console.log('URI:', uri);
        console.log('Duration:', duration);
        console.log('Network status:', isOnline ? 'Online' : 'Offline');
        
        try {
            // Get the file size
            console.log('Getting file size...');
            const fileSize = await getFileSize(uri);
            console.log('File size:', fileSize);

            // Create a file attachment for the audio
            const audioFile: AudioFile = {
                uri,
                type: 'audio/m4a',
                name: `audio_message_${Date.now()}.m4a`,
                size: fileSize,
            };
            console.log('Audio file object:', audioFile);

            if (isOnline) {
                // Send the audio message immediately if online
                console.log('Sending audio message online...');
                const result = await createAudioMessage(client, channel, audioFile, duration);
                console.log('Audio message sent successfully:', result);
            } else {
                // Queue the message for offline delivery
                console.log('Queueing audio message for offline delivery...');
                await offlineMessageHandler.queueMessage(client, channel.cid, {
                    text: `🎵 Audio message (${Math.floor(duration)}s)`,
                    attachments: [
                        {
                            type: 'audio',
                            asset_url: audioFile.uri,
                            duration: duration,
                            mime_type: audioFile.type,
                        }
                    ],
                });
                Alert.alert(
                    'Message Queued', 
                    'Audio message will be sent when you\'re back online.',
                    [{ text: 'OK' }]
                );
            }

        } catch (error) {
            console.error('=== Error in handleAudioRecorded ===');
            console.error('Error details:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            if (isOnline) {
                Alert.alert('Error', `Failed to send audio message: ${error.message}`);
            } else {
                Alert.alert('Error', 'Failed to queue audio message for offline delivery.');
            }
        }
    };

    const handleRecordingStart = useCallback(() => {
        console.log('Recording started');
        setIsRecording(true);
    }, []);

    const handleRecordingStop = useCallback(() => {
        console.log('Recording stopped');
        setIsRecording(false);
    }, []);

    const renderInputButtons = useCallback(() => {
        return (
            <View style={styles.inputButtons}>
                {/* AudioRecorder is now rendered outside of this function */}
            </View>
        );
    }, []);

    return (
        <View style={styles.container}>
            <MessageInput InputButtons={renderInputButtons} />
            <View style={styles.audioRecorderContainer}>
                <AudioRecorder
                    onAudioRecorded={handleAudioRecorded}
                    isRecording={isRecording}
                    onRecordingStart={handleRecordingStart}
                    onRecordingStop={handleRecordingStop}
                />
                {!isOnline && (
                    <View style={styles.offlineIndicator}>
                        <View style={styles.offlineDot} />
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {

    },
  
    inputButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    audioRecorderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 1,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
    },
    offlineIndicator: {
        marginLeft: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff6b6b',
    },
}); 