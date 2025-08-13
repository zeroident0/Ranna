import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, AppState, AppStateStatus } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Button, Input } from '@rneui/themed';

export default function Auth() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                supabase.auth.startAutoRefresh();
            } else {
                supabase.auth.stopAutoRefresh();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) Alert.alert(error.message ?? 'Unknown error');
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) Alert.alert(error.message ?? 'Unknown error');
        if (!data.session) Alert.alert('Please check your inbox for email verification!');
        setLoading(false);
    }

    return (
        <View style={styles.container}>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Input
                    label="Email"
                    leftIcon={{ type: 'font-awesome', name: 'envelope' }}
                    onChangeText={setEmail}
                    value={email}
                    placeholder="email@address.com"
                    autoCapitalize="none"
                />
            </View>
            <View style={styles.verticallySpaced}>
                <Input
                    label="Password"
                    leftIcon={{ type: 'font-awesome', name: 'lock' }}
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry
                    placeholder="Password"
                    autoCapitalize="none"
                />
            </View>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Button title="Sign in" disabled={loading} onPress={signInWithEmail} />
            </View>
            <View style={styles.verticallySpaced}>
                <Button title="Sign up" disabled={loading} onPress={signUpWithEmail} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 40, padding: 12 },
    verticallySpaced: { paddingTop: 4, paddingBottom: 4, alignSelf: 'stretch' },
    mt20: { marginTop: 20 },
});
