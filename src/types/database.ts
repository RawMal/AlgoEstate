export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          name: string
          address: any // JSONB type
          total_value: number
          token_price: number
          total_tokens: number
          available_tokens: number
          asa_id: number | null
          metadata_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address: any
          total_value: number
          token_price: number
          total_tokens?: number
          available_tokens: number
          asa_id?: number | null
          metadata_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: any
          total_value?: number
          token_price?: number
          total_tokens?: number
          available_tokens?: number
          asa_id?: number | null
          metadata_url?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          wallet_address: string | null
          kyc_status: 'pending' | 'verified' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          wallet_address?: string | null
          kyc_status?: 'pending' | 'verified' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          wallet_address?: string | null
          kyc_status?: 'pending' | 'verified' | 'rejected'
          created_at?: string
        }
      }
      token_ownership: {
        Row: {
          id: string
          property_id: string | null
          user_id: string | null
          wallet_address: string
          token_amount: number
          purchase_date: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          user_id?: string | null
          wallet_address: string
          token_amount: number
          purchase_date?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          user_id?: string | null
          wallet_address?: string
          token_amount?: number
          purchase_date?: string
        }
      }
      kyc_applications: {
        Row: {
          id: string
          wallet_address: string
          first_name: string
          last_name: string
          date_of_birth: string
          phone_number: string
          email: string
          status: 'pending' | 'verified' | 'rejected'
          tier: number
          investment_limit: number
          created_at: string
          updated_at: string
          verified_at: string | null
          rejection_reason: string | null
        }
        Insert: {
          id?: string
          wallet_address: string
          first_name: string
          last_name: string
          date_of_birth: string
          phone_number: string
          email: string
          status?: 'pending' | 'verified' | 'rejected'
          tier?: number
          investment_limit?: number
          created_at?: string
          updated_at?: string
          verified_at?: string | null
          rejection_reason?: string | null
        }
        Update: {
          id?: string
          wallet_address?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string
          phone_number?: string
          email?: string
          status?: 'pending' | 'verified' | 'rejected'
          tier?: number
          investment_limit?: number
          created_at?: string
          updated_at?: string
          verified_at?: string | null
          rejection_reason?: string | null
        }
      }
      kyc_documents: {
        Row: {
          id: string
          application_id: string
          document_type: 'national_id' | 'proof_of_address'
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          status: 'pending' | 'verified' | 'rejected'
          uploaded_at: string
          verified_at: string | null
          rejection_reason: string | null
        }
        Insert: {
          id?: string
          application_id: string
          document_type: 'national_id' | 'proof_of_address'
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          status?: 'pending' | 'verified' | 'rejected'
          uploaded_at?: string
          verified_at?: string | null
          rejection_reason?: string | null
        }
        Update: {
          id?: string
          application_id?: string
          document_type?: 'national_id' | 'proof_of_address'
          file_name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          status?: 'pending' | 'verified' | 'rejected'
          uploaded_at?: string
          verified_at?: string | null
          rejection_reason?: string | null
        }
      }
    }
    Functions: {
      get_user_portfolio: {
        Args: { user_wallet_address: string }
        Returns: {
          property_id: string
          property_name: string
          property_address: any
          token_amount: number
          token_price: number
          current_value: number
          purchase_date: string
          asa_id: number | null
        }[]
      }
      get_property_investments: {
        Args: { property_uuid: string }
        Returns: {
          investor_wallet: string
          token_amount: number
          investment_value: number
          purchase_date: string
          percentage_owned: number
        }[]
      }
    }
  }
}

// Extended types for API responses
export interface PropertyWithDetails extends Database['public']['Tables']['properties']['Row'] {
  total_invested?: number
  investor_count?: number
  funding_percentage?: number
}

export interface UserPortfolioItem {
  property_id: string
  property_name: string
  property_address: any
  token_amount: number
  token_price: number
  current_value: number
  purchase_date: string
  asa_id: number | null
}

export interface TokenPurchaseRecord {
  property_id: string
  user_id: string
  wallet_address: string
  token_amount: number
  transaction_id: string
  blockchain_confirmed: boolean
}

export interface PropertyFilters {
  location?: string
  min_price?: number
  max_price?: number
  property_type?: string
  min_yield?: number
  status?: 'active' | 'funded' | 'coming_soon'
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: 'created_at' | 'token_price' | 'total_value' | 'available_tokens'
  sort_order?: 'asc' | 'desc'
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}