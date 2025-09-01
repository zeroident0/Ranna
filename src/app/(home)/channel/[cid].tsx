import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from "react-native";
import { Channel, MessageList, MessageInput, useChatContext } from "stream-chat-expo";
import type { Channel as ChannelType } from "stream-chat";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChannelScreen() {
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { cid } = useLocalSearchParams<{ cid: string }>();

  const { client } = useChatContext();

  useEffect(() => {
    const fetchChannel = async () => {
      if (!cid || !client) return;
      try {
        setIsLoading(true);
        const res = await client.queryChannels({ cid });
        if (res.length > 0) {
          setChannel(res[0]);
        }
      } catch (error) {
        console.error("Error fetching channel:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannel();
  }, [cid, client]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!channel) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="red" />
      </View>
    );
  }

  return (
      <Channel 
      channel={channel}
      audioRecordingEnabled={true}>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 15}
          >
            <MessageList />
            <MessageInput 
             
             />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Channel>
  );
}
