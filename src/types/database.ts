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
      menu_items: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          order_index: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          order_index?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          order_index?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      menu_categories: {
        Row: {
            id: string;
            restaurant_id: string;
            name: string;
            order_index: number | null;
            is_active: boolean | null;
            created_at: string | null;
            is_popular: boolean | null;
        };
        Insert: {
            id?: string;
            restaurant_id: string;
            name: string;
            order_index?: number | null;
            is_active?: boolean | null;
            created_at?: string | null;
            is_popular?: boolean | null;
        };
        Update: {
            id?: string;
            restaurant_id?: string;
            name?: string;
            order_index?: number | null;
            is_active?: boolean | null;
            created_at?: string | null;
            is_popular?: boolean | null;
        };
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}