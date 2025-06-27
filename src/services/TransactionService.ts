import { 
  AlgorandClient,
  Config,
  microAlgos,
  getTransactionParams,
  SendTransactionResult,
  AssetCreateParams,
  AssetTransferParams,
  PaymentParams
} from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'

export interface PropertyASAConfig {
  name: string
  unitName: string
  total: number
  decimals: number
  url?: string
  metadataHash?: Uint8Array
  manager?: string
  reserve?: string
  freeze?: string
  clawback?: string
}

export interface TokenPurchaseParams {
  propertyAssetId: number
  tokenAmount: number
  tokenPriceInAlgos: number
  sellerAddress: string
  platformFeeRate?: number
  platformFeeAddress?: string
}

export interface TokenBalance {
  assetId: number
  balance: number
  frozen: boolean
  assetName?: string
  unitName?: string
}

export interface TransactionResult {
  success: boolean
  txId?: string
  assetId?: number
  error?: string
  confirmedRound?: number
}

export interface AccountAssets {
  algo: number
  assets: TokenBalance[]
}

export class TransactionService {
  private client: AlgorandClient
  private isTestNet: boolean

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.isTestNet = network === 'testnet'
    
    if (this.isTestNet) {
      this.client = AlgorandClient.testNet()
    } else {
      this.client = AlgorandClient.mainNet()
    }
  }

  /**
   * Creates a new property ASA (Algorand Standard Asset) with 10,000 tokens
   */
  async createPropertyASA(
    creatorAddress: string,
    config: PropertyASAConfig,
    signTransaction: (txn: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<TransactionResult> {
    try {
      // Validate creator address
      if (!this.isValidAddress(creatorAddress)) {
        throw new Error('Invalid creator address')
      }

      // Get suggested transaction parameters
      const suggestedParams = await this.client.client.getTransactionParams().do()

      // Create asset configuration with defaults
      const assetConfig: AssetCreateParams = {
        sender: creatorAddress,
        total: config.total || 10000n, // Default to 10,000 tokens
        decimals: config.decimals || 0,
        assetName: config.name,
        unitName: config.unitName,
        url: config.url,
        metadataHash: config.metadataHash,
        defaultFrozen: false,
        manager: config.manager || creatorAddress,
        reserve: config.reserve || creatorAddress,
        freeze: config.freeze || creatorAddress,
        clawback: config.clawback || creatorAddress,
        suggestedParams
      }

      // Create the asset creation transaction
      const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(assetConfig)

      // Sign the transaction
      const encodedTxn = algosdk.encodeUnsignedTransaction(assetCreateTxn)
      const signedTxns = await signTransaction([encodedTxn])

      // Submit the transaction
      const { txId } = await this.client.client.sendRawTransaction(signedTxns).do()

      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(this.client.client, txId, 4)

      // Extract asset ID from the confirmed transaction
      const assetId = confirmedTxn['asset-index']

      return {
        success: true,
        txId,
        assetId,
        confirmedRound: confirmedTxn['confirmed-round']
      }

    } catch (error: any) {
      console.error('Error creating property ASA:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  /**
   * Creates an atomic transaction group for purchasing property tokens
   */
  async purchaseTokens(
    buyerAddress: string,
    params: TokenPurchaseParams,
    signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<TransactionResult> {
    try {
      // Validate addresses
      if (!this.isValidAddress(buyerAddress)) {
        throw new Error('Invalid buyer address')
      }
      if (!this.isValidAddress(params.sellerAddress)) {
        throw new Error('Invalid seller address')
      }

      // Calculate costs
      const totalCostAlgos = params.tokenAmount * params.tokenPriceInAlgos
      const platformFeeRate = params.platformFeeRate || 0.02 // Default 2%
      const platformFee = totalCostAlgos * platformFeeRate
      const totalCostMicroAlgos = microAlgos(totalCostAlgos).microAlgos
      const platformFeeMicroAlgos = microAlgos(platformFee).microAlgos

      // Get suggested transaction parameters
      const suggestedParams = await this.client.client.getTransactionParams().do()

      const transactions: algosdk.Transaction[] = []

      // Transaction 1: Payment to seller for tokens
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: buyerAddress,
        to: params.sellerAddress,
        amount: totalCostMicroAlgos,
        suggestedParams,
        note: new TextEncoder().encode(`Purchase ${params.tokenAmount} property tokens`)
      })
      transactions.push(paymentTxn)

      // Transaction 2: Asset transfer from seller to buyer
      const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: params.sellerAddress,
        to: buyerAddress,
        assetIndex: params.propertyAssetId,
        amount: params.tokenAmount,
        suggestedParams,
        note: new TextEncoder().encode(`Transfer ${params.tokenAmount} property tokens`)
      })
      transactions.push(assetTransferTxn)

      // Transaction 3: Platform fee (if specified)
      if (params.platformFeeAddress && platformFeeMicroAlgos > 0) {
        if (!this.isValidAddress(params.platformFeeAddress)) {
          throw new Error('Invalid platform fee address')
        }

        const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: buyerAddress,
          to: params.platformFeeAddress,
          amount: platformFeeMicroAlgos,
          suggestedParams,
          note: new TextEncoder().encode('Platform fee for property token purchase')
        })
        transactions.push(feeTxn)
      }

      // Group transactions atomically
      const groupedTxns = algosdk.assignGroupID(transactions)

      // Encode transactions for signing
      const encodedTxns = groupedTxns.map(txn => algosdk.encodeUnsignedTransaction(txn))

      // Sign transactions
      const signedTxns = await signTransactions(encodedTxns)

      // Submit transaction group
      const { txId } = await this.client.client.sendRawTransaction(signedTxns).do()

      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(this.client.client, txId, 4)

      return {
        success: true,
        txId,
        confirmedRound: confirmedTxn['confirmed-round']
      }

    } catch (error: any) {
      console.error('Error purchasing tokens:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  /**
   * Gets the token balance for a specific asset in a user's account
   */
  async getTokenBalance(
    accountAddress: string,
    assetId: number
  ): Promise<TokenBalance | null> {
    try {
      if (!this.isValidAddress(accountAddress)) {
        throw new Error('Invalid account address')
      }

      const accountInfo = await this.client.account.getInformation(accountAddress)
      
      // Find the specific asset in the account's assets
      const asset = accountInfo.assets?.find(a => a['asset-id'] === assetId)
      
      if (!asset) {
        return null // Account doesn't hold this asset
      }

      // Get asset information for metadata
      let assetInfo
      try {
        assetInfo = await this.client.client.getAssetByID(assetId).do()
      } catch {
        // Asset info might not be available
        assetInfo = null
      }

      return {
        assetId,
        balance: asset.amount,
        frozen: asset['is-frozen'] || false,
        assetName: assetInfo?.params?.name,
        unitName: assetInfo?.params?.['unit-name']
      }

    } catch (error: any) {
      console.error('Error getting token balance:', error)
      throw new Error(this.formatError(error))
    }
  }

  /**
   * Gets all assets (including ALGO) for an account
   */
  async getAccountAssets(accountAddress: string): Promise<AccountAssets> {
    try {
      if (!this.isValidAddress(accountAddress)) {
        throw new Error('Invalid account address')
      }

      const accountInfo = await this.client.account.getInformation(accountAddress)
      
      // ALGO balance - explicitly convert BigInt to number
      const algoBalance = Number(accountInfo.amount) / 1_000_000

      // Asset balances
      const assets: TokenBalance[] = []
      
      if (accountInfo.assets) {
        for (const asset of accountInfo.assets) {
          const assetId = asset['asset-id']
          
          // Get asset metadata
          let assetInfo
          try {
            assetInfo = await this.client.client.getAssetByID(assetId).do()
          } catch {
            assetInfo = null
          }

          assets.push({
            assetId,
            balance: asset.amount,
            frozen: asset['is-frozen'] || false,
            assetName: assetInfo?.params?.name,
            unitName: assetInfo?.params?.['unit-name']
          })
        }
      }

      return {
        algo: algoBalance,
        assets
      }

    } catch (error: any) {
      console.error('Error getting account assets:', error)
      throw new Error(this.formatError(error))
    }
  }

  /**
   * Opts an account into an asset (required before receiving the asset)
   */
  async optInToAsset(
    accountAddress: string,
    assetId: number,
    signTransaction: (txn: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<TransactionResult> {
    try {
      if (!this.isValidAddress(accountAddress)) {
        throw new Error('Invalid account address')
      }

      const suggestedParams = await this.client.client.getTransactionParams().do()

      // Create opt-in transaction (asset transfer of 0 to self)
      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: accountAddress,
        to: accountAddress,
        assetIndex: assetId,
        amount: 0,
        suggestedParams,
        note: new TextEncoder().encode(`Opt-in to asset ${assetId}`)
      })

      // Sign the transaction
      const encodedTxn = algosdk.encodeUnsignedTransaction(optInTxn)
      const signedTxns = await signTransaction([encodedTxn])

      // Submit the transaction
      const { txId } = await this.client.client.sendRawTransaction(signedTxns).do()

      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(this.client.client, txId, 4)

      return {
        success: true,
        txId,
        confirmedRound: confirmedTxn['confirmed-round']
      }

    } catch (error: any) {
      console.error('Error opting into asset:', error)
      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  /**
   * Checks if an account has opted into a specific asset
   */
  async hasOptedInToAsset(accountAddress: string, assetId: number): Promise<boolean> {
    try {
      const balance = await this.getTokenBalance(accountAddress, assetId)
      return balance !== null
    } catch {
      return false
    }
  }

  /**
   * Gets the current network (testnet/mainnet)
   */
  getNetwork(): 'testnet' | 'mainnet' {
    return this.isTestNet ? 'testnet' : 'mainnet'
  }

  /**
   * Gets the Algorand client instance
   */
  getClient(): AlgorandClient {
    return this.client
  }

  /**
   * Validates an Algorand address
   */
  private isValidAddress(address: string): boolean {
    try {
      algosdk.decodeAddress(address)
      return true
    } catch {
      return false
    }
  }

  /**
   * Formats error messages for better user experience
   */
  private formatError(error: any): string {
    if (typeof error === 'string') {
      return error
    }

    if (error.message) {
      // Handle common Algorand errors
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
      
      return error.message
    }

    return 'An unexpected error occurred'
  }
}

// Export a default instance for convenience
export const transactionService = new TransactionService(
  process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet'
)