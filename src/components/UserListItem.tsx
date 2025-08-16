import { View, Text, Image, Pressable } from "react-native"
import { useChatContext } from "stream-chat-expo"
import { useAuth } from "../providers/AuthProvider";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

const UserListItem = ({ user }) => {
    const { client } = useChatContext();
    const { user: me } = useAuth();

    // Get the public URL for the user's avatar
    const avatarUrl = user.avatar_url
        ? supabase.storage.from('avatars').getPublicUrl(user.avatar_url).data.publicUrl
        : null;

    const onPress = async () => {
        // Check if both users exist before proceeding
        if (!me || !user) {
            console.error('User not available for chat');
            return;
        }

        //start chat with him/her
        const channel = client.channel('messaging', {
            members: [me.id, user.id],
        });
        await channel.watch();

        // navigate for chat screen after creating the new chat channel
        router.replace(`/(home)/channel/${channel.cid}`);
    };


    return (
        <Pressable
            onPress={onPress}
            style={{ padding: 15, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center' }}>

            <Image
                source={{
                    uri: avatarUrl || 'https://via.placeholder.com/50x50?text=User'
                }}
                style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    marginRight: 15
                }}
            />

            <Text style={{ fontWeight: '600', }}>{user.full_name}</Text>
        </Pressable>
    )
}

export default UserListItem;