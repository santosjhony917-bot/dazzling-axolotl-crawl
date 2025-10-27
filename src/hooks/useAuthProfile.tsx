import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthContext, AuthContextType } from '@/context/AuthContext'; // AuthContextType agora é exportado
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Profile } from '@/types/supabase';

// Este hook agora é redundante, pois o AuthContext já carrega o perfil.
// No entanto, se ele for usado para carregar dados adicionais do perfil, podemos mantê-lo.
// Vou simplificá-lo para usar os dados já carregados pelo AuthContext.

export function useAuthProfile() {
  const { profile, isLoading, refetchProfile } = useAuthContext();

  return {
    profile,
    isLoading,
    refetchProfile,
  };
}