import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { StyleSheet, View, Alert, Image, TouchableOpacity } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Ionicons from '@expo/vector-icons/Ionicons'

interface Props {
    size: number
    url: string | null
    onUpload: (filePath: string) => void
}

export default function Avatar({ url, size = 150, onUpload }: Props) {
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const avatarSize = { height: size, width: size }

    const styles = StyleSheet.create({
        avatar: {
            borderRadius: size / 2,
            overflow: 'hidden',
            maxWidth: '100%',
        },
        image: {
            objectFit: 'cover',
            paddingTop: 0,
        },
        noImage: {
            backgroundColor: '#333',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'rgb(200, 200, 200)',
            borderRadius: size / 2,
        },
        container: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarContainer: {
            position: 'relative',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#eee',
        },
        uploadButton: {
            position: 'absolute',
            bottom: -size * 0.05,
            right: -size * 0.05,
            backgroundColor: '#007bff',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#fff',
        },
    })

    useEffect(() => {
        if (url) downloadImage(url)
    }, [url])

    async function downloadImage(path: string) {
        try {
            const { data, error } = await supabase.storage.from('avatars').download(path)

            if (error) {
                throw error
            }

            const fr = new FileReader()
            fr.readAsDataURL(data)
            fr.onload = () => {
                setAvatarUrl(fr.result as string)
            }
        } catch (error) {
            if (error instanceof Error) {
                console.log('Error downloading image: ', error.message)
            }
        }
    }

    async function uploadAvatar() {
        try {
            setUploading(true)

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // Restrict to only images
                allowsMultipleSelection: false, // Can only select one image
                allowsEditing: true, // Allows the user to crop / rotate their photo before uploading it
                quality: 1,
                exif: false, // We don't want nor need that data.
            })

            if (result.canceled || !result.assets || result.assets.length === 0) {
                console.log('User cancelled image picker.')
                return
            }

            const image = result.assets[0]
            console.log('Got image', image)

            if (!image.uri) {
                throw new Error('No image uri!') // Realistically, this should never happen, but just in case...
            }

            const arraybuffer = await fetch(image.uri).then((res) => res.arrayBuffer())

            const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg'
            const path = `${Date.now()}.${fileExt}`
            const { data, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, arraybuffer, {
                    contentType: image.mimeType ?? 'image/jpeg',
                })

            if (uploadError) {
                throw uploadError
            }

            onUpload(data.path)
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert(error.message)
            } else {
                throw error
            }
        } finally {
            setUploading(false)
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.avatarContainer}>
                {avatarUrl ? (
                    <Image
                        source={{ uri: avatarUrl }}
                        accessibilityLabel="Avatar"
                        style={[avatarSize, styles.avatar, styles.image]}
                    />
                ) : (
                    <View style={[avatarSize, styles.avatar, styles.noImage]} />
                )}

                <TouchableOpacity
                    style={[
                        styles.uploadButton,
                        {
                            width: size * 0.3,
                            height: size * 0.3,
                            borderRadius: size * 0.15,
                            bottom: -size * 0.05,
                            right: -size * 0.05
                        }
                    ]}
                    onPress={uploadAvatar}
                    disabled={uploading}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={uploading ? "hourglass-outline" : "camera"}
                        size={size * 0.15}
                        color="#fff"
                    />
                </TouchableOpacity>
            </View>
        </View>
    )
}