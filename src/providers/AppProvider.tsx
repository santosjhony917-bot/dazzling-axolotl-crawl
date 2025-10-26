import React from 'react';
import { AuthContextProvider } from '@/context/AuthContext';
import QueryProvider from './QueryProvider';

interface AppProviderProps {
  children: React.ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryProvider>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </QueryProvider>
  );
}