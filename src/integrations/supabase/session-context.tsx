import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './client';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  // Mock function for role checking
  checkRole: (roles: string[]) => boolean; 
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mock implementation for role checking based on user metadata or email
  const checkRole = (roles: string[]): boolean => {
    if (!user) return false;
    
    // Simple mock role check: assuming 'admin' role if email matches a specific address
    if (roles.includes('admin') && user.email === 'joaoedasilva018@gmail.com') {
      return true;
    }
    
    // Simple mock role check: assuming 'restaurant_owner' if user metadata contains a flag
    const isRestaurantOwner = user.user_metadata?.is_restaurant_owner === true;
    if (roles.includes('restaurant_owner') && isRestaurantOwner) {
      return true;
    }

    return false;
  };

  return (
    <SessionContext.Provider value={{ session, user, isLoading, checkRole }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};