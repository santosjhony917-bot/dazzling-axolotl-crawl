import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserProfile extends User {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
}

export const useUser = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } else if (supabaseUser) {
      setUser(supabaseUser as UserProfile);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        fetchUser();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUser]);

  return { user, isLoading, mutate: fetchUser };
};