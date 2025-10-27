import React, { createContext, useContext, ReactNode } from 'react';
import { Restaurant } from '@/types/supabase';
import { useAuthContext } from './AuthContext';
import { Loader2 } from 'lucide-react';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  isLoading: boolean;
  isPremium: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { restaurant, isLoading: isAuthLoading } = useAuthContext();
  
  const isPremium = restaurant?.plan === 'premium';
  const isLoading = isAuthLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const value: RestaurantContextType = {
    restaurant: restaurant || null,
    isLoading,
    isPremium,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurantContext = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurantContext must be used within a RestaurantContextProvider');
  }
  return context;
};