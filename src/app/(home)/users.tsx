import { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import UserListItem from '../../components/UserListItem';

export default function UsersScreen() {
  // State for managing users list and search functionality
  const [users, setUsers] = useState([]); // All users from database
  const [filteredUsers, setFilteredUsers] = useState([]); // Users filtered by search
  const [searchQuery, setSearchQuery] = useState(''); // Current search input
  const { user } = useAuth(); // Current authenticated user

  // Fetch all users from database on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      // Get all user profiles except current user
      let { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id); // Exclude current user from list

      setUsers(profiles);
      setFilteredUsers(profiles); // Initialize filtered list with all users
    };
    fetchUsers();
  }, []);

  // Filter users based on search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // Show all users when search is empty
      setFilteredUsers(users);
    } else {
      // Filter users by name (case-insensitive)
      const filtered = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  return (
    <View style={styles.container}>
      {/* Search input with icon and clear button */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for people to chat with..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {/* Show clear button only when there's text */}
        {searchQuery.length > 0 && (
          <Ionicons 
            name="close-circle" 
            size={20} 
            color="#666" 
            style={styles.clearIcon}
            onPress={() => setSearchQuery('')}
          />
        )}
      </View>
      
      {/* List of filtered users */}
      <FlatList
        data={filteredUsers}
        contentContainerStyle={{ 
          paddingHorizontal: 16,
          paddingBottom: 20,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => <UserListItem user={item} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Main container styling
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Search input container with shadow and rounded corners
  searchContainer: {
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
  // Search icon positioning
  searchIcon: {
    marginRight: 12,
  },
  // Text input styling - takes remaining space
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  // Clear button styling with touch padding
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
});
