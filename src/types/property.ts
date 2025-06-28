export interface Property {
  id: string
  name: string
  address: {
    street?: string
    city?: string
    state?: string
    country?: string
    zipCode?: string
    property_type?: 'residential' | 'commercial' | 'mixed' | 'industrial'
    coordinates?: {
      lat: number
      lng: number
    }
  }
  total_value: number
  token_price: number
  total_tokens: number
  available_tokens: number
  asa_id?: number | null
  metadata_url?: string | null
  created_at: string

  // Optional fields that don't exist in current schema
  description?: string
  image_url?: string
  expectedYield?: number
  minInvestment?: number
  listingDate?: string
  propertyType?: 'residential' | 'commercial' | 'mixed' | 'industrial'
  status?: 'active' | 'funded' | 'coming_soon'
  
  // Legacy fields for backward compatibility (optional)
  title?: string // Maps to name
  image?: string // Maps to image_url
  location?: string // Derived from address
  totalValue?: number // Maps to total_value
  tokenPrice?: number // Maps to token_price
  totalTokens?: number // Maps to total_tokens
  availableTokens?: number // Maps to available_tokens
}

// Simplified interface for database operations
export interface DatabaseProperty {
  id: string
  name: string
  address: any // JSONB type
  total_value: number
  token_price: number
  total_tokens: number
  available_tokens: number
  asa_id?: number | null
  metadata_url?: string | null
  created_at: string
}

// Interface for property creation/updates
export interface PropertyInput {
  name: string
  address: {
    street?: string
    city?: string
    state?: string
    country?: string
    zipCode?: string
    property_type?: 'residential' | 'commercial' | 'mixed' | 'industrial'
  }
  total_value: number
  token_price: number
  total_tokens?: number
  available_tokens: number
  asa_id?: number | null
  metadata_url?: string | null
}

// Interface for property with calculated fields
export interface PropertyWithMetrics extends DatabaseProperty {
  funding_percentage: number
  tokens_sold: number
  investor_count?: number
  total_invested?: number
}