export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      menu_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          restaurant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          restaurant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
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
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
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
          phone: string | null
          plan: Database["public"]["Enums"]["restaurant_plan"]
          state: string | null
          user_id: string | null
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
          phone?: string | null
          plan?: Database["public"]["Enums"]["restaurant_plan"]
          state?: string | null
          user_id?: string | null
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
          phone?: string | null
          plan?: Database["public"]["Enums"]["restaurant_plan"]
          state?: string | null
          user_id?: string | null
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
          description: string
          image_url: string
          cover_image_url: string
          plan: Database["public"]["Enums"]["restaurant_plan"]
          created_at: string
          latitude: number
          longitude: number
          category: string
          distance_km: number
        }[]
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: Record<PropertyKey, never>
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
          item_description: string
          item_price: number
          item_image_url: string
          restaurant_id: string
          restaurant_name: string
          restaurant_category: string
        }[]
      }
    }
    Enums: {
      restaurant_plan: "free" | "premium" | "premium_gift" | "basic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never