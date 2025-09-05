import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SocialMediaInfo } from '../utils/socialMediaDetector';

interface SocialBadgeProps {
  socialInfo: SocialMediaInfo;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onPress?: () => void;
}

export default function SocialBadge({ 
  socialInfo, 
  size = 'medium', 
  showLabel = true,
  onPress 
}: SocialBadgeProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      Linking.openURL(socialInfo.url).catch(err => 
        console.error('Failed to open URL:', err)
      );
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { iconSize: 16, padding: 6, fontSize: 10 };
      case 'large':
        return { iconSize: 24, padding: 12, fontSize: 14 };
      default:
        return { iconSize: 20, padding: 8, fontSize: 12 };
    }
  };

  const { iconSize, padding, fontSize } = getSizeConfig();

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        {
          backgroundColor: socialInfo.color,
          paddingHorizontal: padding,
          paddingVertical: padding,
        }
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Ionicons 
        name={socialInfo.icon as any} 
        size={iconSize} 
        color="#FFFFFF" 
        style={styles.icon}
      />
      {showLabel && (
        <Text style={[styles.label, { fontSize }]}>
          {socialInfo.platform.charAt(0).toUpperCase() + socialInfo.platform.slice(1)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

interface SocialBadgeListProps {
  socialLinks: SocialMediaInfo[];
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  maxItems?: number;
}

export function SocialBadgeList({ 
  socialLinks, 
  size = 'medium', 
  showLabel = true,
  maxItems = 5 
}: SocialBadgeListProps) {
  if (!socialLinks || socialLinks.length === 0) {
    return null;
  }

  const displayLinks = socialLinks.slice(0, maxItems);

  return (
    <View style={styles.badgeList}>
      {displayLinks.map((socialInfo, index) => (
        <SocialBadge
          key={`${socialInfo.platform}-${index}`}
          socialInfo={socialInfo}
          size={size}
          showLabel={showLabel}
        />
      ))}
      {socialLinks.length > maxItems && (
        <View style={[styles.badge, styles.moreBadge]}>
          <Text style={styles.moreText}>+{socialLinks.length - maxItems}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  moreBadge: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  moreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
