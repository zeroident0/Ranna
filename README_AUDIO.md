# Audio Recording in Stream Chat

This app now includes audio recording functionality that integrates with Stream Chat. Users can record and send audio messages in their chat conversations.

## Features

- **Audio Recording**: Tap the microphone button to start recording, tap again to stop
- **Real-time Duration**: Shows recording duration while recording
- **Audio Playback**: Received audio messages can be played back with a custom audio player
- **Permission Handling**: Automatically requests microphone permissions on Android
- **Stream Chat Integration**: Audio messages are sent as attachments through Stream Chat

## Components

### AudioRecorder
- Located in `src/components/AudioRecorder.tsx`
- Handles microphone permissions and audio recording
- Uses expo-audio for recording functionality
- Shows recording duration and visual indicators

### CustomMessageInput
- Located in `src/components/CustomMessageInput.tsx`
- Extends Stream Chat's MessageInput with audio recording
- Integrates the AudioRecorder component
- Handles sending audio messages through Stream Chat

### AudioPlayer
- Located in `src/components/AudioPlayer.tsx`
- Plays back received audio messages
- Shows progress bar and time information
- Play/pause controls

### AudioMessage
- Located in `src/components/AudioMessage.tsx`
- Renders audio messages in the chat
- Integrates with the AudioPlayer component

## Usage

1. **Recording Audio**:
   - In any chat channel, tap the microphone button (🎤) next to the message input
   - The button will turn red and show recording duration
   - Tap the stop button (⏹️) to finish recording
   - The audio message will be automatically sent

2. **Playing Audio**:
   - Received audio messages show as audio players
   - Tap the play button (▶️) to start playback
   - Progress bar shows current position
   - Time display shows current time and total duration

## Technical Details

### Dependencies
- `expo-audio`: For audio recording and playback
- `stream-chat-expo`: For Stream Chat integration
- `@expo/vector-icons`: For UI icons

### Audio Format
- Recording format: M4A (high quality)
- File naming: `audio_message_[timestamp].m4a`
- Duration tracking in seconds

### Permissions
- **Android**: Requests `RECORD_AUDIO` permission
- **iOS**: Automatically handles microphone permissions

### File Handling
- Audio files are stored locally after recording
- File size is calculated for Stream Chat attachments
- Audio messages include duration metadata

## Integration Points

### Stream Chat
- Audio messages are sent as attachments with type 'audio'
- Includes metadata like duration and MIME type
- Integrates with Stream Chat's message system

### Channel Screen
- The main channel screen (`src/app/(home)/channel/[cid].tsx`) now uses `CustomMessageInput`
- Replaces the default `MessageInput` with audio-enabled version

## Future Enhancements

- **File Upload**: Integrate with Stream Chat's file upload system for cloud storage
- **Audio Compression**: Add options for different audio quality levels
- **Waveform Visualization**: Show audio waveform during recording and playback
- **Voice Messages**: Add support for longer voice messages with pause/resume
- **Audio Effects**: Add filters or effects to recorded audio

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure microphone permissions are granted in device settings
2. **Recording Fails**: Check that expo-audio is properly installed and configured
3. **Playback Issues**: Verify audio file format compatibility
4. **Stream Chat Errors**: Ensure Stream Chat client is properly configured

### Debug Information

- Check console logs for detailed error messages
- Verify audio file URIs and metadata
- Test with different audio durations and file sizes

## Development Notes

- The audio recording uses the `expo-audio` package version 0.4.8
- Audio files are temporarily stored locally and may need cleanup
- Consider implementing file size limits for audio messages
- Test on both iOS and Android devices for compatibility 