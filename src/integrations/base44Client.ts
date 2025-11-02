import { createClient } from '@/integrations/supabase/client';

const supabase = createClient();

const base44 = {
  auth: {
    async updateMe(data: { onboarding_completed?: boolean; user_role?: 'restaurant' | 'customer' }) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: updatedUser, error } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: data.onboarding_completed,
          user_role: data.user_role,
        },
      });
      if (error) throw error;
      return { success: true };
    },
    async me() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return {
        user_role: user?.user_metadata?.user_role,
        onboarding_completed: user?.user_metadata?.onboarding_completed,
      };
    },
    async clearRole() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: updatedUser, error } = await supabase.auth.updateUser({
        data: {
          user_role: null,
        },
      });
      if (error) throw error;
      return { success: true };
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    }
  },
  restaurants: {
    async getRestaurantByUserId(userId: string) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
      return data;
    },
    async getRestaurantById(restaurantId: string) {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          user_favorites(id, user_id, restaurant_id)
        `)
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return {
        ...data,
        is_favorited: data.user_favorites.length > 0,
      };
    },
  },
  userFavorites: {
    async addFavorite(restaurantId: string) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated.");

      const { data, error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurantId })
        .select();
      if (error) throw error;
      return data;
    },
    async removeFavorite(restaurantId: string) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated.");

      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
      return { success: true };
    },
  },
  integrations: {
    // Placeholder for other integrations
  },
};

export { base44, supabase };