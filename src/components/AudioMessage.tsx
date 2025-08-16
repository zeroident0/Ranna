import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Message } from 'stream-chat';
import AudioPlayer from './AudioPlayer';

interface AudioMessageProps {
    message: Message;
}

export default function AudioMessage({ message }: AudioMessageProps) {
    // Check if the message has audio attachments
    const audioAttachment = message.attachments?.find(
        attachment => attachment.type === 'audio'
    );

    if (!audioAttachment) {
        return null;
    }

    const audioUrl = audioAttachment.asset_url || audioAttachment.thumb_url;
    const duration = audioAttachment.duration;

    if (!audioUrl) {
        return null;
    }

    return (
        <View style={styles.container}>
            <AudioPlayer
                audioUrl={audioUrl}
                duration={duration}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 4,
    },
}); 