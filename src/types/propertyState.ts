export interface PropertyState {
  propertyId: string
  asaId: number
  totalTokens: number
  availableTokens: number
  tokenPrice: number
  totalValue: number
  fundingPercentage: number
  lastUpdated: Date
  transactionCount: number
}

export interface TokenOwnership {
  walletAddress: string
  tokenAmount: number
  ownershipPercentage: number
  purchaseDate: Date
  lastTransactionId: string
}

export interface PropertyTransaction {
  txId: string
  type: 'purchase' | 'transfer' | 'opt_in'
  fromAddress: string
  toAddress: string
  tokenAmount: number
  timestamp: Date
  blockNumber: number
  confirmed: boolean
}

export interface PropertyStateEvent {
  type: 'tokens_purchased' | 'tokens_transferred' | 'ownership_updated' | 'state_synced' | 'error'
  propertyId: string
  data: any
  timestamp: Date
}

export interface OwnershipSummary {
  totalOwners: number
  topOwners: TokenOwnership[]
  distributionStats: {
    averageOwnership: number
    medianOwnership: number
    concentrationRatio: number // Top 10% ownership percentage
  }
}

export interface StateManagerConfig {
  syncInterval: number // milliseconds
  maxCacheSize: number
  enableRealTimeUpdates: boolean
  retryAttempts: number
  batchSize: number
}

export interface CachedPropertyData {
  state: PropertyState
  ownership: Map<string, TokenOwnership>
  transactions: PropertyTransaction[]
  lastSync: Date
  syncInProgress: boolean
}