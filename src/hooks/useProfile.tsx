import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';

const PROFILES_QUERY_KEY = 'profiles';

const fetchProfile = async (userId: string | undefined): Promise<Profile | null> => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row was not found"
    console.error('Error fetching profile:', error);
    throw new Error(error.message);
  }

  return data;
};

const updateProfileData = async (userId: string, updates: Partial<Profile>) => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error(error.message);
  }
};

export const useProfile = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery<Profile | null, Error>({
    queryKey: [PROFILES_QUERY_KEY, userId],
    queryFn: () => fetchProfile(userId),
    enabled: !!userId,
  });

  const { mutateAsync: updateProfile } = useMutation({
    mutationFn: (updates: Partial<Profile>) => updateProfileData(userId!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILES_QUERY_KEY, userId] });
    },
  });

  const refetchProfile = () => {
    queryClient.invalidateQueries({ queryKey: [PROFILES_QUERY_KEY, userId] });
  };

  return {
    profile,
    isLoading,
    error: error?.message,
    updateProfile,
    refetchProfile,
  };
};