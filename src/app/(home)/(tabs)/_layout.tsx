import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabsNavigator() {
  return (
    <Tabs>
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
        name="stories"
        options={{
          title: 'Stories',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
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
        }}
      />
    </Tabs>
  );
}
