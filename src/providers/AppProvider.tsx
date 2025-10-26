import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import QueryProvider from './QueryProvider';
import ToastProvider from '@/components/ToastProvider';

interface AppProviderProps {
  children: React.ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider />
        {children}
      </AuthProvider>
    </QueryProvider>
  );
};

export default AppProvider;