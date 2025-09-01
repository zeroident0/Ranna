import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import Octicons from '@expo/vector-icons/Octicons';

export default function NewChatButton() {
    return (
        <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/(home)/users')}
            activeOpacity={0.8}
        >
            <Octicons name="person-add" size={24} color="white" />
        </TouchableOpacity>
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
        backgroundColor: '#25D366', // WhatsApp green color
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
});

