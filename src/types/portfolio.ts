export interface PortfolioHolding {
  id: string
  propertyId: string
  propertyTitle: string
  propertyImage: string
  propertyLocation: string
  assetId: number
  tokensOwned: number
  tokenPrice: number
  currentValue: number
  purchaseValue: number
  purchaseDate: string
  gainLoss: number
  gainLossPercent: number
  expectedYield: number
  lastDividend: number
  propertyType: 'residential' | 'commercial' | 'mixed' | 'industrial'
  transactions: PortfolioTransaction[]
}

export interface PortfolioTransaction {
  id: string
  type: 'purchase' | 'sale' | 'dividend' | 'fee'
  propertyTitle: string
  amount: number
  tokenAmount?: number
  timestamp: string
  txId: string
  status: 'confirmed' | 'pending' | 'failed'
  blockNumber?: number
  algoExplorerUrl: string
}

export interface PortfolioSummary {
  totalValue: number
  totalInvested: number
  totalGainLoss: number
  totalGainLossPercent: number
  totalProperties: number
  totalTokens: number
  monthlyDividends: number
  annualizedReturn: number
  diversificationScore: number
}

export interface PortfolioPerformanceData {
  date: string
  totalValue: number
  totalInvested: number
  gainLoss: number
  gainLossPercent: number
  dividends: number
}

export interface DiversificationData {
  byPropertyType: {
    type: string
    value: number
    percentage: number
    count: number
  }[]
  byLocation: {
    location: string
    value: number
    percentage: number
    count: number
  }[]
  byPropertySize: {
    range: string
    value: number
    percentage: number
    count: number
  }[]
}

export interface TaxReportData {
  year: number
  totalGainLoss: number
  dividendIncome: number
  transactions: {
    date: string
    type: string
    property: string
    amount: number
    tokenAmount?: number
    costBasis?: number
    gainLoss?: number
    txId: string
  }[]
  summary: {
    shortTermGains: number
    longTermGains: number
    totalDividends: number
    totalFees: number
  }
}

export interface PortfolioAnalytics {
  performance: PortfolioPerformanceData[]
  diversification: DiversificationData
  riskMetrics: {
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    beta: number
  }
  projections: {
    expectedAnnualReturn: number
    projectedValue1Year: number
    projectedValue5Year: number
    projectedDividends: number
  }
}