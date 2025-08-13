import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { Channel, MessageInput, MessageList, useChatContext } from "stream-chat-expo";
import type { Channel as ChannelType } from "stream-chat";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChannelScreen() {
    const [channel, setChannel] = useState<ChannelType | null>(null);
    const { cid } = useLocalSearchParams<{ cid: string }>();

    const { client } = useChatContext();

    useEffect(() => {
        const fetchChannel = async () => {
            if (!cid) return;
            const res = await client.queryChannels({ cid });
            if (res.length > 0) {
                setChannel(res[0]);
            }
        };
        fetchChannel();
    }, [cid, client]);

    if (!channel) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <Channel channel={channel}>
            <MessageList />
            <SafeAreaView edges={['bottom']}>
                <MessageInput />
            </SafeAreaView>

        </Channel >
    );
}
