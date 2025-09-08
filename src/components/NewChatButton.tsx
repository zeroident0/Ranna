import React, { useState, useRef, useEffect } from "react";
import { TouchableOpacity, StyleSheet, Modal, View, Text, Pressable, Animated } from "react-native";
import { router } from "expo-router";
import Octicons from '@expo/vector-icons/Octicons';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function NewChatButton() {
    const [showOptions, setShowOptions] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    const handleNewChat = () => {
        setShowOptions(false);
        router.push('/(home)/users');
    };

    const handleNewGroup = () => {
        setShowOptions(false);
        router.push('/(home)/create-group');
    };

    useEffect(() => {
        if (showOptions) {
            // Fast animation in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 150, // Much faster than default
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Fast animation out
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 100, // Even faster for closing
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [showOptions]);

    return (
        <>
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowOptions(true)}
                activeOpacity={0.8}
            >
                <Octicons name="plus" size={24} color="white" style={styles.icon} />
            </TouchableOpacity>

            <Modal
                visible={showOptions}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowOptions(false)}
            >
                <Animated.View 
                    style={[styles.modalOverlay, { opacity: fadeAnim }]}
                >
                    <Pressable 
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowOptions(false)}
                    />
                    <Animated.View 
                        style={[
                            styles.optionsContainer, 
                            { 
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}
                    >
                        <TouchableOpacity
                            style={[styles.option, styles.newChatOption]}
                            onPress={handleNewChat}
                        >
                            <View style={styles.optionIcon}>
                                <Ionicons name="chatbubble-outline" size={24} color="rgb(177, 156, 217)" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>New Chat</Text>
                                <Text style={styles.optionSubtitle}>Start a conversation with someone</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.option, styles.lastOption, styles.newGroupOption]}
                            onPress={handleNewGroup}
                        >
                            <View style={styles.optionIcon}>
                                <Ionicons name="people-outline" size={24} color="rgb(177, 156, 217)" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>New Group</Text>
                                <Text style={styles.optionSubtitle}>Create a group chat with multiple people</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#B19CD9', // Light purple shade
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        transform: [{ rotate: '45deg' }],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        paddingBottom: 140,
        paddingRight: 20,
    },
    optionsContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        minWidth: 280,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        overflow: 'hidden',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    lastOption: {
        borderBottomWidth: 0,
    },
    newChatOption: {
        backgroundColor: 'rgba(177, 156, 217, 0.1)', // Light purple background
    },
    newGroupOption: {
        backgroundColor: 'rgba(177, 156, 217, 0.15)', // Slightly darker purple background
    },
    optionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(177, 156, 217, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    optionSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    icon: {
        transform: [{ rotate: '-45deg' }],
    },
});

