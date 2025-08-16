import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

interface CustomTimeBadgeProps {
    timestamp: Date | string;
    style?: any;
}

export const CustomTimeBadge: React.FC<CustomTimeBadgeProps> = ({
    timestamp,
    style
}) => {
    const formatTime = (time: Date | string) => {
        const date = typeof time === 'string' ? new Date(time) : time;
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            // Today - show time
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } else if (diffInHours < 48) {
            // Yesterday
            return 'Yesterday';
        } else if (diffInHours < 168) {
            // Within a week - show day
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[date.getDay()];
        } else {
            // Older - show date
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}`;
        }
    };

    return (
        <View style={[styles.container, style]}>
            <Text style={styles.text}>
                {formatTime(timestamp)}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    text: {
        color: '#8E8E93',
        fontSize: 11,
        fontWeight: '400',
        textAlign: 'center',
    },
}); 