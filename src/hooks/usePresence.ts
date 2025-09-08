import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatContext } from 'stream-chat-expo';

interface PresenceData {
  [userId: string]: boolean;
}

interface PresenceRequestCache {
  [userId: string]: number; // timestamp of last request
}

export const usePresence = () => {
  const { client } = useChatContext();
  const [presenceData, setPresenceData] = useState<PresenceData>({});
  const requestCache = useRef<PresenceRequestCache>({});
  const lastUpdateTime = useRef<number>(0);

  const updatePresence = useCallback(async (userId: string) => {
    if (!client) return;

    const now = Date.now();
    const lastRequest = requestCache.current[userId];
    
    // Rate limiting: only allow one request per user every 60 seconds
    if (lastRequest && (now - lastRequest) < 60000) {
      console.log(`Rate limiting: Skipping presence update for user ${userId}`);
      return;
    }

    try {
      // Query user presence from Stream Chat
      const user = await client.queryUsers({ id: userId });
      if (user.users.length > 0) {
        const userData = user.users[0];
        let isOnline = false;
        
        console.log(`Checking presence for user ${userId}:`, {
          online: userData.online,
          last_active_at: userData.last_active_at,
          name: userData.name
        });
        
        // First try to use Stream Chat's presence API
        if (userData.online !== undefined) {
          isOnline = userData.online;
          console.log(`User ${userId} online status from presence API:`, isOnline);
        } else {
          // Fallback to last_active_at if presence is not available
          const lastActive = userData.last_active_at;
          if (lastActive && typeof lastActive === 'string') {
            const now = new Date();
            const lastActiveDate = new Date(lastActive);
            const diffInMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);
            // Consider online if last active within 5 minutes
            isOnline = diffInMinutes <= 5;
            console.log(`User ${userId} online status from last_active_at:`, isOnline, `(last active: ${diffInMinutes.toFixed(1)} minutes ago)`);
          }
        }
        
        setPresenceData(prev => ({
          ...prev,
          [userId]: isOnline
        }));

        // Update request cache
        requestCache.current[userId] = now;
      }
    } catch (error) {
      console.log('Error fetching user presence:', error);
      // Don't update presence data on error to avoid showing incorrect status
    }
  }, [client]);

  useEffect(() => {
    if (!client) return;

    // Listen for presence events
    const handlePresenceChanged = (event: any) => {
      console.log('Presence changed:', event);
      if (event.type === 'user.presence.changed') {
        setPresenceData(prev => ({
          ...prev,
          [event.user.id]: event.user.online
        }));
      }
    };

    // Listen for user presence updates
    client.on('user.presence.changed', handlePresenceChanged);

    // Set up periodic refresh of presence data (every 2 minutes instead of 30 seconds)
    const interval = setInterval(() => {
      const now = Date.now();
      // Only refresh if it's been at least 2 minutes since last update
      if (now - lastUpdateTime.current > 120000) {
        console.log('Periodic presence refresh...');
        // Refresh presence for all users we're tracking
        Object.keys(presenceData).forEach(userId => {
          updatePresence(userId);
        });
        lastUpdateTime.current = now;
      }
    }, 120000); // 2 minutes

    return () => {
      client.off('user.presence.changed', handlePresenceChanged);
      clearInterval(interval);
    };
  }, [client, updatePresence]);

  const isUserOnline = (userId: string): boolean => {
    return presenceData[userId] || false;
  };

  return {
    isUserOnline,
    updatePresence,
    presenceData
  };
};
