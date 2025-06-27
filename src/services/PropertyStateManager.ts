import { 
  AlgorandClient,
  AlgorandSubscriber,
  SubscriberConfigFilter
} from '@algorandfoundation/algokit-utils'
import { EventEmitter } from 'events'
import { 
  PropertyState, 
  TokenOwnership, 
  PropertyTransaction, 
  PropertyStateEvent,
  OwnershipSummary,
  StateManagerConfig,
  CachedPropertyData
} from '../types/propertyState'
import { PropertyService } from './propertyService'
import { TokenOwnershipService } from './tokenOwnershipService'

export class PropertyStateManager extends EventEmitter {
  private algorand: AlgorandClient
  private subscriber: AlgorandSubscriber | null = null
  private propertyCache: Map<string, CachedPropertyData> = new Map()
  private asaToPropertyMap: Map<number, string> = new Map()
  private config: StateManagerConfig
  private isRunning: boolean = false
  private syncTimer: NodeJS.Timeout | null = null

  constructor(
    algorand: AlgorandClient,
    config: Partial<StateManagerConfig> = {}
  ) {
    super()
    this.algorand = algorand
    this.config = {
      syncInterval: 30000, // 30 seconds
      maxCacheSize: 100,
      enableRealTimeUpdates: true,
      retryAttempts: 3,
      batchSize: 10,
      ...config
    }
  }

  /**
   * Initialize the state manager and start monitoring
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing PropertyStateManager...')
      
      // Load initial property data
      await this.loadInitialData()
      
      // Set up blockchain subscriber if real-time updates are enabled
      if (this.config.enableRealTimeUpdates) {
        await this.setupBlockchainSubscriber()
      }
      
      // Start periodic sync
      this.startPeriodicSync()
      
      this.isRunning = true
      this.emit('initialized')
      
      console.log('PropertyStateManager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize PropertyStateManager:', error)
      this.emitError('initialization_failed', error)
      throw error
    }
  }

  /**
   * Stop the state manager and cleanup resources
   */
  async stop(): Promise<void> {
    try {
      console.log('Stopping PropertyStateManager...')
      
      this.isRunning = false
      
      // Stop periodic sync
      if (this.syncTimer) {
        clearInterval(this.syncTimer)
        this.syncTimer = null
      }
      
      // Stop blockchain subscriber
      if (this.subscriber) {
        await this.subscriber.stop()
        this.subscriber = null
      }
      
      // Clear cache
      this.propertyCache.clear()
      this.asaToPropertyMap.clear()
      
      this.emit('stopped')
      console.log('PropertyStateManager stopped')
    } catch (error) {
      console.error('Error stopping PropertyStateManager:', error)
      this.emitError('stop_failed', error)
    }
  }

  /**
   * Add a property to monitoring
   */
  async addProperty(propertyId: string): Promise<void> {
    try {
      if (this.propertyCache.has(propertyId)) {
        console.log(`Property ${propertyId} already being monitored`)
        return
      }

      // Get property details from database
      const propertyResult = await PropertyService.getPropertyById(propertyId)
      
      if (!propertyResult.success || !propertyResult.data) {
        throw new Error(`Property ${propertyId} not found`)
      }

      const property = propertyResult.data

      if (!property.asa_id) {
        throw new Error(`Property ${propertyId} has not been tokenized`)
      }

      // Initialize property state
      const initialState: PropertyState = {
        propertyId,
        asaId: property.asa_id,
        totalTokens: property.total_tokens,
        availableTokens: property.available_tokens,
        tokenPrice: Number(property.token_price),
        totalValue: Number(property.total_value),
        fundingPercentage: ((property.total_tokens - property.available_tokens) / property.total_tokens) * 100,
        lastUpdated: new Date(),
        transactionCount: 0
      }

      // Load ownership data
      const ownershipMap = await this.loadOwnershipData(propertyId)
      
      // Initialize cached data
      const cachedData: CachedPropertyData = {
        state: initialState,
        ownership: ownershipMap,
        transactions: [],
        lastSync: new Date(),
        syncInProgress: false
      }

      this.propertyCache.set(propertyId, cachedData)
      this.asaToPropertyMap.set(property.asa_id, propertyId)

      // Update subscriber filters if running
      if (this.subscriber && this.isRunning) {
        await this.updateSubscriberFilters()
      }

      this.emit('property_added', { propertyId, asaId: property.asa_id })
      console.log(`Added property ${propertyId} (ASA: ${property.asa_id}) to monitoring`)
    } catch (error) {
      console.error(`Error adding property ${propertyId}:`, error)
      this.emitError('add_property_failed', error, { propertyId })
      throw error
    }
  }

