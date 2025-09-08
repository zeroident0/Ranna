import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import InviteManager from '../../components/InviteManager';

export default function InvitesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <Stack.Screen 
        options={{ 
          title: 'Group Invitations',
          headerBackTitle: 'Back'
        }} 
      />
      <InviteManager />
    </SafeAreaView>
  );
}
