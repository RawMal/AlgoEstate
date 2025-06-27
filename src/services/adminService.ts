import { supabase } from '../lib/supabase'
import { 
  AdminUser, 
  PropertyFormData, 
  TokenizationStatus, 
  PropertyDistribution,
  KYCReviewItem,
  AdminDashboardStats,
  ApiResponse 
} from '../types/admin'
import { Database } from '../types/database'

export class AdminService {
  /**
   * Check if user has admin permissions
   */
  static async checkAdminPermissions(email: string): Promise<ApiResponse<AdminUser>> {
    try {
      // For demo purposes, we'll check against a hardcoded list
      // In production, this would check against an admin_users table
      const adminEmails = [
        'admin@algoestate.com',
        'manager@algoestate.com',
        'super@algoestate.com'
      ]

      if (!adminEmails.includes(email)) {
        return {
          data: null,
          error: 'Access denied. Admin permissions required.',
          success: false
        }
      }

      // Mock admin user data
      const adminUser: AdminUser = {
        id: 'admin-1',
        email,
        role: email.includes('super') ? 'super_admin' : 'admin',
        permissions: [
          {
            resource: 'properties',
            actions: ['create', 'read', 'update', 'delete']
          },
          {
            resource: 'users',
            actions: ['read', 'update']
          },
          {
            resource: 'kyc',
            actions: ['read', 'update']
          },
          {
            resource: 'transactions',
            actions: ['read']
          },
          {
            resource: 'analytics',
            actions: ['read']
          }
        ],
        created_at: new Date().toISOString()
      }

      return {
        data: adminUser,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error checking admin permissions:', error)
      return {
        data: null,
        error: error.message || 'Failed to check admin permissions',
        success: false
      }
    }
  }

  /**
   * Get admin dashboard statistics
   */
  static async getDashboardStats(): Promise<ApiResponse<AdminDashboardStats>> {
    try {
      // Get properties stats
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('available_tokens, total_tokens')

      if (propertiesError) throw propertiesError

      // Get users stats
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('kyc_status')

      if (usersError) throw usersError

      // Get KYC applications stats
      const { data: kycApps, error: kycError } = await supabase
        .from('kyc_applications')
        .select('status, created_at, verified_at')

      if (kycError) throw kycError

      // Get token ownership for transaction stats
      const { data: ownership, error: ownershipError } = await supabase
        .from('token_ownership')
        .select('token_amount, purchase_date')

      if (ownershipError) throw ownershipError

      // Calculate stats
      const propertiesStats = {
        total: properties?.length || 0,
        active: properties?.filter(p => p.available_tokens > 0).length || 0,
        funded: properties?.filter(p => p.available_tokens === 0).length || 0,
        pending: properties?.filter(p => p.available_tokens === p.total_tokens).length || 0
      }

      const usersStats = {
        total: users?.length || 0,
        verified: users?.filter(u => u.kyc_status === 'verified').length || 0,
        pending: users?.filter(u => u.kyc_status === 'pending').length || 0,
        rejected: users?.filter(u => u.kyc_status === 'rejected').length || 0
      }

      const kycStats = {
        pending: kycApps?.filter(app => app.status === 'pending').length || 0,
        approved: kycApps?.filter(app => app.status === 'verified').length || 0,
        rejected: kycApps?.filter(app => app.status === 'rejected').length || 0,
        averageProcessingTime: 2.5 // Mock value in days
      }

      const transactionsStats = {
        total: ownership?.length || 0,
        volume: ownership?.reduce((sum, o) => sum + o.token_amount, 0) || 0,
        fees: 12500, // Mock value
        last24h: ownership?.filter(o => 
          new Date(o.purchase_date) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length || 0
      }

      const stats: AdminDashboardStats = {
        properties: propertiesStats,
        users: usersStats,
        transactions: transactionsStats,
        kyc: kycStats
      }

      return {
        data: stats,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch dashboard stats',
        success: false
      }
    }
  }

  /**
   * Create a new property with comprehensive details
   */
  static async createProperty(
    propertyData: PropertyFormData,
    adminId: string
  ): Promise<ApiResponse<any>> {
    try {
      // Validate required fields
      if (!propertyData.name || !propertyData.totalValue || !propertyData.tokenPrice) {
        throw new Error('Missing required property fields')
      }

      // Prepare property data for database
      const dbPropertyData = {
        name: propertyData.name,
        address: propertyData.address,
        total_value: propertyData.totalValue,
        token_price: propertyData.tokenPrice,
        total_tokens: propertyData.totalTokens || 10000,
        available_tokens: propertyData.totalTokens || 10000,
        metadata_url: null // Will be set after tokenization
      }

      const { data: property, error } = await supabase
        .from('properties')
        .insert(dbPropertyData)
        .select()
        .single()

      if (error) throw error

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
   * Get property distribution analytics
   */
  static async getPropertyDistribution(
    propertyId: string
  ): Promise<ApiResponse<PropertyDistribution>> {
    try {
      // Get property details
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single()

      if (propertyError) throw propertyError

      // Get ownership data
      const { data: ownership, error: ownershipError } = await supabase
        .from('token_ownership')
        .select('wallet_address, token_amount')
        .eq('property_id', propertyId)

      if (ownershipError) throw ownershipError

      // Calculate distribution metrics
      const totalInvestors = ownership?.length || 0
      const totalInvested = (property.total_tokens - property.available_tokens) * property.token_price
      const averageInvestment = totalInvestors > 0 ? totalInvested / totalInvestors : 0

      // Top investors
      const topInvestors = ownership
        ?.sort((a, b) => b.token_amount - a.token_amount)
        .slice(0, 10)
        .map(o => ({
          walletAddress: o.wallet_address,
          tokenAmount: o.token_amount,
          percentage: (o.token_amount / property.total_tokens) * 100,
          investmentValue: o.token_amount * property.token_price
        })) || []

      // Distribution chart data
      const distributionRanges = [
        { range: '1-10 tokens', min: 1, max: 10 },
        { range: '11-50 tokens', min: 11, max: 50 },
        { range: '51-100 tokens', min: 51, max: 100 },
        { range: '101-500 tokens', min: 101, max: 500 },
        { range: '500+ tokens', min: 501, max: Infinity }
      ]

      const distributionChart = distributionRanges.map(range => {
        const count = ownership?.filter(o => 
          o.token_amount >= range.min && o.token_amount <= range.max
        ).length || 0
        
        return {
          range: range.range,
          count,
          percentage: totalInvestors > 0 ? (count / totalInvestors) * 100 : 0
        }
      })

      const distribution: PropertyDistribution = {
        propertyId,
        propertyName: property.name,
        totalTokens: property.total_tokens,
        availableTokens: property.available_tokens,
        fundingPercentage: ((property.total_tokens - property.available_tokens) / property.total_tokens) * 100,
        totalInvestors,
        totalValue: property.total_value,
        averageInvestment,
        topInvestors,
        distributionChart
      }

      return {
        data: distribution,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching property distribution:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch property distribution',
        success: false
      }
    }
  }

  /**
   * Get KYC applications for review
   */
  static async getKYCReviews(
    status?: 'pending' | 'under_review' | 'approved' | 'rejected'
  ): Promise<ApiResponse<KYCReviewItem[]>> {
    try {
      let query = supabase
        .from('kyc_applications')
        .select(`
          *,
          documents:kyc_documents(*)
        `)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: applications, error } = await query

      if (error) throw error

      const kycReviews: KYCReviewItem[] = applications?.map(app => ({
        applicationId: app.id,
        walletAddress: app.wallet_address,
        applicantName: `${app.first_name} ${app.last_name}`,
        email: app.email,
        submittedAt: app.created_at,
        status: app.status as any,
        tier: app.tier,
        documents: app.documents?.map((doc: any) => ({
          type: doc.document_type,
          fileName: doc.file_name,
          uploadedAt: doc.uploaded_at,
          status: doc.status,
          rejectionReason: doc.rejection_reason
        })) || [],
        riskScore: Math.floor(Math.random() * 100), // Mock risk score
        notes: app.rejection_reason,
        reviewedBy: app.verified_at ? 'Admin' : undefined,
        reviewedAt: app.verified_at
      })) || []

      return {
        data: kycReviews,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching KYC reviews:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch KYC reviews',
        success: false
      }
    }
  }

  /**
   * Update KYC application status
   */
  static async updateKYCStatus(
    applicationId: string,
    status: 'approved' | 'rejected',
    notes?: string,
    tier?: number
  ): Promise<ApiResponse<boolean>> {
    try {
      const updateData: any = {
        status: status === 'approved' ? 'verified' : 'rejected',
        updated_at: new Date().toISOString()
      }

      if (status === 'approved') {
        updateData.verified_at = new Date().toISOString()
        updateData.tier = tier || 2
        updateData.investment_limit = tier === 3 ? 500000 : tier === 2 ? 50000 : 5000
      } else {
        updateData.rejection_reason = notes
      }

      const { error } = await supabase
        .from('kyc_applications')
        .update(updateData)
        .eq('id', applicationId)

      if (error) throw error

      return {
        data: true,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error updating KYC status:', error)
      return {
        data: null,
        error: error.message || 'Failed to update KYC status',
        success: false
      }
    }
  }

  /**
   * Upload property images and documents
   */
  static async uploadPropertyFiles(
    propertyId: string,
    files: File[],
    type: 'images' | 'documents'
  ): Promise<ApiResponse<string[]>> {
    try {
      const uploadedUrls: string[] = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${propertyId}_${type}_${Date.now()}.${fileExt}`
        const filePath = `property-${type}/${propertyId}/${fileName}`

        const { data, error } = await supabase.storage
          .from('property-assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) throw error

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('property-assets')
          .getPublicUrl(data.path)

        uploadedUrls.push(urlData.publicUrl)
      }

      return {
        data: uploadedUrls,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error uploading property files:', error)
      return {
        data: null,
        error: error.message || 'Failed to upload files',
        success: false
      }
    }
  }

  /**
   * Get all properties for admin management
   */
  static async getAllProperties(): Promise<ApiResponse<any[]>> {
    try {
      const { data: properties, error } = await supabase
        .from('properties')
        .select(`
          *,
          token_ownership(token_amount)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const propertiesWithStats = properties?.map(property => {
        const totalInvested = property.token_ownership?.reduce(
          (sum: number, ownership: any) => sum + ownership.token_amount, 0
        ) || 0
        
        return {
          ...property,
          totalInvestors: property.token_ownership?.length || 0,
          fundingPercentage: ((property.total_tokens - property.available_tokens) / property.total_tokens) * 100,
          totalInvested: totalInvested * property.token_price
        }
      }) || []

      return {
        data: propertiesWithStats,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching all properties:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch properties',
        success: false
      }
    }
  }
}