import { router } from 'expo-router';
import { ChannelList } from 'stream-chat-expo';
import { useAuth } from '../../../providers/AuthProvider';
import { useNetwork } from '../../../providers/NetworkProvider';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NewChatButton from '../../../components/NewChatButton';
import ChannelListItem from '../../../components/ChannelListItem';
import UserListItem from '../../../components/UserListItem';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { useChatContext } from 'stream-chat-expo';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Channel as ChannelType } from 'stream-chat';

export default function MainTabScreen() {
  const { user } = useAuth();
  const { client } = useChatContext();
  const { isOnline } = useNetwork();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'users'>('chats');
  // Note: channelListError removed - built-in ChannelList handles errors automatically
  const [channelFilter, setChannelFilter] = useState<'all' | 'chats' | 'groups'>('all');
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Helper function to determine if a channel is a group chat
  const isGroupChat = (channel: ChannelType) => {
    // Groups are identified by having a name OR being of type 'group' OR having is_permanent_group flag
    // 1-on-1 chats don't have names and use 'messaging' type
    return channel.type === 'group' || !!channel.data?.name || !!channel.data?.is_permanent_group;
  };

  // Helper function to determine if a channel is a direct chat
  const isDirectChat = (channel: ChannelType) => {
    // Direct chats are of type 'messaging' and don't have names
    return channel.type === 'messaging' && !channel.data?.name;
  };

  // Create filter based on channel type selection - memoized to prevent unnecessary recalculations
  const channelFilterValue = useMemo(() => {
    // For now, use a simple filter and handle left groups in the component
    // Stream Chat's filter API has limitations with complex queries
    const baseFilter = {
      members: { $in: [user?.id] },
    };

    switch (channelFilter) {
      case 'chats':
        // Direct chats: channels of type 'messaging' without names (1-on-1 chats)
        return {
          ...baseFilter,
          type: 'messaging',
          name: { $exists: false }
        };
      case 'groups':
        // Group chats: channels with names (groups have names)
        return {
          ...baseFilter,
          name: { $exists: true }
        };
      case 'all':
      default:
        // All channels: just filter by membership
        return baseFilter;
    }
  }, [user?.id, channelFilter]);
  
  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }


  // Note: refreshChannelList removed - built-in ChannelList handles this automatically

  // Fetch pending invite count
  const fetchPendingInviteCount = async () => {
    try {
      const channels = await client.queryChannels({
        invite: 'pending',
      });
      setPendingInviteCount(channels.length);
    } catch (error) {
      console.error('Error fetching pending invite count:', error);
    }
  };

  // Search function
  const performSearch = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (!isOnline) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    console.log('Searching for:', query, 'in', activeTab);
    setIsSearching(true);
    const results: any[] = [];

    try {
      if (activeTab === 'chats') {
        // Search messages in each channel individually
        const allChannels = await client.queryChannels({
          members: { $in: [user.id] },
        });
        
        console.log('Found', allChannels.length, 'total channels');
        
        const channelsWithMatchingMessages = [];
        
        for (const channel of allChannels) {
          try {
            console.log(`Searching in channel: ${channel.data?.name || 'No name'}`);
            
            // Get recent messages from this channel
            const messages = await channel.query({
              messages: { limit: 100 }
            });
            
            console.log(`Channel has ${messages.messages.length} messages`);
            
            // Search through message text
            const matchingMessages = messages.messages.filter(message => {
              const text = message.text || '';
              return text.toLowerCase().includes(query.toLowerCase());
            });
            
            console.log(`Found ${matchingMessages.length} matching messages in this channel`);
            
             if (matchingMessages.length > 0) {
               channelsWithMatchingMessages.push({
                 channel: channel,
                 matchingMessages: matchingMessages
               });
             }
            
          } catch (error) {
            console.log(`Error searching messages in channel ${channel.data?.name || 'No name'}:`, error);
          }
        }
        
        console.log('Found', channelsWithMatchingMessages.length, 'channels with matching messages');
        results.push(...channelsWithMatchingMessages);
      } else {
        // Search users
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .ilike('full_name', `%${query}%`);

        console.log('User search results:', profiles?.length || 0, 'users');
        if (profiles && !error) {
          results.push(...profiles);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    }

    console.log('Final search results:', results.length, 'items');
    setSearchResults(results);
    setIsSearching(false);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTab]);

  // Fetch invite count on mount and focus
  useEffect(() => {
    fetchPendingInviteCount();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPendingInviteCount();
    }, [])
  );

  // Clear search when search is closed
  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };


  // Note: Network and focus handling removed - built-in ChannelList handles this automatically

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: showSearch ? '' : 'Chats',
          headerLeft: undefined,
          headerRight: showSearch ? () => (
            <TouchableOpacity
              onPress={handleCloseSearch}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#FF3B30" />
            </TouchableOpacity>
          ) : () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => setShowFilters(!showFilters)}
                style={styles.filterButton}
              >
                <Ionicons 
                  name={showFilters ? "filter" : "filter-outline"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(home)/invites')}
                style={styles.inviteButton}
              >
                <Ionicons name="mail" size={24} color="#FFFFFF" />
                {pendingInviteCount > 0 && (
                  <View style={styles.inviteBadge}>
                    <Text style={styles.inviteBadgeText}>
                      {pendingInviteCount > 99 ? '99+' : pendingInviteCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSearch(true)}
                style={styles.searchButton}
              >
                <Ionicons name="search" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      
      {/* Filter Tabs */}
      {!showSearch && showFilters && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, channelFilter === 'all' && styles.activeFilterTab]}
            onPress={() => setChannelFilter('all')}
          >
            <Text style={[styles.filterTabText, channelFilter === 'all' && styles.activeFilterTabText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, channelFilter === 'chats' && styles.activeFilterTab]}
            onPress={() => setChannelFilter('chats')}
          >
            <Text style={[styles.filterTabText, channelFilter === 'chats' && styles.activeFilterTabText]}>
              Chats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, channelFilter === 'groups' && styles.activeFilterTab]}
            onPress={() => setChannelFilter('groups')}
          >
            <Text style={[styles.filterTabText, channelFilter === 'groups' && styles.activeFilterTabText]}>
              Groups
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Use Stream Chat's built-in ChannelList */}
      {!showSearch && (
        <View style={[styles.channelListContainer, showSearch && styles.channelListWithSearch]}>
          <ChannelList
            filters={channelFilterValue}
            sort={{ updated_at: -1 }}
            options={{ limit: 20 }}
            onSelect={(channel) => {
              router.push({
                pathname: `/(home)/channel/${channel.cid}`,
                params: { 
                  channelData: JSON.stringify({
                    cid: channel.cid,
                    data: channel.data,
                    state: {
                      members: channel.state.members,
                      messages: channel.state.messages
                    }
                  })
                }
              });
            }}
            Preview={ChannelListItem}
            EmptyStateIndicator={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  {channelFilter === 'all' ? 'No conversations yet' : 
                   channelFilter === 'chats' ? 'No direct chats' : 'No group chats'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {channelFilter === 'all' ? 'Start a new conversation to get started' :
                   channelFilter === 'chats' ? 'Start a direct message with someone' : 'Create or join a group chat'}
                </Text>
              </View>
            )}
            LoadingIndicator={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading conversations...</Text>
              </View>
            )}
          />
        </View>
      )}
      <NewChatButton />

      {/* Search Overlay - Only shown when search is active */}
      {showSearch && (
        <View style={[styles.searchOverlay, !searchQuery.trim() && styles.searchOverlayTransparent]}>
          <SafeAreaView style={[styles.searchContainer, !searchQuery.trim() && styles.searchContainerTransparent]} edges={['bottom']}>
            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${activeTab}...`}
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
                onPress={() => setActiveTab('chats')}
              >
                <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
                  Chats
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                onPress={() => setActiveTab('users')}
              >
                <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
                  Users
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Results - Only show when there's a query */}
            {searchQuery.trim() && (
              <>
                {isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Searching...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                     renderItem={({ item }) => 
                       activeTab === 'chats' ? 
                         <ChannelListItem 
                           channel={item.channel} 
                           matchingMessages={item.matchingMessages}
                           searchQuery={searchQuery}
                           isSearchResult={true}
                         /> : 
                         <UserListItem user={item} />
                     }
                    keyExtractor={(item, index) => `${activeTab}-${index}`}
                    contentContainerStyle={styles.resultsContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="search" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No {activeTab} found</Text>
                        <Text style={styles.emptySubtext}>Try a different search term</Text>
                      </View>
                    )}
                  />
                )}
              </>
            )}
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    padding: 8,
    marginRight: 4,
  },
  searchButton: {
    padding: 8,
    marginRight: 8,
  },
  inviteButton: {
    padding: 8,
    marginRight: 4,
    position: 'relative',
  },
  inviteBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  inviteBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  channelListContainer: {
    flex: 1,
  },
  channelListWithSearch: {
    paddingTop: 145, // Space for search input + tab selector
  },
  channelListContent: {
    flexGrow: 1,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    zIndex: 1000,
  },
  searchOverlayTransparent: {
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainerTransparent: {
    backgroundColor: 'transparent',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  resultsContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterTabText: {
    color: 'white',
  },
});
