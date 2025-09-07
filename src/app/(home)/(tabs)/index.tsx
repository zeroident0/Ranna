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
import { useCallback, useState, useEffect } from 'react';
import { useChatContext } from 'stream-chat-expo';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { supabase } from '../../../lib/supabase';

export default function MainTabScreen() {
  const { user } = useAuth();
  const { client } = useChatContext();
  const { isOnline } = useNetwork();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'users'>('chats');
  const [channelListError, setChannelListError] = useState<string | null>(null);
  
  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }


  const refreshChannelList = async () => {
    console.log('Manually refreshing channel list...');
    try {
      if (!isOnline) {
        setChannelListError('No internet connection');
        return;
      }
      
      setChannelListError(null);
      // Stream Chat will automatically update the channel list when data changes
      // No need to force refresh unless there's a specific error
    } catch (error) {
      console.error('Error refreshing channels:', error);
      setChannelListError('Failed to load chat list. Please try again.');
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

  // Clear search when search is closed
  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  // Handle network status changes for smart refreshing
  useEffect(() => {
    if (isOnline && channelListError) {
      console.log('Network came back online, refreshing channel list');
      refreshChannelList();
    }
  }, [isOnline]);

  // Only refresh channel list when needed (network reconnection, not on tab focus)
  useFocusEffect(
    useCallback(() => {
      console.log('MainTabScreen focused - checking if refresh needed');
      // Only refresh if there was a previous error or if we're coming back online
      if (channelListError && isOnline) {
        console.log('Refreshing channel list due to previous error and network available');
        refreshChannelList();
      }
    }, [channelListError, isOnline])
  );

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
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ) : () => (
            <TouchableOpacity
              onPress={() => setShowSearch(true)}
              style={styles.searchButton}
            >
              <Ionicons name="search" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      {showSearch ? (
        <SafeAreaView style={styles.searchContainer} edges={['bottom']}>
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

          {/* Search Results */}
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : searchQuery.trim() ? (
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
          ) : (
            // Show normal chat list when search is active but no query is entered
            <>
              {channelListError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="wifi-outline" size={48} color="#ccc" />
                  <Text style={styles.errorText}>{channelListError}</Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={refreshChannelList}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ChannelList
                  filters={{ members: { $in: [user.id] } }}
                  Preview={ChannelListItem}
                  sort={{ updated_at: -1 }}
                  options={{ limit: 20 }}
                />
              )}
              <NewChatButton />
            </>
          )}
        </SafeAreaView>
      ) : (
        <>
          {channelListError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="wifi-outline" size={48} color="#ccc" />
              <Text style={styles.errorText}>{channelListError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={refreshChannelList}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ChannelList
              filters={{ members: { $in: [user.id] } }}
              Preview={ChannelListItem}
              sort={{ updated_at: -1 }}
              options={{ limit: 20 }}
            />
          )}
          <NewChatButton />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  searchContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
});
