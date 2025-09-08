import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../../providers/AuthProvider';
import ProfileImage from '../../../components/ProfileImage';
import { Ionicons } from '@expo/vector-icons';
import SocialBadge from '../../../components/SocialBadge';
import { extractAllSocialMediaLinks, SocialMediaInfo } from '../../../utils/socialMediaDetector';
import CustomAlert from '../../../components/CustomAlert';
import { useCustomAlert } from '../../../hooks/useCustomAlert';
import { themes } from '../../../constants/themes';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { alertState, showError, hideAlert } = useCustomAlert();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [socialLinks, setSocialLinks] = useState<SocialMediaInfo[]>([]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  // Update social links when profile data changes
  useEffect(() => {
    if (userProfile) {
      const allText = `${userProfile.website || ''} ${userProfile.bio || ''}`;
      const detectedLinks = extractAllSocialMediaLinks(allText);
      setSocialLinks(detectedLinks);
    }
  }, [userProfile]);

  async function fetchUserProfile() {
    try {
      setLoading(true);
      console.log('🔍 UserProfile: Getting profile for user:', userId);
      
      if (!userId) {
        console.log('❌ UserProfile: No userId provided');
        throw new Error('No user ID provided!');
      }

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`website, avatar_url, full_name, bio`)
        .eq('id', userId)
        .single();
      
      console.log('🔍 UserProfile: Database query result:', { data, error, status });
      
      if (error && status !== 406) {
        console.log('❌ UserProfile: Database error:', error);
        throw error;
      }

      if (data) {
        console.log('✅ UserProfile: Setting profile data:', data);
        setUserProfile(data);
      } else {
        console.log('⚠️ UserProfile: No data returned from database');
        showError('Error', 'User profile not found');
      }
    } catch (error) {
      console.log('❌ UserProfile: Error in fetchUserProfile:', error);
      if (error instanceof Error) {
        showError('Error', `Failed to load profile: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleStartChat = async () => {
    if (!currentUser || !userId) return;
    
    try {
      // Navigate to users screen to start a chat
      // This will use the existing UserListItem component which handles chat creation
      router.push('/(home)/users');
    } catch (error) {
      console.log('Error starting chat:', error);
      showError('Error', 'Failed to start chat');
    }
  };

  // Debug logging
  console.log('🔍 UserProfile: Render state:', {
    loading,
    userId,
    userProfile,
    socialLinks: socialLinks.length
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: themes.colors.text }}>Loading profile...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: themes.colors.text }}>User profile not found.</Text>
        <TouchableOpacity 
          style={[styles.chatButton, { marginTop: themes.spacing.md }]}
          onPress={() => router.back()}
        >
          <Text style={styles.chatButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar 
        backgroundColor={themes.colors.background} 
        barStyle="light-content" 
      />
      <ScrollView style={styles.container}>
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <ProfileImage
            avatarUrl={userProfile.avatar_url}
            fullName={userProfile.full_name}
            size={200}
            showBorder={false}
          />
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.fullName}>{userProfile.full_name}</Text>
          
          {userProfile.bio && (
            <Text style={styles.bio}>{userProfile.bio}</Text>
          )}
        </View>

        {/* Social Media Badges */}
        {socialLinks.length > 0 && (
          <View style={styles.socialBadgesContainer}>
            <Text style={styles.socialBadgesLabel}>Social Links</Text>
            <View style={styles.badgesContainer}>
              {socialLinks.map((link, index) => (
                <SocialBadge 
                  key={`${link.platform}-${index}`}
                  socialInfo={link}
                  size="medium" 
                  showLabel={true}
                />
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={handleStartChat}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.chatButtonText}>Start Chat</Text>
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
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: themes.spacing.lg,
    marginTop: themes.spacing.lg,
  },
  fullName: {
    fontSize: themes.fontSize.xl,
    fontWeight: themes.fontWeight.bold,
    color: themes.colors.text,
    marginBottom: themes.spacing.sm,
  },
  bio: {
    fontSize: themes.fontSize.md,
    color: themes.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  socialBadgesContainer: {
    backgroundColor: themes.colors.card,
    borderRadius: themes.borderRadius.md,
    padding: themes.spacing.md,
    margin: themes.spacing.lg,
    borderWidth: 1,
    borderColor: themes.colors.border,
  },
  socialBadgesLabel: {
    fontSize: themes.fontSize.md,
    fontWeight: themes.fontWeight.semibold,
    color: themes.colors.text,
    marginBottom: themes.spacing.md,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  actionButtons: {
    paddingHorizontal: themes.spacing.lg,
    marginTop: themes.spacing.lg,
    marginBottom: 40,
  },
  chatButton: {
    backgroundColor: themes.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: themes.spacing.lg,
    borderRadius: themes.borderRadius.md,
    shadowColor: themes.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatButtonText: {
    color: themes.colors.text,
    fontSize: themes.fontSize.md,
    fontWeight: themes.fontWeight.semibold,
    marginLeft: themes.spacing.sm,
  },
});
