// Video calling functionality - commented out for now
// Uncomment the imports and code below to re-enable video calls

/*
import {
  StreamCall,
  CallContent,
  useStreamVideoClient,
  RingingCallContent,
  Call,
  useCalls,
} from '@stream-io/video-react-native-sdk';
*/
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { themes } from '../../../constants/themes';

export default function CallScreen() {
  // Video calling code - commented out
  /*
  const calls = useCalls();
  const call = calls[0];

  // const [call, setCall] = useState<Call>();

  // const client = useStreamVideoClient();

  // useEffect(() => {
  //   const fetchCall = async () => {
  //     const call = client.call('default', id);
  //     await call.get();
  //     setCall(call);
  //   };
  //   fetchCall();
  //   return () => {
  //     if (call) {
  //       call.leave();
  //     }
  //   };
  // }, [id]);

  if (!call) {
    if (router.canGoBack) {
      router.back();
    } else {
      router.push('/');
    }
    return null;
  }

  return (
    <StreamCall call={call}>
      <CallContent 
        CallTopView={() => null}
        CallBottomView={() => null}
        CallControls={({ onHangupCall }) => (
          <View style={styles.callControls}>
            <TouchableOpacity 
              onPress={onHangupCall}
              style={styles.hangupButton}
            >
              <Text style={styles.hangupButtonText}>📞</Text>
            </TouchableOpacity>
          </View>
        )}
        enableScreenSharing={false}
        enableVideo={false}
        enableAudio={true}
        enableParticipantVideo={false}
        enableParticipantScreenSharing={false}
      />
    </StreamCall>
  );
  */

  // Temporary placeholder - redirect back since video calls are disabled
  useEffect(() => {
    if (router.canGoBack) {
      router.back();
    } else {
      router.push('/');
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Calls Disabled</Text>
      <Text style={styles.message}>
        Video calling functionality has been disabled.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themes.colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themes.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: themes.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Original video call styles - commented out
  /*
  callControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangupButton: {
    backgroundColor: '#ff4444',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  hangupButtonText: {
    fontSize: 24,
    color: 'white',
  },
  */
});