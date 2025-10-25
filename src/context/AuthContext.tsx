import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { User } from '@supabase/supabase-js';
import { Restaurant } from '@/types/restaurant';

interface AuthContextType {
  user: User | null;
  restaurant: Restaurant | null;
  isPremium: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<{ error: Error | null }>;
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const authProfile = useAuthProfile();
  return (
    <AuthContext.Provider value={authProfile}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};