import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SocialMediaInfo } from '../utils/socialMediaDetector';

interface AddLinkButtonProps {
  socialInfo: SocialMediaInfo;
  onAdd: (socialInfo: SocialMediaInfo) => void;
  disabled?: boolean;
}

export default function AddLinkButton({ socialInfo, onAdd, disabled = false }: AddLinkButtonProps) {
  const handlePress = () => {
    if (!disabled) {
      onAdd(socialInfo);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.addButton,
        { backgroundColor: socialInfo.color },
        disabled && styles.disabledButton
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Ionicons 
        name="add" 
        size={16} 
        color="#FFFFFF" 
        style={styles.addIcon}
      />
      <Ionicons 
        name={socialInfo.icon as any} 
        size={18} 
        color="#FFFFFF" 
        style={styles.platformIcon}
      />
      <Text style={styles.addText}>
        Add {socialInfo.platform.charAt(0).toUpperCase() + socialInfo.platform.slice(1)} Link
      </Text>
    </TouchableOpacity>
  );
}

interface AddLinkButtonsProps {
  detectedLinks: SocialMediaInfo[];
  existingLinks: SocialMediaInfo[];
  onAdd: (socialInfo: SocialMediaInfo) => void;
}

export function AddLinkButtons({ detectedLinks, existingLinks, onAdd }: AddLinkButtonsProps) {
  if (!detectedLinks || detectedLinks.length === 0) {
    return null;
  }

  // Filter out links that are already added
  const existingUrls = existingLinks.map(link => link.url.toLowerCase());
  const newLinks = detectedLinks.filter(link => 
    !existingUrls.includes(link.url.toLowerCase())
  );

  if (newLinks.length === 0) {
    return null;
  }

  return (
    <View style={styles.buttonsContainer}>
      <Text style={styles.buttonsLabel}>Detected Links:</Text>
      <View style={styles.buttonsList}>
        {newLinks.map((socialInfo, index) => (
          <AddLinkButton
            key={`${socialInfo.platform}-${index}`}
            socialInfo={socialInfo}
            onAdd={onAdd}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  disabledButton: {
    opacity: 0.5,
  },
  addIcon: {
    marginRight: 4,
  },
  platformIcon: {
    marginRight: 6,
  },
  addText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  buttonsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5F6368',
    marginBottom: 8,
  },
  buttonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
