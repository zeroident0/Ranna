import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Alert,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface AudioRecorderProps {
    onAudioRecorded: (uri: string, duration: number) => void;
    isRecording: boolean;
    onRecordingStart: () => void;
    onRecordingStop: () => void;
    compact?: boolean;
}

export default function AudioRecorder({
    onAudioRecorded,
    isRecording,
    onRecordingStart,
    onRecordingStop,
    compact = false,
}: AudioRecorderProps) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const durationInterval = useRef<NodeJS.Timeout | null>(null);

    // Cleanup function to properly dispose of recording
    const cleanupRecording = async () => {
        console.log('cleanupRecording called');
        
        if (recording) {
            try {
                const status = await recording.getStatusAsync();
                console.log('Recording status during cleanup:', status);
                if (status.isRecording) {
                    console.log('Stopping recording during cleanup');
                    await recording.stopAndUnloadAsync();
                }
            } catch (e) {
                console.log('Cleanup recording error:', e);
            }
        }
        
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }
        
        setRecordingDuration(0);
        setIsPreparing(false);
        setRecording(null);
        setIsPressed(false);
        console.log('cleanupRecording completed');
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupRecording();
        };
    }, []);

    // Cleanup when isRecording prop changes to false
    useEffect(() => {
        console.log('isRecording prop changed:', isRecording);
        if (!isRecording && recording) {
            console.log('isRecording became false, cleaning up recording');
            cleanupRecording();
        }
    }, [isRecording]);

    // Debug effect to monitor recording state
    useEffect(() => {
        console.log('Recording state changed:', {
            isRecording,
            isPreparing,
            hasRecording: !!recording,
            duration: recordingDuration,
            isPressed
        });
    }, [isRecording, isPreparing, recording, recordingDuration, isPressed]);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: 'Microphone Permission',
                    message: 'This app needs access to your microphone to record audio messages.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };

    const startRecording = async () => {
        console.log('startRecording called');
        console.log('Local recording state:', {
            isPreparing,
            recording: !!recording,
            isRecording
        });

        if (isPreparing || recording) {
            console.log('Local recording already in progress or preparing');
            return;
        }

        try {
            console.log('Setting isPreparing to true');
            setIsPreparing(true);

            // Request permissions using expo-av
            console.log('Requesting permissions...');
            const permission = await Audio.requestPermissionsAsync();
            if (!permission.granted) {
                console.log('Permission denied');
                Alert.alert('Permission required', 'Microphone permission is required to record audio.');
                setIsPreparing(false);
                return;
            }
            console.log('Permission granted');

            // Set audio mode for recording
            console.log('Setting audio mode...');
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            console.log('Audio mode set');

            // Create recording directly
            console.log('Creating recording directly...');
            const newRecording = new Audio.Recording();
            console.log('Preparing to record...');
            await newRecording.prepareToRecordAsync({
                android: {
                    extension: '.m4a',
                    outputFormat: 2, // MPEG_4
                    audioEncoder: 3, // AAC
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.m4a',
                    outputFormat: 1, // MPEG4AAC
                    audioQuality: 1, // HIGH
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {
                    mimeType: 'audio/webm',
                },
            });
            console.log('Recording prepared successfully');
            
            console.log('Starting recording...');
            await newRecording.startAsync();
            console.log('Recording started successfully');

            setRecording(newRecording);
            setRecordingDuration(0);
            setIsPreparing(false);
            console.log('Calling onRecordingStart...');
            onRecordingStart();

            durationInterval.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            console.log('Recording setup completed successfully');

        } catch (err) {
            console.error('Failed to start recording', err);
            setIsPreparing(false);
            Alert.alert('Error', 'Failed to start recording');
        }
    };

    const stopRecording = async () => {
        console.log('stopRecording called');
        if (!recording) {
            console.log('No recording to stop');
            return;
        }

        try {
            console.log('Clearing interval...');
            // Clear the interval first
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            console.log('Stopping and unloading recording...');
            await recording.stopAndUnloadAsync();
            const status = await recording.getStatusAsync();
            console.log('Recording status after stop:', status);

            // Get the URI from the recording object
            const uri = recording.getURI();
            console.log('Recording URI:', uri);

            if (status.isDoneRecording && uri) {
                console.log('Recording completed successfully, calling onAudioRecorded...');
                console.log('Audio URI:', uri);
                console.log('Duration:', recordingDuration);
                onAudioRecorded(uri, recordingDuration);
            } else {
                console.log('Recording not completed properly');
                console.log('Status:', status);
                console.log('URI:', uri);
                Alert.alert('Error', 'Recording failed to complete properly');
            }

            // Clean up the recording
            console.log('Cleaning up recording...');
            await cleanupRecording();
            console.log('Calling onRecordingStop...');
            onRecordingStop();

            // Reset audio mode
            console.log('Resetting audio mode...');
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            console.log('Recording stop completed successfully');

        } catch (err) {
            console.error('Failed to stop recording', err);
            await cleanupRecording();
            onRecordingStop();
            Alert.alert('Error', 'Failed to stop recording');
        }
    };

    const handlePressIn = async () => {
        console.log('Button pressed - starting recording');
        setIsPressed(true);
        await startRecording();
    };

    const handlePressOut = async () => {
        console.log('Button released - stopping recording');
        setIsPressed(false);
        if (recording) {
            await stopRecording();
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    compact ? styles.recordButtonCompact : styles.recordButton, 
                    (isRecording || isPreparing || isPressed) && styles.recordingButton
                ]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.7}
                disabled={isPreparing}
            >
                <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={compact ? 20 : 24}
                    color={(isRecording || isPreparing || isPressed) ? '#fff' : '#007AFF'}
                />
            </TouchableOpacity>

            {(isRecording || isPreparing) && !compact && (
                <View style={styles.durationContainer}>
                    <Text style={styles.durationText}>
                        {isPreparing ? 'Preparing...' : formatDuration(recordingDuration)}
                    </Text>
                    <View style={styles.recordingIndicator} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    recordButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    recordButtonCompact: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    recordingButton: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    durationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    durationText: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
    },
    recordingIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
        opacity: 0.8,
    },
});