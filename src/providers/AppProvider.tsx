import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import QueryProvider from './QueryProvider';
import { RestaurantProvider } from '@/context/RestaurantContext';
import { UserSearchLocationProvider } from '@/context/UserSearchLocationContext';
import { HelmetProvider } from 'react-helmet-async';

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HelmetProvider>
      <QueryProvider>
        <AuthProvider>
          <RestaurantProvider>
            <UserSearchLocationProvider>
              {children}
            </UserSearchLocationProvider>
          </RestaurantProvider>
        </AuthProvider>
      </QueryProvider>
    </HelmetProvider>
  );
};

export default AppProvider;
