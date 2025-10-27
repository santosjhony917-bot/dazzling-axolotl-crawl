import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthContext } from './AuthContext';
import { Loader2 } from 'lucide-react';

interface SessionContextType {
  // Add session-related state here if needed later (e.g., user profile, permissions)
  isSessionReady: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SessionContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session, isLoading: isAuthLoading } = useAuthContext();
  
  // For now, we consider the session ready once the initial auth loading is complete.
  const isSessionReady = !isAuthLoading;

  if (!isSessionReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const value: SessionContextType = {
    isSessionReady,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionContextProvider');
  }
  return context;
};

export default SessionContextProvider;