import { StreamChat } from 'stream-chat';
import { Audio } from 'expo-av';

export interface AudioFile {
    uri: string;
    type: string;
    name: string;
    size: number;
}

// Global recording manager to ensure only one recording object exists
class GlobalRecordingManager {
    private static instance: GlobalRecordingManager;
    private currentRecording: Audio.Recording | null = null;
    private isPreparing: boolean = false;
    private debugLogs: string[] = [];

    static getInstance(): GlobalRecordingManager {
        if (!GlobalRecordingManager.instance) {
            GlobalRecordingManager.instance = new GlobalRecordingManager();
        }
        return GlobalRecordingManager.instance;
    }

    private log(message: string) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] GlobalRecordingManager: ${message}`;
        console.log(logMessage);
        this.debugLogs.push(logMessage);
        
        // Keep only last 10 logs
        if (this.debugLogs.length > 10) {
            this.debugLogs.shift();
        }
    }

    async cleanupCurrentRecording(): Promise<void> {
        this.log('cleanupCurrentRecording called');
        
        if (this.currentRecording) {
            try {
                const status = await this.currentRecording.getStatusAsync();
                this.log(`Recording status: ${JSON.stringify(status)}`);
                
                if (status.isRecording) {
                    this.log('Stopping and unloading recording');
                    await this.currentRecording.stopAndUnloadAsync();
                }
            } catch (e) {
                this.log(`Cleanup recording error: ${e}`);
            }
            this.currentRecording = null;
        }
        this.isPreparing = false;
        this.log('cleanupCurrentRecording completed');
    }

    async prepareNewRecording(): Promise<Audio.Recording> {
        this.log('prepareNewRecording called');
        
        // Clean up any existing recording first
        await this.cleanupCurrentRecording();
        
        this.isPreparing = true;
        this.log('Setting isPreparing to true');
        
        try {
            this.log('Creating new Audio.Recording instance');
            const newRecording = new Audio.Recording();
            
            this.log('Preparing to record');
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
            
            this.currentRecording = newRecording;
            this.isPreparing = false;
            this.log('prepareNewRecording completed successfully');
            return newRecording;
        } catch (error) {
            this.log(`prepareNewRecording error: ${error}`);
            this.isPreparing = false;
            throw error;
        }
    }

    getCurrentRecording(): Audio.Recording | null {
        return this.currentRecording;
    }

    isCurrentlyPreparing(): boolean {
        return this.isPreparing;
    }

    hasActiveRecording(): boolean {
        return this.currentRecording !== null;
    }

    getDebugLogs(): string[] {
        return [...this.debugLogs];
    }

    reset(): void {
        this.log('reset called');
        this.currentRecording = null;
        this.isPreparing = false;
        this.debugLogs = [];
    }
}

export const globalRecordingManager = GlobalRecordingManager.getInstance();

export const createAudioMessage = async (
    client: StreamChat,
    channel: any,
    audioFile: AudioFile,
    duration: number
) => {
    try {
        console.log('createAudioMessage called with:', { audioFile, duration });
        
        // Create a file object that Stream Chat can handle
        const file = {
            uri: audioFile.uri,
            type: audioFile.type,
            name: audioFile.name,
            size: audioFile.size,
        };
        console.log('File object:', file);

        // Send the message with the audio file attachment directly
        console.log('Sending message with audio attachment...');
        const message = await channel.sendMessage({
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

        console.log('Message sent successfully:', message);
        return message;
    } catch (error) {
        console.error('Error sending audio message:', error);
        throw error;
    }
};

export const getFileSize = async (uri: string): Promise<number> => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob.size;
    } catch (error) {
        console.error('Error getting file size:', error);
        return 0;
    }
}; 