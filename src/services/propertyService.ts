import { supabase } from '../lib/supabase'
import { 
  Database, 
  PropertyWithDetails, 
  PropertyFilters, 
  PaginationParams, 
  ApiResponse, 
  PaginatedResponse 
} from '../types/database'

type Property = Database['public']['Tables']['properties']['Row']
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type PropertyUpdate = Database['public']['Tables']['properties']['Update']

export class PropertyService {
  /**
   * Get properties with filtering and pagination
   */
  static async getProperties(
    filters: PropertyFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<PropertyWithDetails[]>> {
    try {
      const {
        location,
        min_price,
        max_price,
        property_type,
        min_yield,
        status = 'active'
      } = filters

      const {
        page = 1,
        limit = 12,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = pagination

      // Calculate offset for pagination
      const offset = (page - 1) * limit

      // Build query with filters
      let query = supabase
        .from('properties')
        .select(`
          *,
          token_ownership!inner(token_amount)
        `, { count: 'exact' })

      // Apply filters
      if (location) {
        query = query.ilike('address->city', `%${location}%`)
      }

      if (min_price !== undefined) {
        query = query.gte('token_price', min_price)
      }

      if (max_price !== undefined) {
        query = query.lte('token_price', max_price)
      }

      if (property_type) {
        query = query.eq('address->property_type', property_type)
      }

      // Filter by status (active properties have available tokens > 0)
      if (status === 'active') {
        query = query.gt('available_tokens', 0)
      } else if (status === 'funded') {
        query = query.eq('available_tokens', 0)
      }

      // Apply sorting and pagination
      query = query
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(offset, offset + limit - 1)

      const { data: properties, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch properties: ${error.message}`)
      }

      // Calculate additional metrics for each property
      const propertiesWithDetails: PropertyWithDetails[] = properties?.map(property => {
        const totalInvested = (property.total_tokens - property.available_tokens) * property.token_price
        const fundingPercentage = ((property.total_tokens - property.available_tokens) / property.total_tokens) * 100
        
        return {
          ...property,
          total_invested: totalInvested,
          funding_percentage: Math.round(fundingPercentage * 100) / 100
        }
      }) || []

      return {
        data: propertiesWithDetails,
        error: null,
        success: true,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit)
        }
      }

    } catch (error: any) {
      console.error('Error fetching properties:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch properties',
        success: false
      }
    }
  }

  /**
   * Get property by ID with full details
   */
  static async getPropertyById(id: string): Promise<ApiResponse<PropertyWithDetails>> {
    try {
      // Get property with ownership data
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          token_ownership(
            token_amount,
            wallet_address,
            purchase_date,
            users(email)
          )
        `)
        .eq('id', id)
        .single()

      if (propertyError) {
        throw new Error(`Failed to fetch property: ${propertyError.message}`)
      }

      if (!property) {
        return {
          data: null,
          error: 'Property not found',
          success: false
        }
      }

      // Calculate additional metrics
      const totalInvested = (property.total_tokens - property.available_tokens) * property.token_price
      const fundingPercentage = ((property.total_tokens - property.available_tokens) / property.total_tokens) * 100
      const investorCount = property.token_ownership?.length || 0

      const propertyWithDetails: PropertyWithDetails = {
        ...property,
        total_invested: totalInvested,
        funding_percentage: Math.round(fundingPercentage * 100) / 100,
        investor_count: investorCount
      }

      return {
        data: propertyWithDetails,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching property:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch property',
        success: false
      }
    }
  }

  /**
   * Create a new property (admin only)
   */
  static async createProperty(
    propertyData: PropertyInsert
  ): Promise<ApiResponse<Property>> {
    try {
      // Validate required fields
      if (!propertyData.name || !propertyData.address || !propertyData.total_value || !propertyData.token_price) {
        throw new Error('Missing required property fields')
      }

      // Ensure available_tokens equals total_tokens for new properties
      if (!propertyData.available_tokens) {
        propertyData.available_tokens = propertyData.total_tokens || 10000
      }

      const { data: property, error } = await supabase
        .from('properties')
        .insert(propertyData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create property: ${error.message}`)
      }

      return {
        data: property,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error creating property:', error)
      return {
        data: null,
        error: error.message || 'Failed to create property',
        success: false
      }
    }
  }

  /**
   * Update property information
   */
  static async updateProperty(
    id: string,
    updates: PropertyUpdate
  ): Promise<ApiResponse<Property>> {
    try {
      const { data: property, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update property: ${error.message}`)
      }

      return {
        data: property,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error updating property:', error)
      return {
        data: null,
        error: error.message || 'Failed to update property',
        success: false
      }
    }
  }

  /**
   * Get properties by location
   */
  static async getPropertiesByLocation(location: string): Promise<ApiResponse<Property[]>> {
    try {
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .ilike('address->city', `%${location}%`)
        .gt('available_tokens', 0)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch properties by location: ${error.message}`)
      }

      return {
        data: properties || [],
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching properties by location:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch properties by location',
        success: false
      }
    }
  }

  /**
   * Search properties by name or address
   */
  static async searchProperties(searchTerm: string): Promise<ApiResponse<Property[]>> {
    try {
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,address->city.ilike.%${searchTerm}%,address->state.ilike.%${searchTerm}%`)
        .gt('available_tokens', 0)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to search properties: ${error.message}`)
      }

      return {
        data: properties || [],
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error searching properties:', error)
      return {
        data: null,
        error: error.message || 'Failed to search properties',
        success: false
      }
    }
  }
}

// Export legacy functions for backward compatibility
export const fetchProperties = async () => {
  const result = await PropertyService.getProperties()
  if (result.success && result.data) {
    return result.data
  }
  throw new Error(result.error || 'Failed to fetch properties')
}

export const getPropertyById = async (id: string) => {
  const result = await PropertyService.getPropertyById(id)
  if (result.success && result.data) {
    return result.data
  }
  return undefined
}

export const getPropertiesByLocation = async (location: string) => {
  const result = await PropertyService.getPropertiesByLocation(location)
  if (result.success && result.data) {
    return result.data
  }
  return []
}

// Keep mock data for development
export const mockProperties = [
  {
    id: '1',
    title: 'Luxury Manhattan Penthouse',
    description: 'A stunning penthouse in the heart of Manhattan with panoramic city views.',
    location: 'Manhattan, New York',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    totalValue: 2500000,
    tokenPrice: 250,
    totalTokens: 10000,
    availableTokens: 3500,
    minInvestment: 500,
    expectedYield: 8.5,
    listingDate: '2024-01-15',
    propertyType: 'residential',
    status: 'active'
  }
  // ... other mock properties
]