import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, StatusBar } from 'react-native';
import { Button, Input } from 'react-native-elements';
import { Session } from '@supabase/supabase-js';
import { useAuth } from '../../../providers/AuthProvider';
import Avatar from '../../../components/Avatar';
import ProfileImage from '../../../components/ProfileImage';
import { Ionicons } from '@expo/vector-icons';
import SocialBadge, { SocialBadgeList } from '../../../components/SocialBadge';
import { AddLinkButtons } from '../../../components/AddLinkButton';
import { extractAllSocialMediaLinks, SocialMediaInfo } from '../../../utils/socialMediaDetector';
import CustomAlert from '../../../components/CustomAlert';
import { useCustomAlert } from '../../../hooks/useCustomAlert';
import { themes } from '../../../constants/themes';
import { useChatContext } from 'stream-chat-expo';
import { router } from 'expo-router';
import CacheManagement from '../../../components/CacheManagement';

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

      const updates = {
        id: session?.user.id,
        website,
        avatar_url,
        full_name,
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!session?.user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>No user session found. Please log in.</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor={themes.colors.background} barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={{ alignItems: 'center' }}>
          <Avatar
            size={200}
            url={avatarUrl}
            userId={session?.user?.id}
            onUpload={(url: string) => {
              setAvatarUrl(url);
              updateProfile({
                website,
                avatar_url: url,
                full_name: fullName,
                bio,
              });
            }}
            onDelete={() => {
              setAvatarUrl('');
              updateProfile({
                website,
                avatar_url: '',
                full_name: fullName,
                bio,
              });
            }}
          />
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

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Full name"
          value={fullName || ''}
          onChangeText={(text) => {
            setFullname(text);
            updateProfile({
              website,
              avatar_url: avatarUrl,
              full_name: text,
              bio,
            });
          }}
          inputStyle={styles.inputText}
          labelStyle={styles.labelText}
        />
      </View>
      <View style={styles.verticallySpaced}>
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
          inputStyle={styles.inputText}
          labelStyle={styles.labelText}
          placeholderTextColor="#CCCCCC"
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input 
          label="Email" 
          value={session?.user?.email} 
          disabled 
          inputStyle={styles.inputText}
          labelStyle={styles.labelText}
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
            <Ionicons name="ban-outline" size={22} color={themes.colors.text} />
            <Text style={styles.blockedUsersTitle}>Blocked Users</Text>
            <Text style={styles.blockedUsersCount}>{blockedUsers.length}</Text>
          </View>
          <Ionicons name="refresh" size={18} color={themes.colors.textSecondary} />
        </TouchableOpacity>
        
        {!client?.wsConnection ? (
          <View style={styles.connectionErrorContainer}>
            <Ionicons name="wifi-outline" size={20} color="#FF9500" />
            <Text style={styles.connectionErrorText}>
              Chat service unavailable. Blocked users cannot be loaded.
            </Text>
          </View>
        ) : blockedUsersLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading blocked users...</Text>
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
          <Ionicons name="log-out-outline" size={25} color="#fff" style={styles.signOutIcon} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

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
    backgroundColor: themes.colors.background,
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
    backgroundColor: '#ff4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#ff4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#ff3333',
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bioInput: {
    textAlignVertical: 'top',
    minHeight: 80,
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
  inputText: {
    color: themes.colors.text,
  },
  labelText: {
    color: themes.colors.text,
  },
  blockedUsersContainer: {
    backgroundColor: 'rgb(159, 15, 116)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
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
    borderBottomColor: 'rgba(255, 255, 255, 1)',
  },
  blockedUsersHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedUsersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themes.colors.text,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  blockedUsersCount: {
    fontSize: 14,
    color: themes.colors.textSecondary,
    marginLeft: 8,
    backgroundColor: 'rgb(98, 19, 86)',
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
    color: themes.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  blockedUsersList: {
    gap: 12,
  },
  blockedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgb(144, 7, 100)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
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
    color: themes.colors.text,
    marginBottom: 4,
  },
  blockedUserDate: {
    fontSize: 12,
    color: themes.colors.textSecondary,
    opacity: 0.8,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 1)',
    shadowColor: '#34C759',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
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
    color: themes.colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    opacity: 0.8,
    paddingVertical: 8,
  },
  noBlockedUsersContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noBlockedUsers: {
    fontSize: 16,
    color: themes.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  noBlockedUsersSubtext: {
    fontSize: 13,
    color: themes.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
  },
  connectionErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.2)',
  },
  connectionErrorText: {
    fontSize: 13,
    color: '#FF9500',
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
});
