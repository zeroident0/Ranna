import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Button, Input } from 'react-native-elements';
import { Session } from '@supabase/supabase-js';
import { useAuth } from '../../../providers/AuthProvider';
import ProfileImage from '../../../components/ProfileImage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ImageCacheService from '../../../services/ImageCacheService';
import SocialBadge, { SocialBadgeList } from '../../../components/SocialBadge';
import { AddLinkButtons } from '../../../components/AddLinkButton';
import { extractAllSocialMediaLinks, SocialMediaInfo } from '../../../utils/socialMediaDetector';
import CustomAlert from '../../../components/CustomAlert';
import { useCustomAlert } from '../../../hooks/useCustomAlert';
import { themes } from '../../../constants/themes';
import { useChatContext } from 'stream-chat-expo';
import { router } from 'expo-router';
import CacheManagement from '../../../components/CacheManagement';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { session } = useAuth();
  const { alertState, showSuccess, showError, showConfirm, hideAlert } = useCustomAlert();
  const { client } = useChatContext();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullname] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialMediaInfo[]>([]);
  const [websiteInput, setWebsiteInput] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (session) {
      getProfile();
    }
  }, [session]);

  // Separate useEffect for blocked users that depends on client availability
  useEffect(() => {
    if (client && client.userID && client.wsConnection && session) {
      // Add a small delay to ensure client is fully ready
      const timer = setTimeout(() => {
        fetchBlockedUsers();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [client?.userID, client?.wsConnection, session]);

  // Update social links when website or bio changes
  useEffect(() => {
    const allText = `${website || ''} ${bio || ''}`;
    const detectedLinks = extractAllSocialMediaLinks(allText);
    setSocialLinks(detectedLinks);
  }, [website, bio]);

  // Initialize websiteInput when website changes from database
  useEffect(() => {
    if (website && !websiteInput) {
      setWebsiteInput(website);
    }
  }, [website]);

  async function getProfile() {
    try {
      setLoading(true);
      console.log('🔍 Profile: Getting profile for user:', session?.user?.id);
      
      if (!session?.user) {
        console.log('❌ Profile: No user session found');
        throw new Error('No user on the session!');
      }

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`website, avatar_url, full_name`)
        .eq('id', session?.user.id)
        .single();
      
      console.log('🔍 Profile: Database query result:', { data, error, status });
      
      if (error && status !== 406) {
        console.log('❌ Profile: Database error:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Profile: Setting profile data:', data);
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url || '');
        setFullname(data.full_name || '');
        setBio(''); // Bio field doesn't exist in database yet
        
        // Extract social media links from website only (bio not available yet)
        const allText = `${data.website || ''}`;
        const detectedLinks = extractAllSocialMediaLinks(allText);
        setSocialLinks(detectedLinks);
      } else {
        console.log('⚠️ Profile: No data returned from database');
      }
    } catch (error) {
      console.log('❌ Profile: Error in getProfile:', error);
      if (error instanceof Error) {
        showError('Error', `Failed to load profile: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile({
    website,
    avatar_url,
    full_name,
    bio,
  }: {
    website: string;
    avatar_url: string;
    full_name: string;
    bio: string;
  }) {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      // Validate full name is not empty
      if (!full_name || full_name.trim().length === 0) {
        showError('Validation Error', 'Full name cannot be empty');
        return;
      }

      const updates = {
        id: session?.user.id,
        website,
        avatar_url,
        full_name: full_name.trim(),
        // bio, // Commented out until migration is applied
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      
      // Show success message
      showSuccess('Success', 'Profile updated successfully!');
    } catch (error) {
      if (error instanceof Error) {
        showError('Error', `Failed to update profile: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleAddSocialLink = (newLink: SocialMediaInfo) => {
    // Add the new link to the list
    const updatedLinks = [...socialLinks, newLink];
    setSocialLinks(updatedLinks);
    
    // Update the website field with all links
    const allLinks = updatedLinks.map(link => link.url).join(' ');
    setWebsite(allLinks);
    
    // Clear the input
    setWebsiteInput('');
  };

  const handleRemoveSocialLink = (linkToRemove: SocialMediaInfo) => {
    const updatedLinks = socialLinks.filter(link => link.url !== linkToRemove.url);
    setSocialLinks(updatedLinks);
    
    // Update the website field with remaining links
    const allLinks = updatedLinks.map(link => link.url).join(' ');
    setWebsite(allLinks);
  };

  const handleSignOut = () => {
    showConfirm(
      'Sign Out',
      'Are you sure you want to sign out?',
      () => supabase.auth.signOut(),
      undefined,
      'Sign Out',
      'Cancel'
    );
  };

  async function fetchBlockedUsers() {
    if (!client) {
      console.log('❌ Profile: No client available for fetching blocked users');
      return;
    }
    
    // Check if client is connected
    if (!client.userID) {
      console.log('❌ Profile: Client not connected yet, userID:', client.userID);
      return;
    }
    
    // Check if client is actually connected to Stream Chat
    if (!client.userID || !client.wsConnection) {
      console.log('❌ Profile: Client not connected to Stream Chat');
      return;
    }
    
    try {
      setBlockedUsersLoading(true);
      const response = await client.getBlockedUsers();
      
      // Extract blocks from response
      const blocks = (response as any).blocks || [];
      setBlockedUsers(blocks);
      console.log('✅ Profile: Loaded', blocks.length, 'blocked users');
    } catch (error) {
      console.log('❌ Profile: Error fetching blocked users:', error);
      showError('Error', 'Failed to load blocked users');
    } finally {
      setBlockedUsersLoading(false);
    }
  }

  async function handleUnblockUser(userId: string) {
    if (!client) return;
    
    showConfirm(
      'Unblock User',
      'Are you sure you want to unblock this user?',
      async () => {
        try {
          await client.unBlockUser(userId);
          setBlockedUsers(prev => prev.filter(block => block.blocked_user_id !== userId));
          showSuccess('Success', 'User has been unblocked');
        } catch (error) {
          console.log('❌ Profile: Error unblocking user:', error);
          showError('Error', 'Failed to unblock user');
        }
      },
      undefined,
      'Unblock',
      'Cancel'
    );
  }

  const handleViewBlockedUsers = () => {
    // This will show the blocked users list in a modal or navigate to a new screen
    // For now, we'll just show the list inline
  };

  async function uploadAvatar() {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        allowsEditing: true,
        quality: 1,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picker.');
        return;
      }

      const image = result.assets[0];
      console.log('Got image', image);

      if (!image.uri) {
        throw new Error('No image uri!');
      }

      const arraybuffer = await fetch(image.uri).then((res) =>
        res.arrayBuffer()
      );

      const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const path = `${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Invalidate cache for this user since they uploaded a new image
      if (session?.user?.id) {
        const cacheService = ImageCacheService.getInstance();
        await cacheService.invalidateUserCache(session.user.id);
      }

      setAvatarUrl(data.path);
      updateProfile({
        website,
        avatar_url: data.path,
        full_name: fullName,
        bio,
      });
    } catch (error) {
      if (error instanceof Error) {
        showError('Error', error.message);
      } else {
        throw error;
      }
    } finally {
      setUploading(false);
    }
  }

  async function deleteAvatar() {
    if (!avatarUrl) return;
    
    showConfirm(
      'Delete Avatar',
      'Are you sure you want to delete your avatar?',
      async () => {
        try {
          setUploading(true);
          
          // Extract the file path from the URL
          const urlParts = avatarUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          
          // Delete from storage
          const { error } = await supabase.storage
            .from('avatars')
            .remove([fileName]);
          
          if (error) {
            throw error;
          }
          
          // Invalidate cache for this user since they deleted their image
          if (session?.user?.id) {
            const cacheService = ImageCacheService.getInstance();
            await cacheService.invalidateUserCache(session.user.id);
          }
          
          setAvatarUrl('');
          updateProfile({
            website,
            avatar_url: '',
            full_name: fullName,
            bio,
          });
        } catch (error) {
          if (error instanceof Error) {
            showError('Error', error.message);
          }
        } finally {
          setUploading(false);
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  }


  // Debug logging
  console.log('🔍 Profile: Render state:', {
    loading,
    session: session?.user?.id,
    blockedUsers: blockedUsers.length,
    blockedUsersLoading,
    client: !!client
  });

  if (loading) {
    return (
      <LinearGradient
        colors={['rgb(177, 156, 217)', 'white']}
        style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <ActivityIndicator size="large" color="rgb(120, 100, 180)" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </LinearGradient>
    );
  }

  if (!session?.user) {
    return (
      <LinearGradient
        colors={['rgb(177, 156, 217)', 'white']}
        style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text>No user session found. Please log in.</Text>
      </LinearGradient>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="rgb(177, 156, 217)" barStyle="light-content" />
      <LinearGradient
        colors={['rgb(177, 156, 217)', 'white']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ alignItems: 'center' }}>
          <View style={styles.avatarContainer}>
             <ProfileImage
               avatarUrl={avatarUrl}
               fullName={fullName}
               size={200}
               showBorder={true}
               borderColor="rgb(120, 100, 180)"
               style={styles.avatar}
               userId={session?.user?.id}
             />
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={uploadAvatar}
              disabled={uploading}
            >
              <Ionicons 
                name={uploading ? "hourglass" : "camera"} 
                size={28} 
                color="#fff" 
              />
            </TouchableOpacity>
            {avatarUrl && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={deleteAvatar}
                disabled={uploading}
              >
                <Ionicons 
                  name="trash" 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* Social Media Badges */}
      {socialLinks.length > 0 && (
        <View style={[styles.verticallySpaced, styles.socialBadgesContainer]}>
          <Text style={styles.socialBadgesLabel}>Social Links</Text>
          <View style={styles.badgesWithRemove}>
            {socialLinks.map((link, index) => (
              <View key={`${link.platform}-${index}`} style={styles.badgeContainer}>
                <SocialBadge 
                  socialInfo={link}
                  size="medium" 
                  showLabel={true}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveSocialLink(link)}
                >
                  <Ionicons name="close" size={16} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.verticallySpaced, styles.mt20, styles.inputContainer]}>
         <Input
           label="Full name"
           value={fullName || ''}
           onChangeText={(text) => {
             if (text.trim().length > 0) {
               setFullname(text);
               updateProfile({
                 website,
                 avatar_url: avatarUrl,
                 full_name: text,
                 bio,
               });
             }
           }}
           inputStyle={styles.inputText}
           labelStyle={styles.labelText}
           inputContainerStyle={styles.inputContainerStyle}
           containerStyle={styles.inputWrapper}
           placeholderTextColor="#999"
           placeholder="Enter your full name"
           errorMessage={!fullName || fullName.trim().length === 0 ? "Full name is required" : ""}
         />
      </View>
      <View style={[styles.verticallySpaced, styles.inputContainer]}>
        <Input
          label="Bio"
          value={bio || ''}
          onChangeText={(text) => {
            setBio(text);
            updateProfile({
              website,
              avatar_url: avatarUrl,
              full_name: fullName,
              bio: text,
            });
          }}
          placeholder="Tell us about yourself..."
          inputStyle={[styles.inputText, styles.bioInput]}
          labelStyle={styles.labelText}
          inputContainerStyle={styles.inputContainerStyle}
          containerStyle={styles.inputWrapper}
          placeholderTextColor="#999"
          multiline={true}
          numberOfLines={3}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.inputContainer]}>
        <Input 
          label="Email" 
          value={session?.user?.email} 
          disabled 
          inputStyle={[styles.inputText, styles.disabledInput]}
          labelStyle={[styles.labelText, styles.disabledLabel]}
          inputContainerStyle={[styles.inputContainerStyle, styles.disabledInputContainer]}
          containerStyle={styles.inputWrapper}
          placeholderTextColor="#999"
        />
      </View>
      {/* <View style={styles.verticallySpaced}>
        <Input
          label="Add Social Links"
          value={websiteInput}
          onChangeText={(text) => setWebsiteInput(text)}
          placeholder="Paste a social media link here..."
        />
        {/* Add buttons for detected social links */}
        {/* <AddLinkButtons
          detectedLinks={extractAllSocialMediaLinks(websiteInput)}
          existingLinks={socialLinks}
          onAdd={handleAddSocialLink}
        />
      </View> */}

      {/* Blocked Users Section */}
      <View style={[styles.verticallySpaced, styles.blockedUsersContainer]}>
        <TouchableOpacity 
          style={styles.blockedUsersHeader}
          onPress={() => fetchBlockedUsers()}
          activeOpacity={0.7}
        >
           <View style={styles.blockedUsersHeaderLeft}>
             <Ionicons name="ban-outline" size={22} color="rgb(255, 255, 255)" />
             <Text style={styles.blockedUsersTitle}>Blocked Users</Text>
             <Text style={styles.blockedUsersCount}>{blockedUsers.length}</Text>
           </View>
           <Ionicons name="refresh" size={18} color="rgb(200, 180, 220)" />
        </TouchableOpacity>
        
         {!client?.wsConnection ? (
           <View style={styles.connectionErrorContainer}>
             <Ionicons name="wifi-outline" size={20} color="rgb(255, 255, 255)" />
             <Text style={styles.connectionErrorText}>
               Chat service unavailable. Blocked users cannot be loaded.
             </Text>
           </View>
        ) : blockedUsersLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="rgb(200, 180, 220)" />
            <Text style={[styles.loadingText, { color: 'rgb(200, 180, 220)', fontSize: 14, marginTop: 8 }]}>Loading blocked users...</Text>
          </View>
        ) : blockedUsers.length > 0 ? (
          <View style={styles.blockedUsersList}>
            {blockedUsers.slice(0, 3).map((block) => (
              <View key={block.blocked_user_id} style={styles.blockedUserItem}>
                <ProfileImage
                  avatarUrl={block.blocked_user?.image || block.blocked_user?.avatar_url}
                  fullName={block.blocked_user?.name || block.blocked_user?.full_name || block.blocked_user_id}
                  size={40}
                  style={styles.blockedUserAvatar}
                  userId={block.blocked_user_id}
                />
                <View style={styles.blockedUserInfo}>
                  <Text style={styles.blockedUserName}>
                    {block.blocked_user?.name || block.blocked_user?.full_name || block.blocked_user_id}
                  </Text>
                  <Text style={styles.blockedUserDate}>
                    Blocked {new Date(block.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.unblockButton}
                  onPress={() => handleUnblockUser(block.blocked_user_id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={styles.unblockButtonText.color} />
                  <Text style={styles.unblockButtonText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))}
            {blockedUsers.length > 3 && (
              <Text style={styles.moreBlockedUsers}>
                +{blockedUsers.length - 3} more blocked users
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.noBlockedUsersContainer}>
            <Text style={styles.noBlockedUsers}>No blocked users</Text>
            <Text style={styles.noBlockedUsersSubtext}>
              Users you block will appear here
            </Text>
          </View>
        )}
      </View>

      {/* Cache Management */}
      {/* <CacheManagement style={styles.verticallySpaced} /> */}

      <View style={[styles.verticallySpaced, styles.signOutContainer]}>
         <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
           <Ionicons name="log-out-outline" size={25} color="#ff4444" style={styles.signOutIcon} />
           <Text style={styles.signOutText}>Sign Out</Text>
         </TouchableOpacity>
      </View>
        </ScrollView>
      </LinearGradient>

    {/* Custom Alert */}
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
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    padding: 12,
    minHeight: '100%',
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  signOutContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  socialBadgesContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  socialBadgesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  badgesWithRemove: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  removeButton: {
    marginLeft: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFE6E6',
  },
  inputContainer: {
    marginHorizontal: 4,
  },
  inputWrapper: {
    paddingHorizontal: 0,
  },
  inputContainerStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(177, 156, 217, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 8,
  },
  labelText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  bioInput: {
    textAlignVertical: 'top',
    minHeight: 80,
    paddingTop: 12,
  },
  disabledInput: {
    color: '#888',
    fontSize: 16,
    fontWeight: '400',
  },
  disabledLabel: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(177, 156, 217, 0.2)',
  },
  blockedUsersContainer: {
    backgroundColor: 'rgb(120, 100, 180)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgb(100, 80, 160)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  blockedUsersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(100, 80, 160)',
  },
  blockedUsersHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedUsersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgb(255, 255, 255)',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  blockedUsersCount: {
    fontSize: 14,
    color: 'rgb(255, 255, 255)',
    marginLeft: 8,
    backgroundColor: 'rgb(80, 60, 140)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgb(120, 100, 180)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  blockedUsersList: {
    gap: 12,
  },
  blockedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgb(100, 80, 160)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgb(80, 60, 140)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  blockedUserAvatar: {
    marginRight: 12,
  },
  blockedUserInfo: {
    flex: 1,
    marginRight: 12,
  },
  blockedUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgb(255, 255, 255)',
    marginBottom: 4,
  },
  blockedUserDate: {
    fontSize: 12,
    color: 'rgb(200, 180, 220)',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgb(52, 199, 89)',
    borderWidth: 1,
    borderColor: 'rgb(40, 180, 70)',
    shadowColor: '#34C759',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  unblockButtonText: {
    fontSize: 13,
    color: 'white',
    marginLeft: 6,
    fontWeight: '600',
  },
  moreBlockedUsers: {
    fontSize: 13,
    color: 'rgb(200, 180, 220)',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  noBlockedUsersContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noBlockedUsers: {
    fontSize: 16,
    color: 'rgb(255, 255, 255)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  noBlockedUsersSubtext: {
    fontSize: 13,
    color: 'rgb(200, 180, 220)',
    textAlign: 'center',
    lineHeight: 18,
  },
  connectionErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgb(200, 100, 50)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgb(180, 80, 40)',
  },
  connectionErrorText: {
    fontSize: 13,
    color: 'rgb(255, 255, 255)',
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatar: {
    maxWidth: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgb(120, 100, 180)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: '#FF4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
