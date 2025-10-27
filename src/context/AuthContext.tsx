import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Profile, Restaurant } from '@/types/supabase'; // Importando tipos

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null; // Adicionado
  restaurant: Restaurant | null; // Adicionado
  isAdmin: boolean; // Adicionado
  isPremium: boolean; // Adicionado
  isLoading: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>; // Adicionado
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserData = useCallback(async (userId: string) => {
    // 1. Fetch Profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching profile:', profileError);
    }
    setProfile(profileData || null);

    // 2. Fetch Restaurant (assuming one restaurant per user for now)
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (restaurantError && restaurantError.code !== 'PGRST116') {
      console.error('Error fetching restaurant:', restaurantError);
    }
    setRestaurant(restaurantData || null);
    
    // 3. Check Admin Role (using the is_admin function)
    const { data: adminData, error: adminError } = await supabase.rpc('is_admin');
    if (adminError) {
        console.error('Error checking admin role:', adminError);
        setIsAdmin(false);
    } else {
        setIsAdmin(adminData === true);
    }

  }, []);

  const refetchProfile = useCallback(async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);

      if (currentUser) {
        fetchUserData(currentUser.id);
      } else {
        setProfile(null);
        setRestaurant(null);
        setIsAdmin(false);
      }

      if (event === 'SIGNED_OUT') {
        showSuccess('Você foi desconectado.');
        navigate('/login');
      }
    });

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);
      if (currentUser) {
        fetchUserData(currentUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, fetchUserData]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao sair: ' + error.message);
    }
  };
  
  const isPremium = restaurant?.plan === 'premium' || false;

  const value: AuthContextType = {
    session,
    user,
    profile,
    restaurant,
    isAdmin,
    isPremium,
    isLoading,
    signOut,
    refetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthContextProvider');
  }
  return context;
};