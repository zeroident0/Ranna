
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';

export default function HomeLayout() {
    return (
        <Tabs>
            <Tabs.Screen name='index' options={{
                title: 'Chats',
                tabBarIcon: ({ size, color }) =>
                    <Ionicons name="chatbubbles-outline" size={size} color={color} />
            }} />

            <Tabs.Screen name='profile' options={{
                title: 'Profile',
                tabBarIcon: ({ size, color }) =>
                    <Feather name="user" size={size} color={color} />
            }} />
        </Tabs>
    );
}
