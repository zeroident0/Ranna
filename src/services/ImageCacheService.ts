import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface CachedImage {
  dataUrl: string;
  timestamp: number;
  path: string;
}

interface CacheMetadata {
  [userId: string]: {
    path: string;
    timestamp: number;
  };
}

class ImageCacheService {
  private static instance: ImageCacheService;
  private readonly CACHE_PREFIX = 'profile_image_cache_';
  private readonly METADATA_KEY = 'profile_image_metadata';
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached images
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  private constructor() {}

  static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  /**
   * Get cached image for a user
   */
  async getCachedImage(userId: string, currentPath: string): Promise<string | null> {
    try {
      const cacheKey = this.CACHE_PREFIX + userId;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return null;
      }

      const cached: CachedImage = JSON.parse(cachedData);
      
      // Check if the image path has changed (user updated their profile picture)
      if (cached.path !== currentPath) {
        console.log(`Profile image path changed for user ${userId}, invalidating cache`);
        await this.invalidateUserCache(userId);
        return null;
      }

      // Check if cache is expired
      const now = Date.now();
      if (now - cached.timestamp > this.CACHE_EXPIRY) {
        console.log(`Profile image cache expired for user ${userId}, removing`);
        await this.invalidateUserCache(userId);
        return null;
      }

      console.log(`Using cached profile image for user ${userId}`);
      return cached.dataUrl;
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }

  /**
   * Cache an image for a user
   */
  async cacheImage(userId: string, path: string, dataUrl: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + userId;
      const cachedImage: CachedImage = {
        dataUrl,
        timestamp: Date.now(),
        path
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedImage));
      
      // Update metadata
      await this.updateMetadata(userId, path);
      
      // Clean up old cache entries if needed
      await this.cleanupCache();
      
      console.log(`Cached profile image for user ${userId}`);
    } catch (error) {
      console.error('Error caching image:', error);
    }
  }

  /**
   * Download and cache image from Supabase storage
   */
  async downloadAndCacheImage(userId: string, path: string): Promise<string | null> {
    try {
      // First check if we have a cached version
      const cached = await this.getCachedImage(userId, path);
      if (cached) {
        return cached;
      }

      console.log(`Downloading profile image for user ${userId} from path: ${path}`);
      
      // Download from Supabase storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .download(path);

      if (error) {
        throw error;
      }

      // Convert to data URL
      const dataUrl = await this.blobToDataUrl(data);
      
      // Cache the image
      await this.cacheImage(userId, path, dataUrl);
      
      return dataUrl;
    } catch (error) {
      console.error('Error downloading and caching image:', error);
      return null;
    }
  }

  /**
   * Invalidate cache for a specific user (when they update/delete their profile picture)
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + userId;
      await AsyncStorage.removeItem(cacheKey);
      await this.removeFromMetadata(userId);
      console.log(`Invalidated cache for user ${userId}`);
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  /**
   * Clear all cached images
   */
  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      await AsyncStorage.removeItem(this.METADATA_KEY);
      console.log('Cleared all profile image cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }

      return {
        count: cacheKeys.length,
        totalSize
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { count: 0, totalSize: 0 };
    }
  }

  /**
   * Convert blob to data URL
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  /**
   * Update metadata for cache management
   */
  private async updateMetadata(userId: string, path: string): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(this.METADATA_KEY);
      const metadata: CacheMetadata = metadataStr ? JSON.parse(metadataStr) : {};
      
      metadata[userId] = {
        path,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  }

  /**
   * Remove user from metadata
   */
  private async removeFromMetadata(userId: string): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(this.METADATA_KEY);
      if (!metadataStr) return;

      const metadata: CacheMetadata = JSON.parse(metadataStr);
      delete metadata[userId];
      
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error removing from metadata:', error);
    }
  }

  /**
   * Clean up old cache entries to maintain size limit
   */
  private async cleanupCache(): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(this.METADATA_KEY);
      if (!metadataStr) return;

      const metadata: CacheMetadata = JSON.parse(metadataStr);
      const entries = Object.entries(metadata);
      
      // If we're under the limit, no cleanup needed
      if (entries.length <= this.MAX_CACHE_SIZE) {
        return;
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entries
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      
      for (const [userId] of toRemove) {
        await this.invalidateUserCache(userId);
      }

      console.log(`Cleaned up ${toRemove.length} old cache entries`);
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }
}

export default ImageCacheService;
