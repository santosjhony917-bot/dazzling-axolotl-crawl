import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getProfile, updateProfile } from '@/integrations/supabase/profile';
import { Profile } from '@/types/supabase';

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProfile(userId);
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Falha ao carregar o perfil.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
    } else if (user === null) {
      setProfile(null);
      setIsLoading(false);
    }
  }, [user, fetchProfile]);

  const updateProfileField = useCallback(async (field: keyof Profile, value: string) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    const updates = { [field]: value };
    
    const updatedData = await updateProfile(user.id, updates);
    
    setProfile(prev => ({
      ...(prev || {} as Profile),
      ...updatedData,
    }));
    
    return updatedData;
  }, [user]);

  return { profile, isLoading, error, updateProfileField, fetchProfile };
};