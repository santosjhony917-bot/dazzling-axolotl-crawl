"use client";

import { useSession } from "@/integrations/supabase/session-provider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  plan: 'free' | 'basic' | 'premium';
  // Add other restaurant fields as needed
}

interface AuthData {
  user: any; // Supabase User object
  profile: Profile | null;
  restaurant: Restaurant | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isRestaurantOwner: boolean;
  isPremium: boolean;
  isAdmin: boolean; // Adicionado isAdmin
}

export const useAuth = (): AuthData => {
  const { session, isLoading: isLoadingSession } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // Novo estado para status de admin
  const [isLoadingData, setIsLoadingData] = useState(true);

  const user = session?.user || null;
  const isLoggedIn = !!user;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      setProfile(null);
      setRestaurant(null);
      setIsAdmin(false); // Reset admin status

      if (user) {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching profile:', profileError);
        } else if (profileData) {
          setProfile(profileData);
        }

        // Fetch restaurant if user is an owner
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (restaurantError && restaurantError.code !== 'PGRST116') {
          console.error('Error fetching restaurant:', restaurantError);
        } else if (restaurantData) {
          setRestaurant(restaurantData);
        }

        // Check admin status
        const { data: adminData, error: adminError } = await supabase.rpc('is_admin');
        if (adminError) {
          console.error('Error checking admin status:', adminError);
        } else {
          setIsAdmin(adminData);
        }
      }
      setIsLoadingData(false);
    };

    if (!isLoadingSession) {
      fetchData();
    }
  }, [user, isLoadingSession]);

  const isRestaurantOwner = !!restaurant;
  const isPremium = isRestaurantOwner && restaurant?.plan === 'premium';

  return {
    user,
    profile,
    restaurant,
    isLoading: isLoadingSession || isLoadingData,
    isLoggedIn,
    isRestaurantOwner,
    isPremium,
    isAdmin, // Retornar isAdmin
  };
};