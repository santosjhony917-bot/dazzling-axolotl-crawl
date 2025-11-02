import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Restaurant } from '@/types'; // Assumindo que estes tipos existem

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchUserData = async (sessionUser: User | null) => {
      if (sessionUser) {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        if (profileError) console.error('Error fetching profile:', profileError);
        setProfile(profileData);

        // Fetch restaurant (assuming one restaurant per user for simplicity)
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('user_id', sessionUser.id)
          .single();
        if (restaurantError) console.error('Error fetching restaurant:', restaurantError);
        setRestaurant(restaurantData);

        setIsAuthenticated(true);
      } else {
        setProfile(null);
        setRestaurant(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        await fetchUserData(session?.user || null);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user || null);
      await fetchUserData(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRestaurant(null);
    setIsAuthenticated(false);
  };

  const refetchProfile = async () => {
    if (user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileError) console.error('Error refetching profile:', profileError);
      setProfile(profileData);
    }
  };

  const refetchRestaurant = async () => {
    if (user) {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (restaurantError) console.error('Error refetching restaurant:', restaurantError);
      setRestaurant(restaurantData);
    }
  };

  return { user, profile, restaurant, isLoading, isAuthenticated, signOut, refetchProfile, refetchRestaurant };
};