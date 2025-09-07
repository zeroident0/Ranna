import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkContextType {
    isOnline: boolean;
    isConnected: boolean;
    isInternetReachable: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
    children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
    const [networkState, setNetworkState] = useState<NetworkContextType>({
        isOnline: true,
        isConnected: true,
        isInternetReachable: true,
    });

    console.log('🌐 NetworkProvider: Initializing network provider');

    const updateNetworkState = useCallback((state: any) => {
        const isConnected = state.isConnected;
        const isInternetReachable = state.isInternetReachable;
        const isOnline = isConnected && isInternetReachable;

        console.log('🌐 NetworkProvider: Network state updated:', {
            isConnected,
            isInternetReachable,
            isOnline
        });

        setNetworkState({
            isOnline,
            isConnected,
            isInternetReachable,
        });
    }, []);

    useEffect(() => {
        // Get initial network state
        NetInfo.fetch().then(updateNetworkState);

        // Listen for network changes
        const unsubscribe = NetInfo.addEventListener(updateNetworkState);

        return () => unsubscribe();
    }, [updateNetworkState]);

    return (
        <NetworkContext.Provider value={networkState}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    const context = useContext(NetworkContext);
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider. Make sure NetworkProvider is wrapped around your component tree.');
    }
    return context;
}
