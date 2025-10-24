import React, { createContext, useContext } from 'react';
import { useProvideAuth, AuthContext as AuthContextDefinition } from '@/hooks/useAuth';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<{ error: Error | null }>; // Tipo de retorno atualizado
}

// Usamos o contexto definido em useAuth.ts
const AuthContext = AuthContextDefinition as React.Context<AuthContextType | undefined>;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useProvideAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

// Exportando useAuth para ser usado em toda a aplicação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};