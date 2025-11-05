import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
    id: string;
    email: string;
    role: string;
}

export const listAdmins = async (): Promise<AdminUser[]> => {
  const { data, error } = await supabase.functions.invoke('manage-admin-role', {
    method: 'GET',
  });
  if (error) throw new Error(error.message);
  return data.admins || [];
};

export const addAdmin = async (email: string) => {
  const { data, error } = await supabase.functions.invoke('manage-admin-role', {
    method: 'POST',
    body: { email },
  });
  if (error) {
    // The edge function might return a specific error message in context
    const functionError = (error as any).context?.details;
    if (functionError) {
        throw new Error(functionError);
    }
    throw new Error(error.message);
  }
  return data;
};

export const removeAdmin = async (userId: string) => {
  const { data, error } = await supabase.functions.invoke('manage-admin-role', {
    method: 'DELETE',
    body: { userId },
  });
  if (error) throw new Error(error.message);
  return data;
};