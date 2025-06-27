export interface AlgorandTransaction {
  txId: string
  from: string
  to: string
  amount: number
  fee: number
  note?: string
  type: 'payment' | 'asset-transfer' | 'asset-config' | 'application-call'
  confirmedRound?: number
  timestamp?: number
}

export interface PropertyTokenMetadata {
  propertyId: string
  name: string
  description: string
  image: string
  location: string
  totalValue: number
  tokenPrice: number
  totalSupply: number
  expectedYield: number
  propertyType: 'residential' | 'commercial' | 'mixed'
}

export interface InvestmentRecord {
  id: string
  investorAddress: string
  propertyId: string
  tokenAmount: number
  totalCost: number
  transactionId: string
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
}

export interface WalletState {
  isConnected: boolean
  address?: string
  balance: {
    algo: number
    assets: Array<{
      assetId: number
      amount: number
      name?: string
      unitName?: string
    }>
  }
  isLoading: boolean
  error?: string
}

export interface TransactionResult {
  success: boolean
  txId?: string
  error?: string
}