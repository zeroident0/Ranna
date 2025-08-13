import { PropsWithChildren } from "react";
import { StreamChat } from 'stream-chat';
import { useEffect, useState } from 'react';
import { Chat, OverlayProvider } from 'stream-chat-expo';
import { ActivityIndicator } from "react-native";


const client = StreamChat.getInstance(process.env.EXPO_PUBLIC_STREAM_API_KEY);

export default function ChatProvider({ children }: PropsWithChildren) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const connect = async () => {
            await client.connectUser(
                {
                    id: 'user-id',
                    name: 'User',
                    image: 'https://getstream.io/random_png/?id=user-id&name=User+Name',
                },
                client.devToken('user-id')
            );
            setIsReady(true);

            // const channel = client.channel('messaging', 'general', {
            //     name: 'General',
            // });
            // await channel.watch();
        };

        connect().catch(console.error);

        return () => {
            client.disconnectUser();
            setIsReady(false);
        }

    }, []);

    if (!isReady) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <OverlayProvider>
            <Chat client={client}>
                {children}
            </Chat>
        </OverlayProvider>
    );
}