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
          backgroundColor: 'rgba(248, 250, 252, 0.95)',
          borderTopColor: 'rgba(226, 232, 240, 0.8)',
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <AntDesign name="user" size={size} color={color} />
          ),
          headerStyle: {
            backgroundColor: themes.colors.background,
          },
          headerTintColor: themes.colors.text,
          headerTitleStyle: {
            color: themes.colors.text,
          },
        }}
      />
    </Tabs>
  );
}
