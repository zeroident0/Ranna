-- SIMPLE CHAT RESET - Copy this into Supabase SQL Editor
-- This will delete all chat data permanently!

DELETE FROM stream_chat_messages;
DELETE FROM stream_chat_channel_members;  
DELETE FROM stream_chat_channels;

-- Verify cleanup
SELECT 'Chats reset successfully!' as status;
SELECT COUNT(*) as remaining_messages FROM stream_chat_messages;
SELECT COUNT(*) as remaining_channels FROM stream_chat_channels;
