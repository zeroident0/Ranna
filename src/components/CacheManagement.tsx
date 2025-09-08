import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useImageCache } from '../hooks/useImageCache';

interface CacheManagementProps {
  style?: any;
}

export default function CacheManagement({ style }: CacheManagementProps) {
  const { cacheStats, isLoading, clearAllCache } = useImageCache();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Image Cache',
      `This will remove ${cacheStats.count} cached profile pictures (${formatBytes(cacheStats.totalSize)}). This will free up storage space but profile pictures will need to be downloaded again.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: clearAllCache,
        },
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Ionicons name="images-outline" size={20} color="#666" />
        <Text style={styles.title}>Image Cache</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{cacheStats.count}</Text>
          <Text style={styles.statLabel}>Cached Images</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatBytes(cacheStats.totalSize)}</Text>
          <Text style={styles.statLabel}>Storage Used</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.clearButton, isLoading && styles.clearButtonDisabled]}
        onPress={handleClearCache}
        disabled={isLoading || cacheStats.count === 0}
      >
        <Ionicons 
          name={isLoading ? "hourglass-outline" : "trash-outline"} 
          size={16} 
          color={isLoading || cacheStats.count === 0 ? "#999" : "#FF4444"} 
        />
        <Text style={[
          styles.clearButtonText,
          (isLoading || cacheStats.count === 0) && styles.clearButtonTextDisabled
        ]}>
          {isLoading ? 'Clearing...' : 'Clear Cache'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  clearButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E5E5',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
    marginLeft: 6,
  },
  clearButtonTextDisabled: {
    color: '#999',
  },
});
