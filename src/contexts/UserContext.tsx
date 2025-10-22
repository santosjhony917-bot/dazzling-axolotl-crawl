import React, { createContext, useContext, ReactNode } from 'react';

interface UserContextType {
  // Mock user object for now, actual auth handled by useAuth/Supabase
  user: any; 
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Mock user state and logout function for now
  const user = null; 

  const logout = () => {
    // Placeholder for local state cleanup
    console.log("UserContext: Local logout/cleanup performed.");
  };

  return (
    <UserContext.Provider value={{ user, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    // This error should be caught if UserProvider is not wrapping the component tree
    // For now, we assume it will be wrapped in main.tsx
    return { user: null, logout: () => {} }; 
  }
  return context;
};