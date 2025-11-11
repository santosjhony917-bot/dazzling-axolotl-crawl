import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with the user's JWT for RLS and admin check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not found or token invalid.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if the user is an admin using a database function
    const { data: isAdminData, error: adminError } = await supabaseClient.rpc('is_admin');
    if (adminError || !isAdminData) {
      console.error('Error checking admin status:', adminError);
      return new Response(JSON.stringify({ error: 'Forbidden: User is not an admin.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { external_url, category_name, item_name, price, description, image_url } = await req.json();

    if (!external_url || !category_name || !item_name || !price) {
      return new Response(JSON.stringify({ error: 'Missing required fields: external_url, category_name, item_name, price.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service role key for privileged operations
    // This client bypasses RLS and is only used within the secure Edge Function environment
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find restaurant ID
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('external_url', external_url)
      .single();

    if (restaurantError || !restaurantData) {
      console.error('Error finding restaurant:', restaurantError);
      return new Response(JSON.stringify({ error: `Restaurant not found for external_url: ${external_url}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    const restaurantId = restaurantData.id;

    // Find or create menu category
    let categoryId: string | null = null;
    const { data: existingCategory, error: findCategoryError } = await supabaseAdmin
      .from('menu_categories')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('name', category_name)
      .single();

    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory, error: insertCategoryError } = await supabaseAdmin
        .from('menu_categories')
        .insert({ restaurant_id: restaurantId, name: category_name })
        .select('id')
        .single();

      if (insertCategoryError || !newCategory) {
        console.error('Error creating menu category:', insertCategoryError);
        return new Response(JSON.stringify({ error: `Failed to find or create category '${category_name}' for restaurant ${external_url}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      categoryId = newCategory.id;
    }

    // Insert menu item
    const menuItem = {
      category_id: categoryId,
      name: item_name,
      price: parseFloat(price),
      description: description || null,
      image_url: image_url || null,
      order_index: 0,
      is_active: true,
    };

    const { data: insertedItem, error: insertItemError } = await supabaseAdmin
      .from('menu_items')
      .insert(menuItem)
      .select()
      .single();

    if (insertItemError || !insertedItem) {
      console.error('Error inserting menu item:', insertItemError);
      return new Response(JSON.stringify({ error: `Failed to insert item '${item_name}' for category ${category_name} of restaurant ${external_url}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, item: insertedItem }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});