import { supabase } from '../lib/supabase'
import { 
  PortfolioHolding, 
  PortfolioSummary, 
  PortfolioPerformanceData, 
  DiversificationData, 
  TaxReportData, 
  PortfolioAnalytics,
  PortfolioTransaction
} from '../types/portfolio'
import { ApiResponse } from '../types/database'

export class PortfolioAnalyticsService {
  /**
   * Get comprehensive portfolio analytics for a user
   */
  static async getPortfolioAnalytics(walletAddress: string): Promise<ApiResponse<PortfolioAnalytics>> {
    try {
      // Get portfolio holdings
      const holdingsResult = await this.getPortfolioHoldings(walletAddress)
      if (!holdingsResult.success || !holdingsResult.data) {
        throw new Error('Failed to fetch portfolio holdings')
      }

      const holdings = holdingsResult.data

      // Generate performance data
      const performance = await this.generatePerformanceData(holdings)
      
      // Calculate diversification metrics
      const diversification = this.calculateDiversification(holdings)
      
      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(performance)
      
      // Generate projections
      const projections = this.calculateProjections(holdings, performance)

      const analytics: PortfolioAnalytics = {
        performance,
        diversification,
        riskMetrics,
        projections
      }

      return {
        data: analytics,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching portfolio analytics:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch portfolio analytics',
        success: false
      }
    }
  }

  /**
   * Get detailed portfolio holdings with transaction history
   */
  static async getPortfolioHoldings(walletAddress: string): Promise<ApiResponse<PortfolioHolding[]>> {
    try {
      // Get user portfolio from database
      const { data: portfolio, error } = await supabase
        .rpc('get_user_portfolio_detailed', { user_wallet_address: walletAddress })

      if (error) {
        throw new Error(`Failed to fetch portfolio: ${error.message}`)
      }

      // Transform database results to portfolio holdings
      const holdings: PortfolioHolding[] = portfolio?.map((item: any) => {
        const gainLoss = item.current_value - item.purchase_value
        const gainLossPercent = item.purchase_value > 0 ? (gainLoss / item.purchase_value) * 100 : 0

        return {
          id: item.property_id,
          propertyId: item.property_id,
          propertyTitle: item.property_name,
          propertyImage: item.property_image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
          propertyLocation: item.property_location || 'Unknown',
          assetId: item.asa_id || 0,
          tokensOwned: item.token_amount,
          tokenPrice: item.token_price,
          currentValue: item.current_value,
          purchaseValue: item.purchase_value,
          purchaseDate: item.purchase_date,
          gainLoss,
          gainLossPercent,
          expectedYield: item.expected_yield || 8.0,
          lastDividend: item.last_dividend || 0,
          propertyType: item.property_type || 'residential',
          transactions: [] // Will be populated separately
        }
      }) || []

      // Get transaction history for each holding
      for (const holding of holdings) {
        const transactionsResult = await this.getPropertyTransactions(walletAddress, holding.propertyId)
        if (transactionsResult.success && transactionsResult.data) {
          holding.transactions = transactionsResult.data
        }
      }

      return {
        data: holdings,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching portfolio holdings:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch portfolio holdings',
        success: false
      }
    }
  }

  /**
   * Get transaction history for a specific property
   */
  static async getPropertyTransactions(
    walletAddress: string, 
    propertyId: string
  ): Promise<ApiResponse<PortfolioTransaction[]>> {
    try {
      // Mock transaction data - in production, this would come from blockchain indexer
      const mockTransactions: PortfolioTransaction[] = [
        {
          id: '1',
          type: 'purchase',
          propertyTitle: 'Property Purchase',
          amount: 2500,
          tokenAmount: 10,
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          txId: 'ABCD1234567890EFGH',
          status: 'confirmed',
          blockNumber: 12345678,
          algoExplorerUrl: 'https://testnet.algoexplorer.io/tx/ABCD1234567890EFGH'
        },
        {
          id: '2',
          type: 'dividend',
          propertyTitle: 'Monthly Dividend',
          amount: 45.50,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          txId: 'EFGH9876543210ABCD',
          status: 'confirmed',
          blockNumber: 12345680,
          algoExplorerUrl: 'https://testnet.algoexplorer.io/tx/EFGH9876543210ABCD'
        }
      ]

      return {
        data: mockTransactions,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching property transactions:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch property transactions',
        success: false
      }
    }
  }

