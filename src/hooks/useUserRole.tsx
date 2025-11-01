"use client";

import { useAuthData } from '@/context/AuthContext';

export function useUserRole() {
  const { isPremium, isAdmin, isProfileLoading } = useAuthData(); // Corrigido: usando 'isProfileLoading', 'isPremium', 'isAdmin'

  return { isPremium, isAdmin, isLoading: isProfileLoading };
}