import React, { createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showSuccess, showError } from '@/utils/toast';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { Restaurant } from '@/types/supabase';

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  
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
  
  // Mock da sessão (não é estritamente necessário, mas mantido para compatibilidade)
  const session = null; 

  const signOut = async () => {
    const { error } = await profileSignOut();
    if (error) {
      showError("Erro ao sair: " + error.message);
    } else {
      showSuccess("Você saiu com sucesso.");
      // Redireciona para a tela de boas-vindas ou splash
      navigate(createPageUrl('welcome')); 
    }
  };
  
  // A função refetchProfile é passada diretamente, confiando na tipagem do useAuthProfile.

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