export interface PropertyDetails {
  id: string
  name: string
  description: string
  location: string
  totalValue: number
  tokenPrice: number
  totalTokens: number
  imageUrl?: string
  propertyType: 'residential' | 'commercial' | 'mixed'
  expectedYield: number
}

export interface TokenizationResult {
  success: boolean
  asaId?: number
  txId?: string
  error?: string
  confirmedRound?: number
}

export interface PurchaseTransactionGroup {
  transactions: any[] // AlgoKit transaction types
  groupId: string
  totalCost: number
  platformFee: number
  requiresOptIn: boolean
}

export interface TokenMetadata {
  name: string
  description: string
  image: string
  external_url?: string
  properties: {
    property_id: string
    location: string
    total_value: number
    token_price: number
    expected_yield: number
    property_type: string
  }
}

export interface AssetConfig {
  total: bigint
  decimals: number
  defaultFrozen: boolean
  unitName: string
  assetName: string
  url?: string
  metadataHash?: Uint8Array
  manager?: string
  reserve?: string
  freeze?: string
  clawback?: string
}

export interface PurchaseParams {
  asaId: number
  buyerAddress: string
  tokenAmount: number
  pricePerToken: number
  sellerAddress: string
  platformFeeAddress?: string
  platformFeeRate?: number
}