import React, { createContext, useContext, ReactNode } from 'react';

interface UserContextType {
  user: any;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const mockUser = { id: 'mock-user-id', name: 'Mock User' };

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const logout = () => {
    console.log("Mock User Context: Logging out.");
    // In a real app, this would clear local state
  };

  return (
    <UserContext.Provider value={{ user: mockUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};