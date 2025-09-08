import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { tokenProvider } from '../utils/tokenProvider';

type AuthContext = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContext>({
  session: null,
  user: null,
  profile: null,
  loading: true,
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthProvider: Getting initial session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('🔐 AuthProvider: Error getting session:', error);
      }
      console.log('🔐 AuthProvider: Initial session received:', session ? 'User logged in' : 'No user');
      if (session) {
        console.log('🔐 AuthProvider: Session user ID:', session.user.id);
        console.log('🔐 AuthProvider: Session user email:', session.user.email);
      }
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 AuthProvider: Auth state changed:', event, session ? 'User logged in' : 'No user');
      if (session) {
        console.log('🔐 AuthProvider: New session user ID:', session.user.id);
        console.log('🔐 AuthProvider: New session user email:', session.user.email);
      }
      setSession(session);
      setLoading(false);
    });

    return () => {
      console.log('🔐 AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      console.log('🔐 AuthProvider: No user session, clearing profile');
      setProfile(null);
      return;
    }

    console.log('🔐 AuthProvider: Fetching profile for user:', session.user.id);
    console.log('🔐 AuthProvider: User metadata:', session.user.user_metadata);
    console.log('🔐 AuthProvider: User email:', session.user.email);
    
    const fetchProfile = async (retryCount = 0) => {
      try {
        console.log('🔐 AuthProvider: Attempting to fetch profile from database... (attempt', retryCount + 1, ')');
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.log('🔐 AuthProvider: Error fetching profile:', error);
          console.log('🔐 AuthProvider: Error code:', error.code);
          
          // Check if it's a network error and retry
          if (error.message?.includes('Network request failed') && retryCount < 3) {
            console.log('🔐 AuthProvider: Network error, retrying in', (retryCount + 1) * 2000, 'ms...');
            setTimeout(() => {
              fetchProfile(retryCount + 1);
            }, (retryCount + 1) * 2000);
            return;
          }
          
          // If profile doesn't exist, create one
          if (error.code === 'PGRST116') {
            console.log('🔐 AuthProvider: Profile not found (PGRST116), creating new profile...');
            
            // Generate a unique username
            const baseUsername = session.user.email?.split('@')[0] || 'user';
            const uniqueUsername = `${baseUsername}_${session.user.id.slice(0, 8)}`;
            
            const profileData = {
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              username: uniqueUsername,
              avatar_url: session.user.user_metadata?.avatar_url || null,
              bio: null
            };
            
            console.log('🔐 AuthProvider: Profile data to insert:', profileData);
            
            let { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert(profileData)
              .select()
              .single();
            
            // If username conflict, try with a different username
            if (createError && createError.code === '23505' && createError.message.includes('username')) {
              console.log('🔐 AuthProvider: Username conflict, trying with timestamp...');
              const timestampUsername = `user_${Date.now()}`;
              const retryProfileData = {
                ...profileData,
                username: timestampUsername
              };
              
              console.log('🔐 AuthProvider: Retry profile data:', retryProfileData);
              
              const retryResult = await supabase
                .from('profiles')
                .insert(retryProfileData)
                .select()
                .single();
              
              newProfile = retryResult.data;
              createError = retryResult.error;
            }
            
            if (createError) {
              console.error('🔐 AuthProvider: Error creating profile:', createError);
              console.error('🔐 AuthProvider: Create error details:', createError);
              setProfile(null);
            } else {
              console.log('🔐 AuthProvider: Profile created successfully:', newProfile);
              setProfile(newProfile);
            }
          } else {
            console.log('🔐 AuthProvider: Different error, not creating profile');
            // For network errors that failed retry, create a minimal profile to allow app to work
            if (error.message?.includes('Network request failed')) {
              console.log('🔐 AuthProvider: Network failed after retries, creating minimal profile...');
              const minimalProfile = {
                id: session.user.id,
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                username: session.user.email?.split('@')[0] || 'user',
                avatar_url: null,
                bio: null,
                website: null
              };
              setProfile(minimalProfile);
            } else {
              setProfile(null);
            }
          }
        } else {
          console.log('🔐 AuthProvider: Profile fetched successfully:', data);
          setProfile(data);
        }
      } catch (err) {
        console.log('🔐 AuthProvider: Exception fetching profile:', err);
        // For network exceptions, create a minimal profile to allow app to work
        if (err instanceof Error && err.message?.includes('Network request failed')) {
          console.log('🔐 AuthProvider: Network exception, creating minimal profile...');
          const minimalProfile = {
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            username: session.user.email?.split('@')[0] || 'user',
            avatar_url: null,
            bio: null,
            website: null
          };
          setProfile(minimalProfile);
        } else {
          setProfile(null);
        }
      }
    };
    fetchProfile();
  }, [session?.user]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