  /**
   * Remove a property from monitoring
   */
  removeProperty(propertyId: string): void {
    const cachedData = this.propertyCache.get(propertyId)
    
    if (cachedData) {
      this.asaToPropertyMap.delete(cachedData.state.asaId)
      this.propertyCache.delete(propertyId)
      
      this.emit('property_removed', { propertyId })
      console.log(`Removed property ${propertyId} from monitoring`)
    }
  }

  /**
   * Get current property state
   */
  getPropertyState(propertyId: string): PropertyState | null {
    const cachedData = this.propertyCache.get(propertyId)
    return cachedData ? { ...cachedData.state } : null
  }

  /**
   * Get property ownership data
   */
  getPropertyOwnership(propertyId: string): TokenOwnership[] {
    const cachedData = this.propertyCache.get(propertyId)
    return cachedData ? Array.from(cachedData.ownership.values()) : []
  }

  /**
   * Get ownership summary with statistics
   */
  getOwnershipSummary(propertyId: string): OwnershipSummary | null {
    const ownership = this.getPropertyOwnership(propertyId)
    
    if (ownership.length === 0) {
      return null
    }

    // Sort by ownership percentage
    const sortedOwnership = ownership.sort((a, b) => b.ownershipPercentage - a.ownershipPercentage)
    
    // Calculate statistics
    const totalOwners = ownership.length
    const topOwners = sortedOwnership.slice(0, 10)
    
    const ownershipPercentages = ownership.map(o => o.ownershipPercentage)
    const averageOwnership = ownershipPercentages.reduce((sum, p) => sum + p, 0) / totalOwners
    
    // Calculate median
    const sortedPercentages = [...ownershipPercentages].sort((a, b) => a - b)
    const medianOwnership = totalOwners % 2 === 0
      ? (sortedPercentages[totalOwners / 2 - 1] + sortedPercentages[totalOwners / 2]) / 2
      : sortedPercentages[Math.floor(totalOwners / 2)]
    
    // Calculate concentration ratio (top 10% of owners)
    const top10PercentCount = Math.max(1, Math.ceil(totalOwners * 0.1))
    const concentrationRatio = sortedOwnership
      .slice(0, top10PercentCount)
      .reduce((sum, o) => sum + o.ownershipPercentage, 0)

    return {
      totalOwners,
      topOwners,
      distributionStats: {
        averageOwnership,
        medianOwnership,
        concentrationRatio
      }
    }
  }

