import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface AudioPlayerProps {
    audioUrl: string;
    duration?: number;
}

export default function AudioPlayer({ audioUrl, duration }: AudioPlayerProps) {
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    
    // Animation values for wave bars
    const waveAnimations = useRef([
        new Animated.Value(0.3),
        new Animated.Value(0.5),
        new Animated.Value(0.7),
        new Animated.Value(0.4),
        new Animated.Value(0.6),
        new Animated.Value(0.8),
        new Animated.Value(0.3),
        new Animated.Value(0.5),
        new Animated.Value(0.7),
        new Animated.Value(0.4),
        new Animated.Value(0.6),
        new Animated.Value(0.8),
    ]).current;

    // Animate wave bars continuously
    useEffect(() => {
        const animations = waveAnimations.map((anim, index) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: Math.random() * 0.7 + 0.3,
                        duration: 300 + Math.random() * 200,
                        useNativeDriver: false,
                    }),
                    Animated.timing(anim, {
                        toValue: Math.random() * 0.3 + 0.1,
                        duration: 300 + Math.random() * 200,
                        useNativeDriver: false,
                    }),
                ])
            );
        });

        Animated.parallel(animations).start();
    }, [waveAnimations]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

    return (
        <View style={styles.container}>
            <View style={styles.progressContainer}>
                <View style={styles.waveContainer}>
                    {waveAnimations.map((anim, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.waveBar,
                                {
                                    height: anim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [2, 12],
                                    }),
                                },
                            ]}
                        />
                    ))}
                </View>
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    <Text style={styles.timeText}>
                        {duration ? formatTime(duration) : formatTime(totalDuration)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 8,
        marginVertical: 2,
        minWidth: 180,
        maxWidth: 280,
    },
    progressContainer: {
        flex: 1,
    },
    waveContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 16,
        marginBottom: 4,
        paddingHorizontal: 2,
    },
    waveBar: {
        width: 2,
        backgroundColor: '#25D366',
        borderRadius: 1,
        marginHorizontal: 1,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeText: {
        fontSize: 11,
        color: '#666',
        fontWeight: '400',
    },
}); 