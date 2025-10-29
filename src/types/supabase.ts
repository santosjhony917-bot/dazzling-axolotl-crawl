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
          created_at: string
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
          created_at?: string
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
          created_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          order_index: number | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          order_index?: number | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          order_index?: number | null
          is_active?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      // Add other tables if necessary, but these two are enough for menu management hooks
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