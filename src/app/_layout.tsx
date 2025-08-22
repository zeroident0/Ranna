
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthProvider from '../providers/AuthProvider';
import { NetworkProvider } from '../providers/NetworkProvider';

export default function HomeLayout() {
    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <NetworkProvider>
                    <AuthProvider>
                        <Slot />
                    </AuthProvider>
                </NetworkProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
// The GestureHandlerRootView is necessary for gesture handling in React Native