import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import QueryProvider from './QueryProvider';
import { RestaurantProvider } from '@/context/RestaurantContext';
import { UserSearchLocationProvider } from '@/context/UserSearchLocationContext';

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <RestaurantProvider>
          <UserSearchLocationProvider>
            {children}
          </UserSearchLocationProvider>
        </RestaurantProvider>
      </AuthProvider>
    </QueryProvider>
  );
};

export default AppProvider;