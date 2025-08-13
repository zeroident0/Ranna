
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthProvider from '../providers/AuthProvider';

export default function HomeLayout() {
    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <AuthProvider>
                    <Slot />
                </AuthProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
// The GestureHandlerRootView is necessary for gesture handling in React Native