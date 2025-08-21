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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accounts_payable: {
        Row: {
          amount: number
          attachment_url: string | null
          category_id: string | null
          company_id: string
          cost_center_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          is_recurring: boolean | null
          next_due_date: string | null
          notes: string | null
          parent_transaction_id: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          recurrence_count: number | null
          recurrence_end_date: string | null
          recurrence_frequency: string | null
          recurrence_interval: number | null
          status: Database["public"]["Enums"]["payment_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category_id?: string | null
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          is_recurring?: boolean | null
          next_due_date?: string | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          recurrence_interval?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category_id?: string | null
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          is_recurring?: boolean | null
          next_due_date?: string | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          recurrence_interval?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          amount: number
          attachment_url: string | null
          category_id: string | null
          company_id: string
          cost_center_id: string | null
          created_at: string
          customer_id: string
          description: string
          due_date: string
          id: string
          is_recurring: boolean | null
          next_due_date: string | null
          notes: string | null
          parent_transaction_id: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          recurrence_count: number | null
          recurrence_end_date: string | null
          recurrence_frequency: string | null
          recurrence_interval: number | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category_id?: string | null
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          customer_id: string
          description: string
          due_date: string
          id?: string
          is_recurring?: boolean | null
          next_due_date?: string | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          recurrence_interval?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category_id?: string | null
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          due_date?: string
          id?: string
          is_recurring?: boolean | null
          next_due_date?: string | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          recurrence_interval?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number | null
          bank_name: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["status_type"]
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number | null
          bank_name?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number | null
          bank_name?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["status_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          document: string
          document_type: Database["public"]["Enums"]["document_type"]
          email: string | null
          id: string
          name: string
          phone: string | null
          state: string | null
          status: Database["public"]["Enums"]["status_type"]
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          document: string
          document_type: Database["public"]["Enums"]["document_type"]
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          document?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["status_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          document: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          email: string | null
          id: string
          name: string
          phone: string | null
          state: string | null
          status: Database["public"]["Enums"]["status_type"]
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          document?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          document?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          company_id: string
          cost: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          price: number | null
          sku: string | null
          status: Database["public"]["Enums"]["status_type"]
          stock_quantity: number | null
          unit_type: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number | null
          sku?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          stock_quantity?: number | null
          unit_type?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number | null
          sku?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          stock_quantity?: number | null
          unit_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["status_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          discount: number | null
          id: string
          invoice_number: string | null
          net_amount: number
          notes: string | null
          sale_date: string
          status: Database["public"]["Enums"]["status_type"]
          tax: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          discount?: number | null
          id?: string
          invoice_number?: string | null
          net_amount: number
          notes?: string | null
          sale_date?: string
          status?: Database["public"]["Enums"]["status_type"]
          tax?: number | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          discount?: number | null
          id?: string
          invoice_number?: string | null
          net_amount?: number
          notes?: string | null
          sale_date?: string
          status?: Database["public"]["Enums"]["status_type"]
          tax?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number | null
          sku: string | null
          status: Database["public"]["Enums"]["status_type"]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number | null
          sku?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number | null
          sku?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          document: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          email: string | null
          id: string
          name: string
          phone: string | null
          state: string | null
          status: Database["public"]["Enums"]["status_type"]
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          document?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          document?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["status_type"]
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_next_payable: {
        Args: { parent_id: string }
        Returns: string
      }
      generate_next_receivable: {
        Args: { parent_id: string }
        Returns: string
      }
      process_recurring_transactions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      account_type: "checking" | "savings" | "credit"
      document_type: "cpf" | "cnpj" | "passport"
      payment_method:
        | "boleto"
        | "cartao_credito"
        | "cartao_debito"
        | "transferencia"
        | "pix"
        | "cheque"
        | "dinheiro"
        | "outro"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      status_type: "active" | "inactive" | "pending"
      user_role: "admin" | "manager" | "user"
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
      account_type: ["checking", "savings", "credit"],
      document_type: ["cpf", "cnpj", "passport"],
      payment_method: [
        "boleto",
        "cartao_credito",
        "cartao_debito",
        "transferencia",
        "pix",
        "cheque",
        "dinheiro",
        "outro",
      ],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      status_type: ["active", "inactive", "pending"],
      user_role: ["admin", "manager", "user"],
    },
  },
} as const