  /**
   * Get recent transactions for a property
   */
  getPropertyTransactions(propertyId: string, limit: number = 50): PropertyTransaction[] {
    const cachedData = this.propertyCache.get(propertyId)
    
    if (!cachedData) {
      return []
    }

    return cachedData.transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Force sync property state from blockchain and database
   */
  async syncProperty(propertyId: string): Promise<void> {
    const cachedData = this.propertyCache.get(propertyId)
    
    if (!cachedData) {
      throw new Error(`Property ${propertyId} not found in cache`)
    }

    if (cachedData.syncInProgress) {
      console.log(`Sync already in progress for property ${propertyId}`)
      return
    }

    try {
      cachedData.syncInProgress = true

      // Sync from database
      await this.syncFromDatabase(propertyId)
      
      // Sync from blockchain
      await this.syncFromBlockchain(propertyId)
      
      cachedData.lastSync = new Date()
      
      this.emitStateEvent('state_synced', propertyId, {
        state: cachedData.state,
        ownershipCount: cachedData.ownership.size
      })
      
      console.log(`Synced property ${propertyId} successfully`)
    } catch (error) {
      console.error(`Error syncing property ${propertyId}:`, error)
      this.emitError('sync_failed', error, { propertyId })
      throw error
    } finally {
      cachedData.syncInProgress = false
    }
  }

  /**
   * Get all monitored properties
   */
  getMonitoredProperties(): string[] {
    return Array.from(this.propertyCache.keys())
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalProperties: number
    totalOwners: number
    totalTransactions: number
    lastSyncTimes: Record<string, Date>
  } {
    let totalOwners = 0
    let totalTransactions = 0
    const lastSyncTimes: Record<string, Date> = {}

    for (const [propertyId, cachedData] of this.propertyCache) {
      totalOwners += cachedData.ownership.size
      totalTransactions += cachedData.transactions.length
      lastSyncTimes[propertyId] = cachedData.lastSync
    }

    return {
      totalProperties: this.propertyCache.size,
      totalOwners,
      totalTransactions,
      lastSyncTimes
    }
  }

  /**
   * Load initial data for all tokenized properties
   */
  private async loadInitialData(): Promise<void> {
    try {
      // Get all properties with ASA IDs
      const propertiesResult = await PropertyService.getProperties({}, { limit: 100 })
      
      if (!propertiesResult.success || !propertiesResult.data) {
        throw new Error('Failed to load initial properties')
      }

      const tokenizedProperties = propertiesResult.data.filter(p => p.asa_id)
      
      console.log(`Loading ${tokenizedProperties.length} tokenized properties`)

      // Load properties in batches
      const batches = this.chunkArray(tokenizedProperties, this.config.batchSize)
      
      for (const batch of batches) {
        await Promise.all(
          batch.map(property => this.addProperty(property.id))
        )
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      throw error
    }
  }

  /**
   * Load ownership data for a property
   */
  private async loadOwnershipData(propertyId: string): Promise<Map<string, TokenOwnership>> {
    const ownershipMap = new Map<string, TokenOwnership>()

    try {
      const ownershipResult = await TokenOwnershipService.getPropertyOwnership(propertyId)
      
      if (ownershipResult.success && ownershipResult.data) {
        const propertyState = this.propertyCache.get(propertyId)?.state
        
        for (const ownership of ownershipResult.data) {
          const ownershipPercentage = propertyState 
            ? (ownership.token_amount / propertyState.totalTokens) * 100
            : 0

          ownershipMap.set(ownership.wallet_address, {
            walletAddress: ownership.wallet_address,
            tokenAmount: ownership.token_amount,
            ownershipPercentage,
            purchaseDate: new Date(ownership.purchase_date),
            lastTransactionId: ''
          })
        }
      }
    } catch (error) {
      console.error(`Error loading ownership data for ${propertyId}:`, error)
    }

    return ownershipMap
  }

  /**
   * Setup blockchain subscriber for real-time updates
   */
  private async setupBlockchainSubscriber(): Promise<void> {
    try {
      const monitoredAsaIds = Array.from(this.asaToPropertyMap.keys())
      
      if (monitoredAsaIds.length === 0) {
        console.log('No ASAs to monitor, skipping subscriber setup')
        return
      }

      // Create filters for asset transfers
      const filters: SubscriberConfigFilter[] = monitoredAsaIds.map(asaId => ({
        name: `asset-transfer-${asaId}`,
        filter: {
          type: 'axfer',
          'asset-id': asaId
        }
      }))

      this.subscriber = new AlgorandSubscriber({
        filters,
        maxRoundsToSync: 100,
        syncBehaviour: 'sync-oldest',
        watermarkPersistence: {
          get: async () => 0,
          set: async () => {}
        }
      }, this.algorand.client)

      // Set up event handlers
      for (const asaId of monitoredAsaIds) {
        this.subscriber.on(`asset-transfer-${asaId}`, (transaction) => {
          this.handleAssetTransfer(asaId, transaction)
        })
      }

      this.subscriber.on('error', (error) => {
        console.error('Blockchain subscriber error:', error)
        this.emitError('subscriber_error', error)
      })

      await this.subscriber.start()
      console.log(`Blockchain subscriber started for ${monitoredAsaIds.length} ASAs`)
    } catch (error) {
      console.error('Error setting up blockchain subscriber:', error)
      throw error
    }
  }

  /**
   * Update subscriber filters when properties are added/removed
   */
  private async updateSubscriberFilters(): Promise<void> {
    if (!this.subscriber) return

    try {
      await this.subscriber.stop()
      await this.setupBlockchainSubscriber()
    } catch (error) {
      console.error('Error updating subscriber filters:', error)
      this.emitError('filter_update_failed', error)
    }
  }

  /**
   * Handle asset transfer events from blockchain
   */
  private async handleAssetTransfer(asaId: number, transaction: any): Promise<void> {
    try {
      const propertyId = this.asaToPropertyMap.get(asaId)
      
      if (!propertyId) {
        console.warn(`Received transaction for unknown ASA ${asaId}`)
        return
      }

      const cachedData = this.propertyCache.get(propertyId)
      
      if (!cachedData) {
        console.warn(`No cached data for property ${propertyId}`)
        return
      }

      // Parse transaction data
      const txData: PropertyTransaction = {
        txId: transaction.id,
        type: this.determineTransactionType(transaction),
        fromAddress: transaction.sender,
        toAddress: transaction['asset-transfer-transaction']?.receiver || '',
        tokenAmount: transaction['asset-transfer-transaction']?.amount || 0,
        timestamp: new Date(transaction['round-time'] * 1000),
        blockNumber: transaction['confirmed-round'],
        confirmed: true
      }

      // Add to transaction history
      cachedData.transactions.push(txData)
      
      // Keep only recent transactions to manage memory
      if (cachedData.transactions.length > 1000) {
        cachedData.transactions = cachedData.transactions.slice(-500)
      }

      // Update ownership if this is a token transfer
      if (txData.type === 'purchase' || txData.type === 'transfer') {
        await this.updateOwnershipFromTransaction(propertyId, txData)
      }

      // Update property state
      await this.updatePropertyState(propertyId)

      // Emit events
      this.emitStateEvent('tokens_transferred', propertyId, txData)
      
      console.log(`Processed ${txData.type} transaction for property ${propertyId}: ${txData.txId}`)
    } catch (error) {
      console.error(`Error handling asset transfer for ASA ${asaId}:`, error)
      this.emitError('transaction_processing_failed', error, { asaId, transaction })
    }
  }

  /**
   * Update ownership data from a transaction
   */
  private async updateOwnershipFromTransaction(
    propertyId: string, 
    transaction: PropertyTransaction
  ): Promise<void> {
    const cachedData = this.propertyCache.get(propertyId)
    
    if (!cachedData) return

    // Update sender ownership (decrease)
    if (transaction.fromAddress && transaction.tokenAmount > 0) {
      const senderOwnership = cachedData.ownership.get(transaction.fromAddress)
      
      if (senderOwnership) {
        senderOwnership.tokenAmount -= transaction.tokenAmount
        senderOwnership.ownershipPercentage = (senderOwnership.tokenAmount / cachedData.state.totalTokens) * 100
        senderOwnership.lastTransactionId = transaction.txId
        
        if (senderOwnership.tokenAmount <= 0) {
          cachedData.ownership.delete(transaction.fromAddress)
        }
      }
    }

    // Update receiver ownership (increase)
    if (transaction.toAddress && transaction.tokenAmount > 0) {
      let receiverOwnership = cachedData.ownership.get(transaction.toAddress)
      
      if (!receiverOwnership) {
        receiverOwnership = {
          walletAddress: transaction.toAddress,
          tokenAmount: 0,
          ownershipPercentage: 0,
          purchaseDate: transaction.timestamp,
          lastTransactionId: transaction.txId
        }
        cachedData.ownership.set(transaction.toAddress, receiverOwnership)
      }
      
      receiverOwnership.tokenAmount += transaction.tokenAmount
      receiverOwnership.ownershipPercentage = (receiverOwnership.tokenAmount / cachedData.state.totalTokens) * 100
      receiverOwnership.lastTransactionId = transaction.txId
    }

    this.emitStateEvent('ownership_updated', propertyId, {
      transaction,
      ownershipCount: cachedData.ownership.size
    })
  }

  /**
   * Update property state calculations
   */
  private async updatePropertyState(propertyId: string): Promise<void> {
    const cachedData = this.propertyCache.get(propertyId)
    
    if (!cachedData) return

    // Calculate available tokens from ownership
    const totalOwnedTokens = Array.from(cachedData.ownership.values())
      .reduce((sum, ownership) => sum + ownership.tokenAmount, 0)
    
    cachedData.state.availableTokens = cachedData.state.totalTokens - totalOwnedTokens
    cachedData.state.fundingPercentage = (totalOwnedTokens / cachedData.state.totalTokens) * 100
    cachedData.state.lastUpdated = new Date()
    cachedData.state.transactionCount = cachedData.transactions.length
  }

  /**
   * Sync property data from database
   */
  private async syncFromDatabase(propertyId: string): Promise<void> {
    try {
      // Reload property details
      const propertyResult = await PropertyService.getPropertyById(propertyId)
      
      if (propertyResult.success && propertyResult.data) {
        const cachedData = this.propertyCache.get(propertyId)
        
        if (cachedData) {
          // Update basic property info
          cachedData.state.availableTokens = propertyResult.data.available_tokens
          cachedData.state.tokenPrice = Number(propertyResult.data.token_price)
          cachedData.state.totalValue = Number(propertyResult.data.total_value)
        }
      }

      // Reload ownership data
      const newOwnershipMap = await this.loadOwnershipData(propertyId)
      const cachedData = this.propertyCache.get(propertyId)
      
      if (cachedData) {
        cachedData.ownership = newOwnershipMap
        await this.updatePropertyState(propertyId)
      }
    } catch (error) {
      console.error(`Error syncing from database for ${propertyId}:`, error)
      throw error
    }
  }

  /**
   * Sync property data from blockchain
   */
  private async syncFromBlockchain(propertyId: string): Promise<void> {
    const cachedData = this.propertyCache.get(propertyId)
    
    if (!cachedData) return

    try {
      // Get asset information from blockchain
      const assetInfo = await this.algorand.asset.getById(cachedData.state.asaId)
      
      // Verify total supply matches
      if (Number(assetInfo.params.total) !== cachedData.state.totalTokens) {
        console.warn(`Token supply mismatch for property ${propertyId}`)
      }

      // TODO: Implement more comprehensive blockchain sync
      // This could include verifying ownership balances directly from blockchain
    } catch (error) {
      console.error(`Error syncing from blockchain for ${propertyId}:`, error)
      throw error
    }
  }

  /**
   * Start periodic sync timer
   */
  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }

    this.syncTimer = setInterval(async () => {
      if (!this.isRunning) return

      try {
        const propertyIds = this.getMonitoredProperties()
        
        // Sync properties in batches to avoid overwhelming the system
        const batches = this.chunkArray(propertyIds, this.config.batchSize)
        
        for (const batch of batches) {
          await Promise.all(
            batch.map(propertyId => 
              this.syncProperty(propertyId).catch(error => 
                console.error(`Periodic sync failed for ${propertyId}:`, error)
              )
            )
          )
        }
      } catch (error) {
        console.error('Error in periodic sync:', error)
        this.emitError('periodic_sync_failed', error)
      }
    }, this.config.syncInterval)
  }

  /**
   * Determine transaction type from blockchain transaction
   */
  private determineTransactionType(transaction: any): 'purchase' | 'transfer' | 'opt_in' {
    const amount = transaction['asset-transfer-transaction']?.amount || 0
    
    if (amount === 0) {
      return 'opt_in'
    }
    
    // This is a simplified determination - in practice, you might need more logic
    // to distinguish between purchases and transfers
    return 'transfer'
  }

  /**
   * Emit a state event
   */
  private emitStateEvent(type: PropertyStateEvent['type'], propertyId: string, data: any): void {
    const event: PropertyStateEvent = {
      type,
      propertyId,
      data,
      timestamp: new Date()
    }
    
    this.emit('state_event', event)
    this.emit(type, event)
  }

  /**
   * Emit an error event
   */
  private emitError(type: string, error: any, context?: any): void {
    this.emitStateEvent('error', context?.propertyId || 'unknown', {
      errorType: type,
      error: error.message || error,
      context
    })
  }

  /**
   * Utility function to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    
    return chunks
  }
}

// Export factory function
export const createPropertyStateManager = (
  algorand: AlgorandClient,
  config?: Partial<StateManagerConfig>
) => {
  return new PropertyStateManager(algorand, config)
}