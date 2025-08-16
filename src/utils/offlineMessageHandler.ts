import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreamChat } from 'stream-chat';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineMessage {
    id: string;
    channelId: string;
    text?: string;
    attachments?: any[];
    timestamp: number;
    retryCount: number;
}

const OFFLINE_MESSAGES_KEY = 'stream_offline_messages';
const MAX_RETRY_COUNT = 3;

class OfflineMessageHandler {
    private static instance: OfflineMessageHandler;
    private isOnline: boolean = true;
    private syncInProgress: boolean = false;
    private client: StreamChat | null = null;

    private constructor() {
        this.initializeNetworkListener();
    }

    public static getInstance(): OfflineMessageHandler {
        if (!OfflineMessageHandler.instance) {
            OfflineMessageHandler.instance = new OfflineMessageHandler();
        }
        return OfflineMessageHandler.instance;
    }

    public setClient(client: StreamChat) {
        this.client = client;
    }

    private initializeNetworkListener() {
        NetInfo.addEventListener(state => {
            const wasOnline = this.isOnline;
            this.isOnline = state.isConnected && state.isInternetReachable;
            
            if (!wasOnline && this.isOnline) {
                console.log('Network reconnected - syncing offline messages');
                this.syncOfflineMessages();
            }
        });
    }

    public async queueMessage(
        client: StreamChat,
        channelId: string,
        messageData: { text?: string; attachments?: any[] }
    ): Promise<void> {
        if (this.isOnline) {
            return; // Don't queue if online
        }

        const offlineMessage: OfflineMessage = {
            id: `offline_${Date.now()}_${Math.random()}`,
            channelId,
            text: messageData.text,
            attachments: messageData.attachments,
            timestamp: Date.now(),
            retryCount: 0,
        };

        try {
            const existingMessages = await this.getOfflineMessages();
            existingMessages.push(offlineMessage);
            await AsyncStorage.setItem(OFFLINE_MESSAGES_KEY, JSON.stringify(existingMessages));
            console.log('Message queued for offline delivery:', offlineMessage.id);
        } catch (error) {
            console.error('Error queuing offline message:', error);
        }
    }

    public async syncOfflineMessages(): Promise<void> {
        if (this.syncInProgress || !this.isOnline || !this.client) {
            return;
        }

        this.syncInProgress = true;
        console.log('Starting offline message sync...');

        try {
            const offlineMessages = await this.getOfflineMessages();
            if (offlineMessages.length === 0) {
                console.log('No offline messages to sync');
                return;
            }

            console.log(`Syncing ${offlineMessages.length} offline messages`);

            for (const message of offlineMessages) {
                try {
                    await this.sendOfflineMessage(message);
                    await this.removeOfflineMessage(message.id);
                    console.log(`Successfully sent offline message: ${message.id}`);
                } catch (error) {
                    console.error(`Failed to send offline message ${message.id}:`, error);
                    message.retryCount++;
                    
                    if (message.retryCount >= MAX_RETRY_COUNT) {
                        console.log(`Removing failed message after ${MAX_RETRY_COUNT} retries: ${message.id}`);
                        await this.removeOfflineMessage(message.id);
                    } else {
                        await this.updateOfflineMessage(message);
                    }
                }
            }
        } catch (error) {
            console.error('Error during offline message sync:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    private async sendOfflineMessage(message: OfflineMessage): Promise<void> {
        if (!this.client) {
            throw new Error('StreamChat client not available');
        }

        try {
            // Get the channel instance
            const channels = await this.client.queryChannels({ cid: message.channelId });
            if (channels.length === 0) {
                throw new Error(`Channel not found: ${message.channelId}`);
            }

            const channel = channels[0];
            
            // Send the message
            await channel.sendMessage({
                text: message.text,
                attachments: message.attachments,
            });

            console.log('Offline message sent successfully:', message.id);
        } catch (error) {
            console.error('Error sending offline message:', error);
            throw error;
        }
    }

    private async getOfflineMessages(): Promise<OfflineMessage[]> {
        try {
            const messagesJson = await AsyncStorage.getItem(OFFLINE_MESSAGES_KEY);
            return messagesJson ? JSON.parse(messagesJson) : [];
        } catch (error) {
            console.error('Error getting offline messages:', error);
            return [];
        }
    }

    private async removeOfflineMessage(messageId: string): Promise<void> {
        try {
            const messages = await this.getOfflineMessages();
            const filteredMessages = messages.filter(msg => msg.id !== messageId);
            await AsyncStorage.setItem(OFFLINE_MESSAGES_KEY, JSON.stringify(filteredMessages));
        } catch (error) {
            console.error('Error removing offline message:', error);
        }
    }

    private async updateOfflineMessage(updatedMessage: OfflineMessage): Promise<void> {
        try {
            const messages = await this.getOfflineMessages();
            const updatedMessages = messages.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
            );
            await AsyncStorage.setItem(OFFLINE_MESSAGES_KEY, JSON.stringify(updatedMessages));
        } catch (error) {
            console.error('Error updating offline message:', error);
        }
    }

    public async clearOfflineMessages(): Promise<void> {
        try {
            await AsyncStorage.removeItem(OFFLINE_MESSAGES_KEY);
            console.log('Cleared all offline messages');
        } catch (error) {
            console.error('Error clearing offline messages:', error);
        }
    }

    public async getOfflineMessageCount(): Promise<number> {
        const messages = await this.getOfflineMessages();
        return messages.length;
    }

    public isNetworkOnline(): boolean {
        return this.isOnline;
    }
}

export const offlineMessageHandler = OfflineMessageHandler.getInstance();
