import { supabase } from '../lib/supabase';

export const tokenProvider = async () => {
  try {
    console.log('🔑 TokenProvider: Requesting Stream Chat token...');
    const { data, error } = await supabase.functions.invoke('stream-token');
    
    if (error) {
      console.error('🔑 TokenProvider: Error getting token:', error);
      throw new Error(`Token request failed: ${error.message}`);
    }
    
    if (!data?.token) {
      console.error('🔑 TokenProvider: No token in response:', data);
      throw new Error('No token received from server');
    }
    
    console.log('🔑 TokenProvider: Token received successfully');
    return data.token;
  } catch (error) {
    console.error('🔑 TokenProvider: Exception in token provider:', error);
    throw error;
  }
};
