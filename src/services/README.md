# Image Caching Service

This service provides intelligent caching for user profile pictures to improve app performance and reduce bandwidth usage.

## Features

- **Automatic Caching**: Profile pictures are automatically cached after first download
- **Smart Invalidation**: Cache is automatically invalidated when users update or delete their profile pictures
- **Size Management**: Automatic cleanup of old cache entries to prevent storage bloat
- **Expiration**: Cached images expire after 7 days to ensure freshness
- **Fallback Support**: Graceful fallback to direct download if caching fails

## Usage

### Basic Usage

The `ProfileImage` component automatically uses caching when a `userId` is provided:

```tsx
<ProfileImage
  avatarUrl={user.avatar_url}
  fullName={user.full_name}
  userId={user.id} // This enables caching
  size={48}
/>
```

### Cache Management

Use the `useImageCache` hook for cache management:

```tsx
import { useImageCache } from '../hooks/useImageCache';

const { cacheStats, clearAllCache, invalidateUserCache } = useImageCache();

// Get cache statistics
console.log(`Cached images: ${cacheStats.count}`);
console.log(`Storage used: ${cacheStats.totalSize} bytes`);

// Clear all cache
await clearAllCache();

// Invalidate specific user's cache
await invalidateUserCache(userId);
```

### Cache Management Component

The `CacheManagement` component provides a UI for users to manage their cache:

```tsx
import CacheManagement from '../components/CacheManagement';

<CacheManagement />
```

## Configuration

The service can be configured by modifying constants in `ImageCacheService.ts`:

- `MAX_CACHE_SIZE`: Maximum number of cached images (default: 50)
- `CACHE_EXPIRY`: Cache expiration time in milliseconds (default: 7 days)

## How It Works

1. **First Load**: When a profile picture is requested for the first time, it's downloaded from Supabase storage and cached
2. **Subsequent Loads**: Cached images are served instantly from local storage
3. **Cache Validation**: Before serving cached images, the service checks if the image path has changed (indicating the user updated their picture)
4. **Automatic Cleanup**: Old cache entries are automatically removed when the cache size limit is reached
5. **Cache Invalidation**: When users upload or delete their profile pictures, their cache is immediately invalidated

## Benefits

- **Faster Loading**: Cached images load instantly
- **Reduced Bandwidth**: Images are only downloaded once
- **Better UX**: No loading spinners for previously viewed profile pictures
- **Storage Efficient**: Automatic cleanup prevents storage bloat
- **Always Fresh**: Cache invalidation ensures users see updated profile pictures
