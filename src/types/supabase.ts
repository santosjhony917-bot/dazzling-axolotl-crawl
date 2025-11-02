export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      banners: {
        Row: {
          button_color: string | null
          button_link: string | null
          button_text: string | null
          created_at: string | null
          has_button: boolean
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          order_index: number | null
          subtitle: string | null
          target_audience: Database["public"]["Enums"]["banner_target_audience"]
          text_color: string | null
          text_position: Database["public"]["Enums"]["banner_text_position"]
          text_size: Database["public"]["Enums"]["banner_text_size"]
          title: string
        }
        Insert: {
          button_color?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          has_button?: boolean
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          order_index?: number | null
          subtitle?: string | null
          target_audience?: Database["public"]["Enums"]["banner_target_audience"]
          text_color?: string | null
          text_position?: Database["public"]["Enums"]["banner_text_position"]
          text_size?: Database["public"]["Enums"]["banner_text_size"]
          title: string
        }
        Update: {
          button_color?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          has_button?: boolean
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          order_index?: number | null
          subtitle?: string | null
          target_audience?: Database["public"]["Enums"]["banner_target_audience"]
          text_color?: string | null
          text_position?: Database["public"]["Enums"]["banner_text_position"]
          text_size?: Database["public"]["Enums"]["banner_text_size"]
          title?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          order_index: number | null
          restaurant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          order_index?: number | null
          restaurant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          order_index?: number | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_favorites: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_favorites_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          order_index: number | null
          price: number
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          order_index?: number | null
          price: number
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_gallery: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          order_index: number | null
          restaurant_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          order_index?: number | null
          restaurant_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          order_index?: number | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_gallery_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          category: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          external_url: string | null
          followers_override: number | null
          id: string
          ifood_url: string | null
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          neighborhood: string | null
          number: string | null
          opening_hours: Json | null
          other_url: string | null
          payment_methods: Json | null
          plan: Database["public"]["Enums"]["restaurant_plan"]
          social_networks: Json | null
          state: string | null
          user_id: string | null
          whatsapp_url: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          external_url?: string | null
          followers_override?: number | null
          id?: string
          ifood_url?: string | null
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          number?: string | null
          opening_hours?: Json | null
          other_url?: string | null
          payment_methods?: Json | null
          plan?: Database["public"]["Enums"]["restaurant_plan"]
          social_networks?: Json | null
          state?: string | null
          user_id?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          external_url?: string | null
          followers_override?: number | null
          id?: string
          ifood_url?: string | null
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          opening_hours?: Json | null
          other_url?: string | null
          payment_methods?: Json | null
          plan?: Database["public"]["Enums"]["restaurant_plan"]
          social_networks?: Json | null
          state?: string | null
          user_id?: string | null
          whatsapp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_metrics: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          initial_followers: number
          restaurant_id: string
          start_time: string
          status: string
          target_followers: number
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          initial_followers: number
          restaurant_id: string
          start_time?: string
          status?: string
          target_followers: number
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          initial_followers?: number
          restaurant_id?: string
          start_time?: string
          status?: string
          target_followers?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_metrics_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_search_locations: {
        Row: {
          address: string
          cep: string | null
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          user_id: string
        }
        Insert: {
          address: string
          cep?: string | null
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          user_id: string
        }
        Update: {
          address?: string
          cep?: string | null
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_search_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance: {
        Args: {
          lat1: number
          lng1: number
          lat2: number
          lng2: number
        }
        Returns: number
      }
      count_restaurant_followers: {
        Args: {
          p_restaurant_id: string
        }
        Returns: number
      }
      find_nearby_restaurants: {
        Args: {
          user_lat: number
          user_lng: number
          max_distance_km?: number
          search_query?: string
        }
        Returns: {
          id: string
          user_id: string
          name: string
          description: string | null
          image_url: string | null
          cover_image_url: string | null
          plan: Database["public"]["Enums"]["restaurant_plan"]
          created_at: string | null
          latitude: number | null
          longitude: number | null
          category: string | null
          city: string | null
          state: string | null
          distance_km: number
        }[]
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_category_owner: {
        Args: {
          p_category_id: string
        }
        Returns: boolean
      }
      search_menu_items: {
        Args: {
          search_query: string
          p_limit?: number
        }
        Returns: {
          item_id: string
          item_name: string
          item_description: string | null
          item_price: number
          item_image_url: string | null
          restaurant_id: string
          restaurant_name: string
          restaurant_category: string | null
        }[]
      }
      swap_category_order: {
        Args: {
          category_id_a: string
          category_id_b: string
        }
        Returns: undefined
      }
    }
    Enums: {
      banner_target_audience: "user" | "restaurant_owner" | "admin"
      banner_text_position:
        | "top-left"
        | "top-right"
        | "bottom-left"
        | "bottom-right"
        | "center"
      banner_text_size: "sm" | "md" | "lg"
      restaurant_plan: "free" | "basic" | "premium" | "premium_gift"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public'];

export type Profile = PublicSchema['Tables']['profiles']['Row'];
export type Restaurant = PublicSchema['Tables']['restaurants']['Row'];
export type MenuCategory = PublicSchema['Tables']['menu_categories']['Row'];
export type MenuItem = PublicSchema['Tables']['menu_items']['Row'];
export type GalleryImage = PublicSchema['Tables']['restaurant_gallery']['Row'];
export type FavoriteRestaurant = PublicSchema['Tables']['user_favorites']['Row'];

// Custom types
export type RestaurantWithDistance = Restaurant & { distance_km: number };
export type MenuItemWithRestaurant = MenuItem & { restaurant_name: string; restaurant_category: string | null };
export type MenuCategoryWithItems = MenuCategory & { menu_items: MenuItem[] };

// Exporting RestaurantPlan from enums
export type RestaurantPlan = PublicSchema['Enums']['restaurant_plan'];