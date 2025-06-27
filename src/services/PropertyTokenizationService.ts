import { 
  AlgorandClient,
  SendTransactionResult,
  TransactionSignerAccount,
  microAlgos,
  getTransactionParams
} from '@algorandfoundation/algokit-utils'
import { 
  PropertyDetails, 
  TokenizationResult, 
  PurchaseTransactionGroup, 
  TokenMetadata, 
  AssetConfig,
  PurchaseParams 
} from '../types/tokenization'

export class PropertyTokenizationService {
  private algorand: AlgorandClient
  private platformFeeRate: number
  private platformFeeAddress: string

  constructor(
    algorand: AlgorandClient,
    platformFeeAddress: string = 'PLATFORMFEEADDRESSEXAMPLE',
    platformFeeRate: number = 0.02
  ) {
    this.algorand = algorand
    this.platformFeeAddress = platformFeeAddress
    this.platformFeeRate = platformFeeRate
  }

  /**
   * Tokenize a property by creating an ASA with 10,000 tokens
   */
  async tokenizeProperty(
    property: PropertyDetails,
    creatorAddress: string,
    signer: TransactionSignerAccount
  ): Promise<TokenizationResult> {
    try {
      // Validate property data
      this.validatePropertyData(property)

      // Create metadata for the property token
      const metadata = this.createTokenMetadata(property)
      const metadataJson = JSON.stringify(metadata)
      const metadataHash = new TextEncoder().encode(metadataJson)

      // Configure asset parameters
      const assetConfig: AssetConfig = {
        total: BigInt(property.totalTokens || 10000),
        decimals: 0, // Property tokens are indivisible
        defaultFrozen: false,
        unitName: `${property.name.substring(0, 8).toUpperCase()}TKN`,
        assetName: `${property.name} Property Token`,
        url: property.imageUrl,
        metadataHash: metadataHash.length <= 32 ? metadataHash : undefined,
        manager: creatorAddress,
        reserve: creatorAddress,
        freeze: creatorAddress,
        clawback: creatorAddress
      }

      // Create the asset using AlgoKit utils
      const result = await this.algorand.send.assetCreate({
        sender: creatorAddress,
        ...assetConfig,
        signer
      })

      // Extract asset ID from the transaction result
      const assetId = Number(result.confirmation.assetIndex)

      if (!assetId) {
        throw new Error('Failed to retrieve asset ID from transaction')
      }

      return {
        success: true,
        asaId: assetId,
        txId: result.txIds[0],
        confirmedRound: result.confirmation.confirmedRound
      }

    } catch (error: any) {
      console.error('Error tokenizing property:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  /**
   * Create atomic transaction group for token purchase
   */
  async createPurchaseTransaction(
    params: PurchaseParams,
    signer: TransactionSignerAccount
  ): Promise<PurchaseTransactionGroup> {
    try {
      // Validate purchase parameters
      this.validatePurchaseParams(params)

      // Calculate costs
      const totalCost = params.tokenAmount * params.pricePerToken
      const platformFeeRate = params.platformFeeRate || this.platformFeeRate
      const platformFee = totalCost * platformFeeRate
      const sellerAmount = totalCost - platformFee

      // Check if buyer needs to opt-in to the asset
      const requiresOptIn = await this.checkOptInRequired(params.buyerAddress, params.asaId)

      const transactions: any[] = []

      // Transaction 1: Opt-in if required
      if (requiresOptIn) {
        const optInTxn = await this.algorand.transactions.assetOptIn({
          sender: params.buyerAddress,
          assetId: params.asaId,
          signer
        })
        transactions.push(optInTxn)
      }

      // Transaction 2: Payment to seller
      const paymentToSeller = await this.algorand.transactions.payment({
        sender: params.buyerAddress,
        receiver: params.sellerAddress,
        amount: microAlgos(sellerAmount),
        note: `Property token purchase - ${params.tokenAmount} tokens`,
        signer
      })
      transactions.push(paymentToSeller)

      // Transaction 3: Platform fee payment (if applicable)
      if (platformFee > 0 && params.platformFeeAddress) {
        const platformFeePayment = await this.algorand.transactions.payment({
          sender: params.buyerAddress,
          receiver: params.platformFeeAddress,
          amount: microAlgos(platformFee),
          note: 'Platform fee for property token purchase',
          signer
        })
        transactions.push(platformFeePayment)
      }

      // Transaction 4: Asset transfer from seller to buyer
      const assetTransfer = await this.algorand.transactions.assetTransfer({
        sender: params.sellerAddress,
        receiver: params.buyerAddress,
        assetId: params.asaId,
        amount: params.tokenAmount,
        note: `Transfer ${params.tokenAmount} property tokens`,
        signer
      })
      transactions.push(assetTransfer)

      // Group transactions atomically
      const groupId = await this.algorand.transactions.group(transactions)

      return {
        transactions,
        groupId,
        totalCost,
        platformFee,
        requiresOptIn
      }

    } catch (error: any) {
      console.error('Error creating purchase transaction:', error)
      throw new Error(this.formatError(error))
    }
  }

  /**
   * Execute the purchase transaction group
   */
  async executePurchaseTransaction(
    transactionGroup: PurchaseTransactionGroup,
    buyerSigner: TransactionSignerAccount,
    sellerSigner: TransactionSignerAccount
  ): Promise<TokenizationResult> {
    try {
      // Sign transactions with appropriate signers
      const signedTransactions = []

      for (let i = 0; i < transactionGroup.transactions.length; i++) {
        const txn = transactionGroup.transactions[i]
        
        // Determine which signer to use based on transaction type
        if (this.isBuyerTransaction(txn)) {
          signedTransactions.push(await buyerSigner.signer(txn, i))
        } else {
          signedTransactions.push(await sellerSigner.signer(txn, i))
        }
      }

      // Submit the transaction group
      const result = await this.algorand.send.groupTransactions({
        transactions: signedTransactions
      })

      return {
        success: true,
        txId: result.txIds[0],
        confirmedRound: result.confirmations?.[0]?.confirmedRound
      }

    } catch (error: any) {
      console.error('Error executing purchase transaction:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  /**
   * Check if an account has opted into an asset
   */
  async checkOptInRequired(accountAddress: string, assetId: number): Promise<boolean> {
    try {
      const accountInfo = await this.algorand.account.getInformation(accountAddress)
      
      // Check if the asset exists in the account's assets
      const hasAsset = accountInfo.assets?.some(asset => asset.assetId === assetId)
      
      return !hasAsset
    } catch (error) {
      // If we can't determine, assume opt-in is required for safety
      return true
    }
  }

  /**
   * Get asset information
   */
  async getAssetInfo(assetId: number) {
    try {
      return await this.algorand.asset.getById(assetId)
    } catch (error: any) {
      console.error('Error fetching asset info:', error)
      throw new Error(this.formatError(error))
    }
  }

  /**
   * Get account's asset balance
   */
  async getTokenBalance(accountAddress: string, assetId: number): Promise<number> {
    try {
      const accountInfo = await this.algorand.account.getInformation(accountAddress)
      
      const asset = accountInfo.assets?.find(a => a.assetId === assetId)
      return asset?.amount || 0
    } catch (error: any) {
      console.error('Error fetching token balance:', error)
      return 0
    }
  }

  /**
   * Create property token metadata
   */
  private createTokenMetadata(property: PropertyDetails): TokenMetadata {
    return {
      name: `${property.name} Property Token`,
      description: property.description,
      image: property.imageUrl || '',
      external_url: `https://algoestate.com/property/${property.id}`,
      properties: {
        property_id: property.id,
        location: property.location,
        total_value: property.totalValue,
        token_price: property.tokenPrice,
        expected_yield: property.expectedYield,
        property_type: property.propertyType
      }
    }
  }

  /**
   * Validate property data before tokenization
   */
  private validatePropertyData(property: PropertyDetails): void {
    if (!property.name || property.name.length === 0) {
      throw new Error('Property name is required')
    }

    if (!property.id || property.id.length === 0) {
      throw new Error('Property ID is required')
    }

    if (property.totalValue <= 0) {
      throw new Error('Property total value must be greater than 0')
    }

    if (property.tokenPrice <= 0) {
      throw new Error('Token price must be greater than 0')
    }

    if (property.totalTokens <= 0 || property.totalTokens > 18446744073709551615) {
      throw new Error('Total tokens must be between 1 and 18,446,744,073,709,551,615')
    }

    if (property.expectedYield < 0 || property.expectedYield > 100) {
      throw new Error('Expected yield must be between 0 and 100')
    }
  }

  /**
   * Validate purchase parameters
   */
  private validatePurchaseParams(params: PurchaseParams): void {
    if (!params.buyerAddress || !this.isValidAddress(params.buyerAddress)) {
      throw new Error('Invalid buyer address')
    }

    if (!params.sellerAddress || !this.isValidAddress(params.sellerAddress)) {
      throw new Error('Invalid seller address')
    }

    if (params.asaId <= 0) {
      throw new Error('Invalid asset ID')
    }

    if (params.tokenAmount <= 0) {
      throw new Error('Token amount must be greater than 0')
    }

    if (params.pricePerToken <= 0) {
      throw new Error('Price per token must be greater than 0')
    }

    if (params.platformFeeRate && (params.platformFeeRate < 0 || params.platformFeeRate > 1)) {
      throw new Error('Platform fee rate must be between 0 and 1')
    }
  }

  /**
   * Check if a transaction should be signed by the buyer
   */
  private isBuyerTransaction(transaction: any): boolean {
    // This is a simplified check - in practice, you'd examine the transaction type
    // and sender to determine the appropriate signer
    return transaction.type === 'pay' || transaction.type === 'axfer' && transaction.amount === 0
  }

  /**
   * Validate Algorand address format
   */
  private isValidAddress(address: string): boolean {
    try {
      // Basic validation - AlgoKit utils should provide address validation
      return address.length === 58 && /^[A-Z2-7]+$/.test(address)
    } catch {
      return false
    }
  }

  /**
   * Format error messages for better user experience
   */
  private formatError(error: any): string {
    if (typeof error === 'string') {
      return error
    }

    if (error.message) {
      // Handle common AlgoKit/Algorand errors
      if (error.message.includes('insufficient funds')) {
        return 'Insufficient funds for this transaction'
      }
      if (error.message.includes('asset not found')) {
        return 'Property token not found'
      }
      if (error.message.includes('account not opted in')) {
        return 'Account must opt-in to receive this asset'
      }
      if (error.message.includes('rejected')) {
        return 'Transaction was rejected by user'
      }
      if (error.message.includes('network')) {
        return 'Network error. Please check your connection'
      }
      if (error.message.includes('asset frozen')) {
        return 'Asset transfers are currently frozen'
      }
      if (error.message.includes('asset deleted')) {
        return 'This asset has been deleted'
      }
      
      return error.message
    }

    return 'An unexpected error occurred during tokenization'
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig() {
    return {
      platformFeeAddress: this.platformFeeAddress,
      platformFeeRate: this.platformFeeRate,
      defaultTokenSupply: 10000,
      network: this.algorand.client.network
    }
  }

  /**
   * Update platform configuration
   */
  updatePlatformConfig(config: {
    platformFeeAddress?: string
    platformFeeRate?: number
  }) {
    if (config.platformFeeAddress) {
      this.platformFeeAddress = config.platformFeeAddress
    }
    if (config.platformFeeRate !== undefined) {
      this.platformFeeRate = config.platformFeeRate
    }
  }
}

// Export a factory function for easy instantiation
export const createPropertyTokenizationService = (
  algorand: AlgorandClient,
  platformFeeAddress?: string,
  platformFeeRate?: number
) => {
  return new PropertyTokenizationService(algorand, platformFeeAddress, platformFeeRate)
}