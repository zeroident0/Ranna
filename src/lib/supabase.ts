import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug environment variables
console.log('Supabase URL configured:', !!supabaseUrl)
console.log('Supabase Anon Key configured:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables!')
    console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl)
    console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '***configured***' : 'missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})