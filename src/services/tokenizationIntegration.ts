import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { PropertyTokenizationService } from './PropertyTokenizationService'
import { PropertyService } from './propertyService'
import { TokenOwnershipService } from './tokenOwnershipService'
import { PropertyDetails, TokenizationResult } from '../types/tokenization'

/**
 * Integration service that combines tokenization with database operations
 */
export class TokenizationIntegrationService {
  private tokenizationService: PropertyTokenizationService
  private algorand: AlgorandClient

  constructor(algorand: AlgorandClient, platformFeeAddress?: string) {
    this.algorand = algorand
    this.tokenizationService = new PropertyTokenizationService(
      algorand,
      platformFeeAddress
    )
  }

  /**
   * Complete property tokenization workflow
   */
  async tokenizePropertyComplete(
    propertyId: string,
    creatorAddress: string,
    signer: any
  ): Promise<TokenizationResult & { propertyUpdated: boolean }> {
    try {
      // Get property details from database
      const propertyResult = await PropertyService.getPropertyById(propertyId)
      
      if (!propertyResult.success || !propertyResult.data) {
        throw new Error(propertyResult.error || 'Property not found')
      }

      const property = propertyResult.data

      // Convert database property to tokenization format
      const propertyDetails: PropertyDetails = {
        id: property.id,
        name: property.name,
        description: `Tokenized real estate property: ${property.name}`,
        location: property.address?.city || 'Unknown',
        totalValue: Number(property.total_value),
        tokenPrice: Number(property.token_price),
        totalTokens: property.total_tokens,
        propertyType: property.address?.property_type || 'residential',
        expectedYield: 8.0 // Default yield - could be stored in database
      }

      // Tokenize the property
      const tokenizationResult = await this.tokenizationService.tokenizeProperty(
        propertyDetails,
        creatorAddress,
        signer
      )

      if (!tokenizationResult.success || !tokenizationResult.asaId) {
        return {
          ...tokenizationResult,
          propertyUpdated: false
        }
      }

      // Update property with ASA ID
      const updateResult = await PropertyService.updateProperty(propertyId, {
        asa_id: tokenizationResult.asaId,
        metadata_url: `https://algoestate.com/api/metadata/${tokenizationResult.asaId}`
      })

      return {
        ...tokenizationResult,
        propertyUpdated: updateResult.success
      }

    } catch (error: any) {
      console.error('Error in complete tokenization workflow:', error)
      return {
        success: false,
        error: error.message || 'Failed to complete tokenization workflow',
        propertyUpdated: false
      }
    }
  }

  /**
   * Complete token purchase workflow with database recording
   */
  async purchaseTokensComplete(
    propertyId: string,
    buyerAddress: string,
    tokenAmount: number,
    buyerSigner: any,
    sellerSigner: any
  ): Promise<TokenizationResult & { ownershipRecorded: boolean }> {
    try {
      // Get property details
      const propertyResult = await PropertyService.getPropertyById(propertyId)
      
      if (!propertyResult.success || !propertyResult.data) {
        throw new Error('Property not found')
      }

      const property = propertyResult.data

      if (!property.asa_id) {
        throw new Error('Property has not been tokenized yet')
      }

      if (property.available_tokens < tokenAmount) {
        throw new Error('Insufficient tokens available for purchase')
      }

      // Create purchase transaction
      const purchaseParams = {
        asaId: property.asa_id,
        buyerAddress,
        tokenAmount,
        pricePerToken: Number(property.token_price),
        sellerAddress: 'PROPERTY_ESCROW_ADDRESS', // This should be the property's escrow address
        platformFeeAddress: 'PLATFORM_FEE_ADDRESS'
      }

      const transactionGroup = await this.tokenizationService.createPurchaseTransaction(
        purchaseParams,
        buyerSigner
      )

      // Execute the transaction
      const executionResult = await this.tokenizationService.executePurchaseTransaction(
        transactionGroup,
        buyerSigner,
        sellerSigner
      )

      if (!executionResult.success || !executionResult.txId) {
        return {
          ...executionResult,
          ownershipRecorded: false
        }
      }

      // Record the purchase in the database
      const ownershipResult = await TokenOwnershipService.recordTokenPurchase({
        property_id: propertyId,
        wallet_address: buyerAddress,
        token_amount: tokenAmount,
        transaction_id: executionResult.txId,
        blockchain_confirmed: true,
        user_id: '' // Will be resolved by the service
      })

      return {
        ...executionResult,
        ownershipRecorded: ownershipResult.success
      }

    } catch (error: any) {
      console.error('Error in complete purchase workflow:', error)
      return {
        success: false,
        error: error.message || 'Failed to complete purchase workflow',
        ownershipRecorded: false
      }
    }
  }

  /**
   * Get tokenization service instance
   */
  getTokenizationService(): PropertyTokenizationService {
    return this.tokenizationService
  }

  /**
   * Verify token ownership on blockchain matches database
   */
  async verifyOwnership(walletAddress: string, propertyId: string): Promise<{
    blockchainBalance: number
    databaseBalance: number
    matches: boolean
  }> {
    try {
      // Get property ASA ID
      const propertyResult = await PropertyService.getPropertyById(propertyId)
      
      if (!propertyResult.success || !propertyResult.data?.asa_id) {
        throw new Error('Property not found or not tokenized')
      }

      // Get blockchain balance
      const blockchainBalance = await this.tokenizationService.getTokenBalance(
        walletAddress,
        propertyResult.data.asa_id
      )

      // Get database balance
      const databaseResult = await TokenOwnershipService.getUserTokenBalance(
        walletAddress,
        propertyId
      )

      const databaseBalance = databaseResult.success ? databaseResult.data || 0 : 0

      return {
        blockchainBalance,
        databaseBalance,
        matches: blockchainBalance === databaseBalance
      }

    } catch (error: any) {
      console.error('Error verifying ownership:', error)
      throw new Error(error.message || 'Failed to verify ownership')
    }
  }

  /**
   * Sync blockchain state with database
   */
  async syncBlockchainState(propertyId: string): Promise<{
    synced: boolean
    discrepancies: Array<{
      walletAddress: string
      blockchainBalance: number
      databaseBalance: number
    }>
  }> {
    try {
      // Get all ownership records for the property
      const ownershipResult = await TokenOwnershipService.getPropertyOwnership(propertyId)
      
      if (!ownershipResult.success || !ownershipResult.data) {
        throw new Error('Failed to fetch ownership records')
      }

      const discrepancies = []

      // Check each ownership record against blockchain
      for (const ownership of ownershipResult.data) {
        const verification = await this.verifyOwnership(
          ownership.wallet_address,
          propertyId
        )

        if (!verification.matches) {
          discrepancies.push({
            walletAddress: ownership.wallet_address,
            blockchainBalance: verification.blockchainBalance,
            databaseBalance: verification.databaseBalance
          })
        }
      }

      return {
        synced: discrepancies.length === 0,
        discrepancies
      }

    } catch (error: any) {
      console.error('Error syncing blockchain state:', error)
      throw new Error(error.message || 'Failed to sync blockchain state')
    }
  }
}

// Export factory function
export const createTokenizationIntegration = (
  algorand: AlgorandClient,
  platformFeeAddress?: string
) => {
  return new TokenizationIntegrationService(algorand, platformFeeAddress)
}