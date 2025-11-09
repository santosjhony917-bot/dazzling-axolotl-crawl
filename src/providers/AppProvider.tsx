import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import QueryProvider from './QueryProvider';
import { RestaurantProvider } from '@/context/RestaurantContext';

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <RestaurantProvider>
          {children}
        </RestaurantProvider>
      </AuthProvider>
    </QueryProvider>
  );
};

export default AppProvider;