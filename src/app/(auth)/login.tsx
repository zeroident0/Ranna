import React, { useState } from 'react';
import { StyleSheet, View, AppState, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Button, Input, Text } from 'react-native-elements';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import CustomAlert from '../../components/CustomAlert';

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { alertState, showError, hideAlert } = useCustomAlert();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) showError('Login Failed', error.message);
    setLoading(false);
  }

  return (
    <LinearGradient
      colors={['rgb(177, 156, 217)', 'white']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconContainer}>
            <Image 
              source={require('../../../assets/icon.png')} 
              style={styles.appIcon}
              resizeMode="contain"
            />
          </View>
          <Text h3 style={styles.title}>Welcome Back</Text>
      
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          leftIcon={{ type: 'font-awesome', name: 'envelope', color: 'rgb(177, 156, 217)' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
          keyboardType="email-address"
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={styles.inputContainer}
          inputContainerStyle={styles.inputContainerStyle}
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          leftIcon={{ type: 'font-awesome', name: 'lock', color: 'rgb(177, 156, 217)' }}
          rightIcon={{
            type: 'font-awesome',
            name: showPassword ? 'eye-slash' : 'eye',
            color: 'rgb(177, 156, 217)',
            onPress: () => setShowPassword(!showPassword),
          }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={!showPassword}
          placeholder="Password"
          autoCapitalize={'none'}
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={styles.inputContainer}
          inputContainerStyle={styles.inputContainerStyle}
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title="Sign In"
          disabled={loading}
          onPress={() => signInWithEmail()}
          buttonStyle={styles.primaryButton}
        />
      </View>
      
      <View style={styles.verticallySpaced}>
        <Text style={styles.linkText}>
          Don't have an account?{' '}
          <Link href="/(auth)/signup" style={styles.link}>
            Sign Up
          </Link>
        </Text>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert
        visible={alertState.visible}
        title={alertState.options.title}
        message={alertState.options.message}
        type={alertState.options.type}
        buttons={alertState.options.buttons}
        onDismiss={hideAlert}
        showCloseButton={alertState.options.showCloseButton}
        icon={alertState.options.icon}
        customIcon={alertState.options.customIcon}
        animationType={alertState.options.animationType}
        backgroundColor={alertState.options.backgroundColor}
        overlayColor={alertState.options.overlayColor}
        borderRadius={alertState.options.borderRadius}
        maxWidth={alertState.options.maxWidth}
        showIcon={alertState.options.showIcon}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 12,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appIcon: {
    width: 120,
    height: 120,
    borderRadius: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  verticallySpaced: {
    paddingTop: 0,
    paddingBottom: 0,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: 'rgb(177, 156, 217)',
  },
  linkText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  link: {
    color: 'rgb(177, 156, 217)',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 2,
  },
  inputContainerStyle: {
    borderBottomWidth: 2,
    borderBottomColor: 'rgb(177, 156, 217)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputText: {
    color: '#333',
    fontSize: 16,
  },
  inputLabel: {
    color: '#000',
    fontWeight: '600',
    marginBottom: 8,
  },
});
