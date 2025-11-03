import { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';

export const useProfile = (user: User | null) => {
  const [loading, setLoading] = useState(false);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: "Usuário não autenticado." };
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      console.error('Error updating profile:', error);
      return { error: error.message };
    }

    return { error: null };
  }, [user]);

  return {
    updateProfile,
    loading,
  };
};