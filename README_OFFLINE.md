# Offline Support for GetStream in Ranna

This document describes the offline support implementation for GetStream in the Ranna chat application. The app now supports sending messages and audio recordings when offline, with automatic synchronization when the network connection is restored.

## Features

### Offline Message Support
- **Message Queuing**: Messages sent while offline are automatically queued for later delivery
- **Audio Message Support**: Audio recordings can be queued and sent when back online
- **Automatic Sync**: Queued messages are automatically sent when network connection is restored
- **Retry Logic**: Failed messages are retried up to 3 times before being discarded
- **Visual Indicators**: Users see offline status and pending message count

### Network Monitoring
- **Real-time Status**: Continuous monitoring of network connectivity
- **Automatic Detection**: Detects when going offline/online
- **Graceful Handling**: App continues to function in offline mode

## Implementation Details

### Core Components

#### 1. ChatProvider (`src/providers/ChatProvider.tsx`)
- Configures StreamChat client with offline capabilities
- Monitors network connectivity using NetInfo
- Manages user connection state
- Integrates with offline message handler

#### 2. OfflineMessageHandler (`src/utils/offlineMessageHandler.ts`)
- Singleton class managing offline message queue
- Handles message storage in AsyncStorage
- Implements retry logic for failed messages
- Provides synchronization when coming back online

#### 3. CustomMessageInput (`src/components/CustomMessageInput.tsx`)
- Enhanced to detect offline state
- Queues messages when offline
- Shows offline indicator
- Handles both text and audio messages

#### 4. OfflineStatusBar (`src/components/OfflineStatusBar.tsx`)
- Displays offline status to users
- Shows pending message count
- Provides manual sync button
- Visual feedback for network state

### Data Flow

#### Online Mode
1. User sends message/audio
2. Message sent directly to GetStream
3. Real-time delivery to recipients

#### Offline Mode
1. User sends message/audio
2. Message queued in AsyncStorage
3. User sees offline indicator
4. Message stored with metadata (timestamp, retry count)

#### Reconnection
1. Network connection restored
2. OfflineMessageHandler detects reconnection
3. Queued messages sent automatically
4. Failed messages retried (up to 3 times)
5. Successfully sent messages removed from queue

### Storage Structure

#### AsyncStorage Keys
- `stream_offline_messages`: Array of queued messages

#### Message Structure
```typescript
interface OfflineMessage {
    id: string;           // Unique identifier
    channelId: string;    // Channel ID for delivery
    text?: string;        // Message text
    attachments?: any[];  // Audio/file attachments
    timestamp: number;    // Creation timestamp
    retryCount: number;   // Number of retry attempts
}
```

## Usage

### For Users
1. **Normal Usage**: App works normally when online
2. **Offline Mode**: 
   - Send messages as usual
   - Messages are queued automatically
   - See offline indicator (red dot)
   - View pending message count
3. **Reconnection**: 
   - Messages sent automatically
   - No user action required

### For Developers

#### Adding Offline Support to New Components
```typescript
import { offlineMessageHandler } from '../utils/offlineMessageHandler';
import NetInfo from '@react-native-community/netinfo';

// Check network status
const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
        setIsOnline(state.isConnected && state.isInternetReachable);
    });
    return () => unsubscribe();
}, []);

// Queue message when offline
if (!isOnline) {
    await offlineMessageHandler.queueMessage(client, channelId, {
        text: 'Your message',
        attachments: []
    });
}
```

#### Manual Sync
```typescript
// Force sync of offline messages
await offlineMessageHandler.syncOfflineMessages();

// Get pending message count
const count = await offlineMessageHandler.getOfflineMessageCount();

// Clear all offline messages
await offlineMessageHandler.clearOfflineMessages();
```

## Configuration

### Dependencies
The offline support requires these packages (already installed):
- `@react-native-async-storage/async-storage`: For message persistence
- `@react-native-community/netinfo`: For network monitoring
- `stream-chat-expo`: GetStream SDK with offline capabilities

### Environment Variables
- `EXPO_PUBLIC_STREAM_API_KEY`: GetStream API key (required)

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- Maximum 3 retry attempts per message
- Failed messages logged for debugging

### Storage Errors
- AsyncStorage operations wrapped in try-catch
- Graceful degradation if storage fails
- Error logging for debugging

### GetStream Errors
- Channel not found errors handled
- Invalid message format errors caught
- Connection errors trigger retry logic

## Testing

### Offline Testing
1. Enable airplane mode or disconnect network
2. Send messages/audio recordings
3. Verify messages are queued
4. Reconnect network
5. Verify messages are sent automatically

### Manual Testing
```typescript
// Test offline message queuing
await offlineMessageHandler.queueMessage(client, 'test-channel', {
    text: 'Test offline message'
});

// Test message count
const count = await offlineMessageHandler.getOfflineMessageCount();
console.log('Pending messages:', count);

// Test manual sync
await offlineMessageHandler.syncOfflineMessages();
```

## Performance Considerations

### Memory Usage
- Messages stored in AsyncStorage (persistent)
- Limited retry attempts prevent infinite loops
- Automatic cleanup of sent messages

### Network Usage
- Messages sent in order when reconnecting
- No duplicate messages sent
- Efficient sync process

### Battery Impact
- NetInfo listener optimized for minimal battery usage
- AsyncStorage operations are efficient
- No background polling

## Troubleshooting

### Common Issues

1. **Messages not syncing**
   - Check network connectivity
   - Verify GetStream API key
   - Check console logs for errors

2. **Storage errors**
   - Verify AsyncStorage permissions
   - Check available storage space
   - Clear app data if needed

3. **Retry loops**
   - Check message format validity
   - Verify channel exists
   - Check GetStream API limits

### Debug Information
- All offline operations are logged to console
- Network state changes logged
- Message queue operations logged
- Error details included in logs

## Future Enhancements

### Planned Features
- **Message Priority**: High-priority messages sent first
- **File Upload Queue**: Support for offline file uploads
- **Read Receipts**: Track read status for offline messages
- **Message Encryption**: End-to-end encryption for offline messages
- **Sync Progress**: Show sync progress to users

### Performance Improvements
- **Batch Processing**: Send multiple messages in batches
- **Compression**: Compress offline message data
- **Background Sync**: Sync in background when app is closed
- **Selective Sync**: Sync only recent messages

## Security Considerations

### Data Protection
- Messages stored locally on device
- No sensitive data in logs
- Secure AsyncStorage usage

### Privacy
- Offline messages only stored locally
- No cloud storage of queued messages
- Automatic cleanup after sending

## Support

For issues related to offline support:
1. Check console logs for error messages
2. Verify network connectivity
3. Test with simple text messages first
4. Check GetStream documentation for API changes

## Contributing

When adding new offline features:
1. Follow existing patterns in OfflineMessageHandler
2. Add proper error handling
3. Include logging for debugging
4. Test offline/online scenarios
5. Update this documentation
