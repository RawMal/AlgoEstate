import { supabase } from '../lib/supabase'
import { 
  Database, 
  TokenPurchaseRecord, 
  UserPortfolioItem, 
  ApiResponse 
} from '../types/database'

type TokenOwnership = Database['public']['Tables']['token_ownership']['Row']
type TokenOwnershipInsert = Database['public']['Tables']['token_ownership']['Insert']

export class TokenOwnershipService {
  /**
   * Record a token purchase after blockchain transaction confirmation
   */
  static async recordTokenPurchase(
    purchaseData: TokenPurchaseRecord
  ): Promise<ApiResponse<TokenOwnership>> {
    try {
      // Validate required fields
      if (!purchaseData.property_id || !purchaseData.wallet_address || !purchaseData.token_amount) {
        throw new Error('Missing required purchase data')
      }

      // Check if property exists and has enough available tokens
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('available_tokens, total_tokens')
        .eq('id', purchaseData.property_id)
        .single()

      if (propertyError) {
        throw new Error(`Property not found: ${propertyError.message}`)
      }

      if (property.available_tokens < purchaseData.token_amount) {
        throw new Error('Insufficient tokens available for purchase')
      }

      // Get or create user record
      let userId = purchaseData.user_id
      if (!userId) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', purchaseData.wallet_address)
          .single()

        if (userError && userError.code !== 'PGRST116') {
          throw new Error(`Failed to find user: ${userError.message}`)
        }

        if (!user) {
          // Create new user record
          const { data: newUser, error: createUserError } = await supabase
            .from('users')
            .insert({
              wallet_address: purchaseData.wallet_address,
              email: `${purchaseData.wallet_address}@temp.com`, // Temporary email
              kyc_status: 'pending'
            })
            .select('id')
            .single()

          if (createUserError) {
            throw new Error(`Failed to create user: ${createUserError.message}`)
          }

          userId = newUser.id
        } else {
          userId = user.id
        }
      }

      // Check if user already owns tokens for this property
      const { data: existingOwnership, error: ownershipError } = await supabase
        .from('token_ownership')
        .select('*')
        .eq('property_id', purchaseData.property_id)
        .eq('user_id', userId)
        .single()

      let tokenOwnership: TokenOwnership

      if (existingOwnership) {
        // Update existing ownership
        const { data: updatedOwnership, error: updateError } = await supabase
          .from('token_ownership')
          .update({
            token_amount: existingOwnership.token_amount + purchaseData.token_amount
          })
          .eq('id', existingOwnership.id)
          .select()
          .single()

        if (updateError) {
          throw new Error(`Failed to update token ownership: ${updateError.message}`)
        }

        tokenOwnership = updatedOwnership
      } else {
        // Create new ownership record
        const ownershipData: TokenOwnershipInsert = {
          property_id: purchaseData.property_id,
          user_id: userId,
          wallet_address: purchaseData.wallet_address,
          token_amount: purchaseData.token_amount
        }

        const { data: newOwnership, error: insertError } = await supabase
          .from('token_ownership')
          .insert(ownershipData)
          .select()
          .single()

        if (insertError) {
          throw new Error(`Failed to record token ownership: ${insertError.message}`)
        }

        tokenOwnership = newOwnership
      }

      return {
        data: tokenOwnership,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error recording token purchase:', error)
      return {
        data: null,
        error: error.message || 'Failed to record token purchase',
        success: false
      }
    }
  }

  /**
   * Get user portfolio aggregating all holdings
   */
  static async getUserPortfolio(walletAddress: string): Promise<ApiResponse<UserPortfolioItem[]>> {
    try {
      if (!walletAddress) {
        throw new Error('Wallet address is required')
      }

      // Use the database function for optimized portfolio retrieval
      const { data: portfolio, error } = await supabase
        .rpc('get_user_portfolio', { user_wallet_address: walletAddress })

      if (error) {
        throw new Error(`Failed to fetch user portfolio: ${error.message}`)
      }

      return {
        data: portfolio || [],
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching user portfolio:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch user portfolio',
        success: false
      }
    }
  }

  /**
   * Get token ownership for a specific property
   */
  static async getPropertyOwnership(propertyId: string): Promise<ApiResponse<TokenOwnership[]>> {
    try {
      const { data: ownership, error } = await supabase
        .from('token_ownership')
        .select(`
          *,
          users(email, kyc_status),
          properties(name, token_price)
        `)
        .eq('property_id', propertyId)
        .order('token_amount', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch property ownership: ${error.message}`)
      }

      return {
        data: ownership || [],
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching property ownership:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch property ownership',
        success: false
      }
    }
  }

  /**
   * Get user's token balance for a specific property
   */
  static async getUserTokenBalance(
    walletAddress: string, 
    propertyId: string
  ): Promise<ApiResponse<number>> {
    try {
      const { data: ownership, error } = await supabase
        .from('token_ownership')
        .select('token_amount')
        .eq('wallet_address', walletAddress)
        .eq('property_id', propertyId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch token balance: ${error.message}`)
      }

      return {
        data: ownership?.token_amount || 0,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching token balance:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch token balance',
        success: false
      }
    }
  }

  /**
   * Transfer tokens between users (for secondary market)
   */
  static async transferTokens(
    fromWallet: string,
    toWallet: string,
    propertyId: string,
    tokenAmount: number,
    transactionId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      // Start a transaction
      const { error: transferError } = await supabase.rpc('transfer_tokens', {
        from_wallet: fromWallet,
        to_wallet: toWallet,
        property_uuid: propertyId,
        token_count: tokenAmount,
        tx_id: transactionId
      })

      if (transferError) {
        throw new Error(`Failed to transfer tokens: ${transferError.message}`)
      }

      return {
        data: true,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error transferring tokens:', error)
      return {
        data: null,
        error: error.message || 'Failed to transfer tokens',
        success: false
      }
    }
  }

  /**
   * Get portfolio summary statistics
   */
  static async getPortfolioSummary(walletAddress: string): Promise<ApiResponse<{
    totalValue: number
    totalProperties: number
    totalTokens: number
    averageYield: number
  }>> {
    try {
      const portfolioResult = await this.getUserPortfolio(walletAddress)
      
      if (!portfolioResult.success || !portfolioResult.data) {
        throw new Error(portfolioResult.error || 'Failed to fetch portfolio')
      }

      const portfolio = portfolioResult.data
      
      const summary = {
        totalValue: portfolio.reduce((sum, item) => sum + item.current_value, 0),
        totalProperties: portfolio.length,
        totalTokens: portfolio.reduce((sum, item) => sum + item.token_amount, 0),
        averageYield: portfolio.length > 0 
          ? portfolio.reduce((sum, item) => sum + (item.current_value * 0.08), 0) / portfolio.length 
          : 0
      }

      return {
        data: summary,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error calculating portfolio summary:', error)
      return {
        data: null,
        error: error.message || 'Failed to calculate portfolio summary',
        success: false
      }
    }
  }
}