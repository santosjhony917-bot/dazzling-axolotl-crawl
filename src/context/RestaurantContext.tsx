import React, { createContext, useContext, ReactNode } from 'react';
import { Restaurant } from '@/types/supabase';
import { useAuthData } from '@/context/AuthContext';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { restaurant, isRestaurantLoading, refetchRestaurant } = useAuthData();

  const contextValue: RestaurantContextType = {
    restaurant: restaurant || null,
    isLoading: isRestaurantLoading,
    error: null,
    refetch: refetchRestaurant,
  };

  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurantContext = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurantContext must be used within a RestaurantProvider');
  }
  return context;
};