import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import { themes } from '../../../constants/themes';

export default function TabsNavigator() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#B19CD9',
          borderTopColor: 'rgba(177, 156, 217, 0.8)',
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.7)',
        tabBarActiveBackgroundColor: '#8B5FBF',
        tabBarInactiveBackgroundColor: 'transparent',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="chatbubble-outline" size={size} color="#FFFFFF" />
          ),
          headerStyle: {
            backgroundColor: '#B19CD9',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            color: '#FFFFFF',
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <AntDesign name="user" size={size} color="#FFFFFF" />
          ),
          headerStyle: {
            backgroundColor: '#B19CD9',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            color: '#FFFFFF',
          },
        }}
      />
    </Tabs>
  );
}
