export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      availability_blocks: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_blocks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          base_price: number
          coupon_code: string | null
          created_at: string
          customer_id: string
          discount: number
          dropoff_time: string
          end_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: string
          pickup_time: string
          qr_code: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          security_deposit: number
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
          vehicle_id: string
          vendor_id: string
        }
        Insert: {
          base_price: number
          coupon_code?: string | null
          created_at?: string
          customer_id: string
          discount?: number
          dropoff_time?: string
          end_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          pickup_time?: string
          qr_code?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          security_deposit?: number
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
          vehicle_id: string
          vendor_id: string
        }
        Update: {
          base_price?: number
          coupon_code?: string | null
          created_at?: string
          customer_id?: string
          discount?: number
          dropoff_time?: string
          end_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          pickup_time?: string
          qr_code?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          security_deposit?: number
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
          vehicle_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          amount_off: number | null
          code: string
          created_at: string
          ends_at: string | null
          id: string
          percent_off: number | null
          starts_at: string | null
        }
        Insert: {
          active?: boolean
          amount_off?: number | null
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          percent_off?: number | null
          starts_at?: string | null
        }
        Update: {
          active?: boolean
          amount_off?: number | null
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          percent_off?: number | null
          starts_at?: string | null
        }
        Relationships: []
      }
      disputes: {
        Row: {
          booking_id: string
          created_at: string
          detail: string | null
          id: string
          raised_by: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          detail?: string | null
          id?: string
          raised_by: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          raised_by?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          booking_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          booking_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          id: string
          status: string
          vendor_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          id?: string
          status?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          rating: number
          vehicle_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          rating: number
          vehicle_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          rating?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_images: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          url: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          url: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          url?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          address: string | null
          avg_rating: number
          brand: string
          category: Database["public"]["Enums"]["vehicle_category"]
          city: string
          created_at: string
          description: string | null
          fuel: Database["public"]["Enums"]["fuel_type"]
          id: string
          lat: number | null
          lng: number | null
          mileage_kmpl: number | null
          model: string
          price_daily: number
          price_hourly: number | null
          price_weekly: number | null
          review_count: number
          seats: number | null
          security_deposit: number
          status: Database["public"]["Enums"]["vehicle_status"]
          title: string
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at: string
          vendor_id: string
          year: number
        }
        Insert: {
          address?: string | null
          avg_rating?: number
          brand: string
          category: Database["public"]["Enums"]["vehicle_category"]
          city: string
          created_at?: string
          description?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          lat?: number | null
          lng?: number | null
          mileage_kmpl?: number | null
          model: string
          price_daily: number
          price_hourly?: number | null
          price_weekly?: number | null
          review_count?: number
          seats?: number | null
          security_deposit?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          title: string
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          vendor_id: string
          year: number
        }
        Update: {
          address?: string | null
          avg_rating?: number
          brand?: string
          category?: Database["public"]["Enums"]["vehicle_category"]
          city?: string
          created_at?: string
          description?: string | null
          fuel?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          lat?: number | null
          lng?: number | null
          mileage_kmpl?: number | null
          model?: string
          price_daily?: number
          price_hourly?: number | null
          price_weekly?: number | null
          review_count?: number
          seats?: number | null
          security_deposit?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          title?: string
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          vendor_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          bio: string | null
          business_name: string
          created_at: string
          id: string
          id_document_url: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          payout_email: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          business_name: string
          created_at?: string
          id: string
          id_document_url?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          payout_email?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          business_name?: string
          created_at?: string
          id?: string
          id_document_url?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          payout_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "vendor" | "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "completed"
      fuel_type: "petrol" | "diesel" | "electric" | "hybrid" | "none"
      kyc_status: "unsubmitted" | "pending" | "approved" | "rejected"
      transmission_type: "manual" | "automatic" | "none"
      vehicle_category: "scooter" | "bike" | "motorcycle" | "car" | "ev"
      vehicle_status: "draft" | "active" | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "vendor", "admin"],
      booking_status: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
      ],
      fuel_type: ["petrol", "diesel", "electric", "hybrid", "none"],
      kyc_status: ["unsubmitted", "pending", "approved", "rejected"],
      transmission_type: ["manual", "automatic", "none"],
      vehicle_category: ["scooter", "bike", "motorcycle", "car", "ev"],
      vehicle_status: ["draft", "active", "paused"],
    },
  },
} as const
