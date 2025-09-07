import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Button, Input } from 'react-native-elements';
import { Session } from '@supabase/supabase-js';
import { useAuth } from '../../../providers/AuthProvider';
import Avatar from '../../../components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import SocialBadge, { SocialBadgeList } from '../../../components/SocialBadge';
import { AddLinkButtons } from '../../../components/AddLinkButton';
import { extractAllSocialMediaLinks, SocialMediaInfo } from '../../../utils/socialMediaDetector';
import CustomAlert from '../../../components/CustomAlert';
import { useCustomAlert } from '../../../hooks/useCustomAlert';

export default function ProfileScreen() {
  const { session } = useAuth();
  const { alertState, showSuccess, showError, showConfirm, hideAlert } = useCustomAlert();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullname] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialMediaInfo[]>([]);
  const [websiteInput, setWebsiteInput] = useState('');

  useEffect(() => {
    if (session) getProfile();
  }, [session]);

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

  // Debug logging
  console.log('🔍 Profile: Render state:', {
    loading,
    session: session?.user?.id,
    fullName,
    website,
    bio,
    avatarUrl,
    socialLinks: socialLinks.length
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
      <ScrollView style={styles.container}>
        <View style={{ alignItems: 'center' }}>
          <Avatar
            size={200}
            url={avatarUrl}
            onUpload={(url: string) => {
              setAvatarUrl(url);
              updateProfile({
                website,
                avatar_url: url,
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
        <Input label="Email" value={session?.user?.email} disabled />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Full name"
          value={fullName || ''}
          onChangeText={(text) => setFullname(text)}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Add Social Links"
          value={websiteInput}
          onChangeText={(text) => setWebsiteInput(text)}
          placeholder="Paste a social media link here..."
        />
        {/* Add buttons for detected social links */}
        <AddLinkButtons
          detectedLinks={extractAllSocialMediaLinks(websiteInput)}
          existingLinks={socialLinks}
          onAdd={handleAddSocialLink}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Bio"
          value={bio || ''}
          onChangeText={(text) => setBio(text)}
          multiline
          numberOfLines={4}
          placeholder="Tell us about yourself..."
          inputStyle={styles.bioInput}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={loading ? 'Updating Profile...' : 'Update'}
          onPress={() =>
            updateProfile({
              website,
              avatar_url: avatarUrl,
              full_name: fullName,
              bio,
            })
          }
          disabled={loading}
        />
      </View>

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
});
