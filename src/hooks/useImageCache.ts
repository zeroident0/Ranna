import { useState, useEffect } from 'react';
import ImageCacheService from '../services/ImageCacheService';

interface CacheStats {
  count: number;
  totalSize: number;
}

export const useImageCache = () => {
  const [cacheStats, setCacheStats] = useState<CacheStats>({ count: 0, totalSize: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const cacheService = ImageCacheService.getInstance();

  const refreshStats = async () => {
    try {
      setIsLoading(true);
      const stats = await cacheService.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Error getting cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllCache = async () => {
    try {
      setIsLoading(true);
      await cacheService.clearAllCache();
      await refreshStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const invalidateUserCache = async (userId: string) => {
    try {
      await cacheService.invalidateUserCache(userId);
      await refreshStats();
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  return {
    cacheStats,
    isLoading,
    refreshStats,
    clearAllCache,
    invalidateUserCache,
  };
};
