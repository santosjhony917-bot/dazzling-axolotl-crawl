import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

export function useAuth() {
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(error.message);
      return false;
    }
    return true;
  };

  return {
    signOut,
  };
}