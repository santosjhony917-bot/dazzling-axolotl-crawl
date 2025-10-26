import React, { createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { showSuccess, showError } from '@/utils/toast';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { Restaurant } from '@/types/supabase';
import { createPageUrl } from '@/utils/url'; // Mantendo o import para createPageUrl

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isPremium: boolean;
  restaurant: Restaurant | null;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  // Nova prop para receber a função de navegação
  navigateCallback: (path: string) => void; 
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, navigateCallback }) => {
  
  // Usando o hook useAuthProfile para gerenciar todo o estado de autenticação e perfis
  const { 
    user, 
    restaurant, 
    isPremium, 
    isAdmin, 
    isLoading, 
    signOut: profileSignOut, 
    refetchProfile
  } = useAuthProfile();
  
  const session = null; 

  const signOut = async () => {
    const { error } = await profileSignOut();
    if (error) {
      showError("Erro ao sair: " + error.message);
    } else {
      showSuccess("Você saiu com sucesso.");
      // Usa o callback de navegação
      navigateCallback(createPageUrl('welcome')); 
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut, isAdmin, isPremium, restaurant, refetchProfile }}>
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