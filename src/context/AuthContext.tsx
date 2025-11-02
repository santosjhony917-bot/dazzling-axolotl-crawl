import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  restaurant: any | null; // Adicionei o tipo any para o restaurante
  isPremium: boolean; // Adicionei a propriedade isPremium
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        toast.error('Erro ao carregar sessão de usuário.');
        console.error('Error getting session:', error);
      }
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          toast.error('Erro ao carregar dados do restaurante.');
          console.error('Error fetching restaurant data:', error);
        } else if (data) {
          setRestaurant(data);
          setIsPremium(data.plan === 'premium');
        } else {
          setRestaurant(null);
          setIsPremium(false);
        }
      } else {
        setRestaurant(null);
        setIsPremium(false);
      }
    };

    fetchRestaurantData();
  }, [user]);

  return (
    <AuthContext.Provider value={{ session, user, restaurant, isPremium, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthData = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthData must be used within an AuthProvider');
  }
  return context;
};