  /**
   * Generate portfolio performance data over time
   */
  private static async generatePerformanceData(holdings: PortfolioHolding[]): Promise<PortfolioPerformanceData[]> {
    const performanceData: PortfolioPerformanceData[] = []
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12) // Last 12 months

    // Generate monthly data points
    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + i)
      
      // Simulate portfolio growth over time
      const monthProgress = i / 11
      const totalInvested = holdings.reduce((sum, h) => sum + h.purchaseValue, 0)
      const currentTotalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
      
      // Simulate gradual growth
      const simulatedValue = totalInvested + (currentTotalValue - totalInvested) * monthProgress
      const gainLoss = simulatedValue - totalInvested
      const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0
      
      // Simulate monthly dividends
      const monthlyDividends = holdings.reduce((sum, h) => sum + (h.lastDividend * monthProgress), 0)

      performanceData.push({
        date: date.toISOString().split('T')[0],
        totalValue: simulatedValue,
        totalInvested,
        gainLoss,
        gainLossPercent,
        dividends: monthlyDividends
      })
    }

    return performanceData
  }

  /**
   * Calculate portfolio diversification metrics
   */
  private static calculateDiversification(holdings: PortfolioHolding[]): DiversificationData {
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)

    // Diversification by property type
    const typeMap = new Map<string, { value: number; count: number }>()
    holdings.forEach(holding => {
      const existing = typeMap.get(holding.propertyType) || { value: 0, count: 0 }
      typeMap.set(holding.propertyType, {
        value: existing.value + holding.currentValue,
        count: existing.count + 1
      })
    })

    const byPropertyType = Array.from(typeMap.entries()).map(([type, data]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      count: data.count
    }))

    // Diversification by location
    const locationMap = new Map<string, { value: number; count: number }>()
    holdings.forEach(holding => {
      const location = holding.propertyLocation.split(',')[0] // Get city
      const existing = locationMap.get(location) || { value: 0, count: 0 }
      locationMap.set(location, {
        value: existing.value + holding.currentValue,
        count: existing.count + 1
      })
    })

    const byLocation = Array.from(locationMap.entries()).map(([location, data]) => ({
      location,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      count: data.count
    }))

    // Diversification by property size (investment amount)
    const sizeRanges = [
      { range: '$0 - $5K', min: 0, max: 5000 },
      { range: '$5K - $15K', min: 5000, max: 15000 },
      { range: '$15K - $50K', min: 15000, max: 50000 },
      { range: '$50K+', min: 50000, max: Infinity }
    ]

    const byPropertySize = sizeRanges.map(range => {
      const matchingHoldings = holdings.filter(h => 
        h.currentValue >= range.min && h.currentValue < range.max
      )
      const value = matchingHoldings.reduce((sum, h) => sum + h.currentValue, 0)
      
      return {
        range: range.range,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        count: matchingHoldings.length
      }
    })

    return {
      byPropertyType,
      byLocation,
      byPropertySize
    }
  }

  /**
   * Calculate risk metrics
   */
  private static calculateRiskMetrics(performance: PortfolioPerformanceData[]) {
    const returns = performance.map(p => p.gainLossPercent)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    
    // Calculate volatility (standard deviation)
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)
    
    // Mock other metrics - in production, these would be calculated from real market data
    return {
      volatility: volatility,
      sharpeRatio: volatility > 0 ? avgReturn / volatility : 0,
      maxDrawdown: Math.min(...returns),
      beta: 0.8 // Relative to real estate market
    }
  }

  /**
   * Calculate portfolio projections
   */
  private static calculateProjections(holdings: PortfolioHolding[], performance: PortfolioPerformanceData[]) {
    const currentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
    const avgYield = holdings.reduce((sum, h) => sum + h.expectedYield, 0) / holdings.length
    const expectedAnnualReturn = avgYield / 100

    return {
      expectedAnnualReturn: expectedAnnualReturn * 100,
      projectedValue1Year: currentValue * (1 + expectedAnnualReturn),
      projectedValue5Year: currentValue * Math.pow(1 + expectedAnnualReturn, 5),
      projectedDividends: currentValue * expectedAnnualReturn
    }
  }

  /**
   * Generate tax report data
   */
  static async generateTaxReport(
    walletAddress: string, 
    year: number
  ): Promise<ApiResponse<TaxReportData>> {
    try {
      const holdingsResult = await this.getPortfolioHoldings(walletAddress)
      if (!holdingsResult.success || !holdingsResult.data) {
        throw new Error('Failed to fetch portfolio data')
      }

      const holdings = holdingsResult.data
      const startDate = new Date(year, 0, 1)
      const endDate = new Date(year, 11, 31)

      // Collect all transactions for the year
      const allTransactions: any[] = []
      let totalGainLoss = 0
      let dividendIncome = 0
      let shortTermGains = 0
      let longTermGains = 0
      let totalFees = 0

      for (const holding of holdings) {
        for (const transaction of holding.transactions) {
          const txDate = new Date(transaction.timestamp)
          if (txDate >= startDate && txDate <= endDate) {
            const txData = {
              date: transaction.timestamp.split('T')[0],
              type: transaction.type,
              property: transaction.propertyTitle,
              amount: transaction.amount,
              tokenAmount: transaction.tokenAmount,
              costBasis: transaction.type === 'sale' ? holding.tokenPrice * (transaction.tokenAmount || 0) : undefined,
              gainLoss: transaction.type === 'sale' ? transaction.amount - (holding.tokenPrice * (transaction.tokenAmount || 0)) : undefined,
              txId: transaction.txId
            }

            allTransactions.push(txData)

            // Calculate tax implications
            if (transaction.type === 'dividend') {
              dividendIncome += transaction.amount
            } else if (transaction.type === 'sale' && txData.gainLoss) {
              const purchaseDate = new Date(holding.purchaseDate)
              const isLongTerm = (txDate.getTime() - purchaseDate.getTime()) > (365 * 24 * 60 * 60 * 1000)
              
              if (isLongTerm) {
                longTermGains += txData.gainLoss
              } else {
                shortTermGains += txData.gainLoss
              }
              totalGainLoss += txData.gainLoss
            } else if (transaction.type === 'fee') {
              totalFees += transaction.amount
            }
          }
        }
      }

      const taxReport: TaxReportData = {
        year,
        totalGainLoss,
        dividendIncome,
        transactions: allTransactions,
        summary: {
          shortTermGains,
          longTermGains,
          totalDividends: dividendIncome,
          totalFees
        }
      }

      return {
        data: taxReport,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error generating tax report:', error)
      return {
        data: null,
        error: error.message || 'Failed to generate tax report',
        success: false
      }
    }
  }

  /**
   * Export portfolio data to CSV
   */
  static exportPortfolioCSV(holdings: PortfolioHolding[], filename: string = 'portfolio-export.csv') {
    const headers = [
      'Property Name',
      'Location',
      'Property Type',
      'Tokens Owned',
      'Token Price',
      'Current Value',
      'Purchase Value',
      'Gain/Loss',
      'Gain/Loss %',
      'Expected Yield',
      'Purchase Date',
      'ASA ID'
    ]

    const rows = holdings.map(holding => [
      holding.propertyTitle,
      holding.propertyLocation,
      holding.propertyType,
      holding.tokensOwned.toString(),
      `$${holding.tokenPrice.toFixed(2)}`,
      `$${holding.currentValue.toFixed(2)}`,
      `$${holding.purchaseValue.toFixed(2)}`,
      `$${holding.gainLoss.toFixed(2)}`,
      `${holding.gainLossPercent.toFixed(2)}%`,
      `${holding.expectedYield.toFixed(1)}%`,
      new Date(holding.purchaseDate).toLocaleDateString(),
      holding.assetId.toString()
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Export tax report to CSV
   */
  static exportTaxReportCSV(taxReport: TaxReportData, filename?: string) {
    const defaultFilename = `tax-report-${taxReport.year}.csv`
    
    const headers = [
      'Date',
      'Type',
      'Property',
      'Amount',
      'Token Amount',
      'Cost Basis',
      'Gain/Loss',
      'Transaction ID'
    ]

    const rows = taxReport.transactions.map(tx => [
      tx.date,
      tx.type,
      tx.property,
      `$${tx.amount.toFixed(2)}`,
      tx.tokenAmount?.toString() || '',
      tx.costBasis ? `$${tx.costBasis.toFixed(2)}` : '',
      tx.gainLoss ? `$${tx.gainLoss.toFixed(2)}` : '',
      tx.txId
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || defaultFilename
    a.click()
    URL.revokeObjectURL(url)
  }
}