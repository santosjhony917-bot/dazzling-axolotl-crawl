import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import QueryProvider from './QueryProvider';

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryProvider>
  );
};

export default AppProvider;