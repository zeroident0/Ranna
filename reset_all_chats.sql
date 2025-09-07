-- =============================================
-- RESET ALL CHATS - SQL CODE
-- =============================================
-- WARNING: This will permanently delete ALL chat data!
-- Copy and paste this into your Supabase SQL Editor

-- 1. Delete all messages from all channels
DELETE FROM stream_chat_messages;

-- 2. Delete all channel members
DELETE FROM stream_chat_channel_members;

-- 3. Delete all channels
DELETE FROM stream_chat_channels;

-- 4. Delete all users (optional - only if you want to reset user data too)
-- DELETE FROM stream_chat_users;

-- 5. Reset any auto-increment sequences (if they exist)
-- ALTER SEQUENCE IF EXISTS stream_chat_messages_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS stream_chat_channels_id_seq RESTART WITH 1;

-- 6. Verify the cleanup
SELECT 'Messages deleted:' as status, COUNT(*) as count FROM stream_chat_messages
UNION ALL
SELECT 'Channels deleted:', COUNT(*) FROM stream_chat_channels
UNION ALL
SELECT 'Members deleted:', COUNT(*) FROM stream_chat_channel_members;

-- 7. Show remaining data (should all be 0)
SELECT 
  'stream_chat_messages' as table_name, COUNT(*) as remaining_records 
FROM stream_chat_messages
UNION ALL
SELECT 
  'stream_chat_channels', COUNT(*) 
FROM stream_chat_channels
UNION ALL
SELECT 
  'stream_chat_channel_members', COUNT(*) 
FROM stream_chat_channel_members;
