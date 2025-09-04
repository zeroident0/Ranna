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
  const [profile, setProfile] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthProvider: Getting initial session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 AuthProvider: Initial session received:', session ? 'User logged in' : 'No user');
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 AuthProvider: Auth state changed:', event, session ? 'User logged in' : 'No user');
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
    const fetchProfile = async () => {
      try {
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.log('🔐 AuthProvider: Error fetching profile:', error);
        } else {
          console.log('🔐 AuthProvider: Profile fetched successfully:', data ? 'Profile found' : 'No profile');
        }
        setProfile(data);
      } catch (err) {
        console.log('🔐 AuthProvider: Exception fetching profile:', err);
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
