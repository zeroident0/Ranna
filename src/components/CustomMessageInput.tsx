import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useChatContext, useChannelContext } from 'stream-chat-expo';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AudioRecorder from './AudioRecorder';
import { createAudioMessage, getFileSize, AudioFile } from '../utils/audioMessageHandler';
import { offlineMessageHandler } from '../utils/offlineMessageHandler';
import { useNetwork } from '../providers/NetworkProvider';

// Memoized AudioRecorder to prevent unnecessary re-renders
const MemoizedAudioRecorder = memo(AudioRecorder);

function CustomMessageInput() {
    const [isRecording, setIsRecording] = useState(false);
    const [textValue, setTextValue] = useState('');
    const { isOnline } = useNetwork(); // Use shared network context
    const { client } = useChatContext();
    const { channel } = useChannelContext();
    const inputRef = useRef<TextInput>(null);

    // Memoize the audio recording handler to prevent recreation
    const handleAudioRecorded = useCallback(async (uri: string, duration: number) => {
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
    }, [isOnline, client, channel]);

    // Memoize recording handlers
    const handleRecordingStart = useCallback(() => {
        console.log('Recording started');
        setIsRecording(true);
    }, []);

    const handleRecordingStop = useCallback(() => {
        console.log('Recording stopped');
        setIsRecording(false);
    }, []);

    // Handle sending text message
    const handleSendMessage = useCallback(async () => {
        if (!textValue.trim()) return;

        const messageText = textValue.trim();
        setTextValue(''); // Clear input

        if (isOnline) {
            // Send message immediately if online
            try {
                await channel.sendMessage({
                    text: messageText,
                });
            } catch (error) {
                console.error('Error sending message:', error);
                Alert.alert('Error', 'Failed to send message');
            }
        } else {
            // Queue message for offline delivery
            try {
                await offlineMessageHandler.queueMessage(client, channel.cid, {
                    text: messageText,
                });
                Alert.alert(
                    'Message Queued', 
                    'Message will be sent when you\'re back online.',
                    [{ text: 'OK' }]
                );
            } catch (error) {
                console.error('Error queuing message:', error);
                Alert.alert('Error', 'Failed to queue message for offline delivery');
            }
        }
    }, [textValue, isOnline, channel, client]);

    // Handle text input changes
    const handleTextChange = useCallback((text: string) => {
        setTextValue(text);
    }, []);

    // Handle attachment selection
    const handleAttachmentPress = useCallback(async () => {
        Alert.alert(
            'Select Attachment',
            'Choose the type of file you want to attach',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Image',
                    onPress: () => pickImage(),
                },
                {
                    text: 'Document',
                    onPress: () => pickDocument(),
                },
            ]
        );
    }, []);

    // Pick image from gallery or camera
    const pickImage = useCallback(async () => {
        try {
            // Request permissions first
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant permission to access your photo library');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                await sendAttachment({
                    uri: asset.uri,
                    type: 'image',
                    name: `image_${Date.now()}.jpg`,
                    size: asset.fileSize || 0,
                });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    }, []);

    // Pick document
    const pickDocument = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                await sendAttachment({
                    uri: asset.uri,
                    type: 'file',
                    name: asset.name,
                    size: asset.size || 0,
                });
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    }, []);

    // Send attachment
    const sendAttachment = useCallback(async (file: {
        uri: string;
        type: 'image' | 'file';
        name: string;
        size: number;
    }) => {
        try {
            console.log('=== Sending attachment ===');
            console.log('File type:', file.type);
            console.log('File URI:', file.uri);
            console.log('File name:', file.name);
            console.log('File size:', file.size);
            console.log('Is online:', isOnline);

            if (isOnline) {
                // For images, use Stream Chat's image upload
                if (file.type === 'image') {
                    console.log('Attempting to send image...');
                    try {
                        // Use sendMessage with proper image attachment format
                        const response = await channel.sendMessage({
                            text: `📷 ${file.name}`,
                            attachments: [
                                {
                                    type: 'image',
                                    image_url: file.uri,
                                    title: file.name,
                                    file_size: file.size,
                                }
                            ],
                        });
                        console.log('Image sent successfully:', response);
                    } catch (imageError) {
                        console.error('Image send error:', imageError);
                        Alert.alert('Error', 'Failed to send image');
                    }
                } else {
                    console.log('Attempting to send file...');
                    try {
                        // Use sendMessage with proper file attachment format
                        const response = await channel.sendMessage({
                            text: `📎 ${file.name}`,
                            attachments: [
                                {
                                    type: 'file',
                                    asset_url: file.uri,
                                    title: file.name,
                                    file_size: file.size,
                                }
                            ],
                        });
                        console.log('File sent successfully:', response);
                    } catch (fileError) {
                        console.error('File send error:', fileError);
                        Alert.alert('Error', 'Failed to send file');
                    }
                }
            } else {
                // Queue attachment for offline delivery
                await offlineMessageHandler.queueMessage(client, channel.cid, {
                    text: `📎 ${file.name} (will be sent when online)`,
                    attachments: [
                        {
                            type: file.type,
                            asset_url: file.uri,
                            title: file.name,
                            file_size: file.size,
                        }
                    ],
                });
                Alert.alert(
                    'Attachment Queued', 
                    'File will be sent when you\'re back online.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error sending attachment:', error);
            Alert.alert('Error', 'Failed to send attachment');
        }
    }, [isOnline, channel, client]);

    // Memoize the action button (audio recorder or send button)
    const actionButton = useMemo(() => {
        const hasText = textValue && textValue.trim().length > 0;

        if (!hasText) {
            // Show audio recorder button when no text
            return (
                <MemoizedAudioRecorder
                    onAudioRecorded={handleAudioRecorded}
                    isRecording={isRecording}
                    onRecordingStart={handleRecordingStart}
                    onRecordingStop={handleRecordingStop}
                    compact={true}
                />
            );
        } else {
            // Show send button when there's text
            return (
                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendMessage}
                    activeOpacity={0.7}
                >
                    <Ionicons name="send" size={24} color="#007AFF" />
                </TouchableOpacity>
            );
        }
    }, [textValue, isRecording, handleAudioRecorded, handleRecordingStart, handleRecordingStop, handleSendMessage]);

    // Memoize the offline indicator
    const offlineIndicator = useMemo(() => {
        if (isOnline) return null;
        
        return (
            <View style={styles.offlineIndicator}>
                <View style={styles.offlineDot} />
            </View>
        );
    }, [isOnline]);

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={handleAttachmentPress}
                    activeOpacity={0.7}
                >
                    <Ionicons name="attach" size={20} color="#666" />
                </TouchableOpacity>
                <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    value={textValue}
                    onChangeText={handleTextChange}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                    multiline
                    maxLength={1000}
                    textAlignVertical="center"
                />
                <View style={styles.actionButtonContainer}>
                    {actionButton}
                </View>
            </View>
            {offlineIndicator}
        </View>
    );
}

// Export as memoized component to prevent unnecessary re-renders from parent
export default memo(CustomMessageInput);

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    attachmentButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        maxHeight: 100,
        minHeight: 40,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        textAlignVertical: 'center',
    },
    actionButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 52,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    offlineIndicator: {
        position: 'absolute',
        top: -8,
        right: 8,
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