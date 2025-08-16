import React, { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { StyleSheet, View, Alert, ScrollView } from 'react-native'
import { Button, Input } from '@rneui/themed'
import { Session } from '@supabase/supabase-js'
import { useAuth } from '../../../providers/AuthProvider'
import Avatar from '../../../components/Avatar'
import { useChatContext } from 'stream-chat-expo'
import { Stack, router } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'

export default function ProfileScreen() {
    const { session } = useAuth();
    const { client } = useChatContext();

    const [loading, setLoading] = useState(true)
    const [fullname, setFullname] = useState('')
    const [website, setWebsite] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')

    useEffect(() => {
        if (session) {
            getProfile()
            testDatabaseConnection()
        }
    }, [session]);

    async function testDatabaseConnection() {
        try {
            console.log('Testing database connection...')

            // First, let's see what the current profile looks like
            if (session?.user) {
                const { data: currentProfile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()

                if (profileError) {
                    console.error('Error fetching current profile:', profileError)
                } else {
                    console.log('Current profile structure:', currentProfile)
                    console.log('Available fields:', Object.keys(currentProfile))
                }
            }

            // Test basic table access
            const { data, error } = await supabase
                .from('profiles')
                .select('count')
                .limit(1)

            if (error) {
                console.error('Database connection test failed:', error)
            } else {
                console.log('Database connection test successful')
            }

            // Test if we can perform updates (this will help identify RLS issues)
            if (session?.user) {
                console.log('Testing update permissions...')
                // Use a timestamp-based unique test value to avoid conflicts
                const testFullname = `test_update_${Date.now()}`

                const { error: updateTestError } = await supabase
                    .from('profiles')
                    .update({ full_name: testFullname })
                    .eq('id', session.user.id)

                if (updateTestError) {
                    console.error('Update permission test failed:', updateTestError)
                } else {
                    console.log('Update permission test successful')
                    // Revert the test change back to the original fullname
                    await supabase
                        .from('profiles')
                        .update({ full_name: fullname || '' })
                        .eq('id', session.user.id)
                }
            }
        } catch (error) {
            console.error('Database connection test error:', error)
        }
    }

    async function getProfile() {
        try {
            setLoading(true)
            if (!session?.user) throw new Error('No user on the session!')

            const { data, error, status } = await supabase
                .from('profiles')
                .select(`website, avatar_url, full_name`)
                .eq('id', session?.user.id)
                .single()
            if (error && status !== 406) {
                throw error
            }

            if (data) {
                setWebsite(data.website)
                setAvatarUrl(data.avatar_url)
                setFullname(data.full_name)
            }
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert(error.message)
            }
        } finally {
            setLoading(false)
        }
    }

    async function updateProfile({
        website,
        avatar_url,
        full_name,
    }: {
        website: string
        avatar_url: string
        full_name: string
    }) {
        try {
            setLoading(true)
            if (!session?.user) throw new Error('No user on the session!')

            console.log('Session user ID:', session.user.id)
            console.log('Supabase client configured:', !!supabase)

            // Create updates object without updated_at field to avoid schema issues
            const updates = {
                website,
                avatar_url,
                full_name,
            }

            console.log('Attempting to update profile with:', updates)

            // Try update first, then upsert if that fails
            let { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', session.user.id)

            if (error) {
                console.log('Update failed, trying upsert:', error)
                // If update fails, try upsert
                const upsertData = { ...updates, id: session.user.id }
                const result = await supabase.from('profiles').upsert(upsertData)
                data = result.data
                error = result.error
            }

            if (error) {
                console.error('Supabase update error:', error)
                throw error
            }

            console.log('Profile updated successfully:', data)

            // Refresh the profile data after update
            await getProfile()

        } catch (error) {
            console.error('Profile update failed:', error)
            if (error instanceof Error) {
                Alert.alert('Update failed', error.message)
            } else {
                Alert.alert('Update failed', 'An unknown error occurred')
            }
        } finally {
            setLoading(false)
        }
    }

    async function handleSignOut() {
        try {
            // First disconnect from Stream Chat
            if (client) {
                await client.disconnectUser();
            }
            // Then sign out from Supabase
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error during sign out:', error);
            // Still try to sign out from Supabase even if Stream Chat disconnection fails
            await supabase.auth.signOut();
        }
    }

    return (
        <>
            <Stack.Screen options={{
                headerLeft: () => (
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color="gray"
                        style={{ marginHorizontal: 15 }}
                        onPress={() => router.back()}
                    />
                ),
                title: 'Profile'
            }} />

            <ScrollView style={styles.container}>

                {/* Profile Pic */}
                <View style={{ alignItems: 'center' }}>
                    <Avatar
                        size={200}
                        url={avatarUrl}
                        onUpload={(url: string) => {
                            setAvatarUrl(url)
                            updateProfile({ website, avatar_url: url, full_name: fullname })
                        }}
                    />
                </View>

                <View style={[styles.verticallySpaced, styles.mt20]}>
                    <Input label="Email" value={session?.user?.email} disabled />
                </View>
                <View style={styles.verticallySpaced}>
                    <Input label="Full name" value={fullname || ''} onChangeText={(text) => setFullname(text)} />
                </View>
                <View style={styles.verticallySpaced}>
                    <Input label="Website" value={website || ''} onChangeText={(text) => setWebsite(text)} />
                </View>

                <View style={[styles.verticallySpaced, styles.mt20]}>
                    <Button
                        title={loading ? 'Loading ...' : 'Update'}
                        onPress={() => updateProfile({ website, avatar_url: avatarUrl, full_name: fullname })}
                        disabled={loading}
                    />
                </View>

                <View style={styles.verticallySpaced}>
                    <Button title="Sign Out" onPress={handleSignOut} />
                </View>
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        padding: 12,
    },
    verticallySpaced: {
        paddingTop: 4,
        paddingBottom: 4,
        alignSelf: 'stretch',
    },
    mt20: {
        marginTop: 20,
    },
})