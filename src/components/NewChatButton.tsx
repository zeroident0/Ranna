import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, Modal, View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import Octicons from '@expo/vector-icons/Octicons';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function NewChatButton() {
    const [showOptions, setShowOptions] = useState(false);

    const handleNewChat = () => {
        setShowOptions(false);
        router.push('/(home)/users');
    };

    const handleNewGroup = () => {
        setShowOptions(false);
        router.push('/(home)/create-group');
    };

    return (
        <>
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowOptions(true)}
                activeOpacity={0.8}
            >
                <Octicons name="person-add" size={24} color="white" />
            </TouchableOpacity>

            <Modal
                visible={showOptions}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowOptions(false)}
            >
                <Pressable 
                    style={styles.modalOverlay}
                    onPress={() => setShowOptions(false)}
                >
                    <View style={styles.optionsContainer}>
                        <TouchableOpacity
                            style={[styles.option, styles.newChatOption]}
                            onPress={handleNewChat}
                        >
                            <View style={styles.optionIcon}>
                                <Ionicons name="chatbubble-outline" size={24} color="#007AFF" />
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
                                <Ionicons name="people-outline" size={24} color="#007AFF" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>New Group</Text>
                                <Text style={styles.optionSubtitle}>Create a group chat with multiple people</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </Pressable>
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
        borderRadius: 28,
        backgroundColor: '#007AFF', // iOS blue color
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
        backgroundColor: '#f0f8ff', // Light blue background
    },
    newGroupOption: {
        backgroundColor: '#f0fff0', // Light green background
    },
    optionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
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
});

