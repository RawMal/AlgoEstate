import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useQuery } from '@tanstack/react-query'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  Calendar, 
  Eye, 
  Wallet,
  Download,
  BarChart3,
  PieChart,
  FileText,
  Activity
} from 'lucide-react'
import { PortfolioAnalyticsService } from '../services/portfolioAnalyticsService'
import { PortfolioPerformanceChart } from './portfolio/PortfolioPerformanceChart'
import { DiversificationAnalysis } from './portfolio/DiversificationAnalysis'
import { TransactionHistory } from './portfolio/TransactionHistory'
import { TaxReportGenerator } from './portfolio/TaxReportGenerator'

export function PortfolioView() {
  const { activeAddress } = useWallet()
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'diversification' | 'transactions' | 'tax'>('overview')

  // Fetch portfolio analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['portfolio-analytics', activeAddress],
    queryFn: () => activeAddress ? PortfolioAnalyticsService.getPortfolioAnalytics(activeAddress) : null,
    enabled: !!activeAddress,
    select: (result) => result?.success ? result.data : null
  })

  // Fetch portfolio holdings
  const { data: holdings, isLoading: holdingsLoading } = useQuery({
    queryKey: ['portfolio-holdings', activeAddress],
    queryFn: () => activeAddress ? PortfolioAnalyticsService.getPortfolioHoldings(activeAddress) : null,
    enabled: !!activeAddress,
    select: (result) => result?.success ? result.data : []
  })

  if (!activeAddress) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
        <Wallet className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400">
          Please connect your wallet to view your portfolio
        </p>
      </div>
    )
  }

  const isLoading = analyticsLoading || holdingsLoading
  const portfolioHoldings = holdings || []
  const allTransactions = portfolioHoldings.flatMap(holding => holding.transactions)

  // Calculate portfolio summary
  const portfolioSummary = portfolioHoldings.length > 0 ? {
    totalValue: portfolioHoldings.reduce((sum, h) => sum + h.currentValue, 0),
    totalInvested: portfolioHoldings.reduce((sum, h) => sum + h.purchaseValue, 0),
    totalGainLoss: portfolioHoldings.reduce((sum, h) => sum + h.gainLoss, 0),
    totalGainLossPercent: 0,
    totalProperties: portfolioHoldings.length,
    totalTokens: portfolioHoldings.reduce((sum, h) => sum + h.tokensOwned, 0),
    monthlyDividends: portfolioHoldings.reduce((sum, h) => sum + h.lastDividend, 0),
    annualizedReturn: analytics?.projections.expectedAnnualReturn || 0,
    diversificationScore: analytics?.diversification ? 75 : 0 // Mock score
  } : {
    totalValue: 0,
    totalInvested: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    totalProperties: 0,
    totalTokens: 0,
    monthlyDividends: 0,
    annualizedReturn: 0,
    diversificationScore: 0
  }

  portfolioSummary.totalGainLossPercent = portfolioSummary.totalInvested > 0 
    ? (portfolioSummary.totalGainLoss / portfolioSummary.totalInvested) * 100 
    : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleExportPortfolio = () => {
    if (portfolioHoldings.length > 0) {
      PortfolioAnalyticsService.exportPortfolioCSV(portfolioHoldings)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'diversification', label: 'Diversification', icon: PieChart },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'tax', label: 'Tax Reports', icon: FileText }
  ]

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Portfolio Value */}
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100/50 dark:bg-primary-900/30 backdrop-blur-sm rounded-xl">
              <DollarSign className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className={`flex items-center text-sm font-medium ${
              portfolioSummary.totalGainLoss >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {portfolioSummary.totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {portfolioSummary.totalGainLossPercent >= 0 ? '+' : ''}
              {portfolioSummary.totalGainLossPercent.toFixed(2)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
            {formatCurrency(portfolioSummary.totalValue)}
          </div>
          <div className="text-secondary-600 dark:text-secondary-400 text-sm">
            Total Portfolio Value
          </div>
          <div className={`text-sm mt-1 ${
            portfolioSummary.totalGainLoss >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {portfolioSummary.totalGainLoss >= 0 ? '+' : ''}
            {formatCurrency(Math.abs(portfolioSummary.totalGainLoss))} total return
          </div>
        </div>

        {/* Properties Count */}
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent-100/50 dark:bg-accent-900/30 backdrop-blur-sm rounded-xl">
              <Building2 className="h-6 w-6 text-accent-600 dark:text-accent-400" />
            </div>
            <div className="text-sm text-accent-600 dark:text-accent-400 font-medium">
              Score: {portfolioSummary.diversificationScore}
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
            {portfolioSummary.totalProperties}
          </div>
          <div className="text-secondary-600 dark:text-secondary-400 text-sm">
            Properties Owned
          </div>
          <div className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">
            {portfolioSummary.totalTokens.toLocaleString()} total tokens
          </div>
        </div>

        {/* Monthly Dividends */}
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100/50 dark:bg-green-900/30 backdrop-blur-sm rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
              <TrendingUp className="h-4 w-4 mr-1" />
              +12.5%
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
            {formatCurrency(portfolioSummary.monthlyDividends)}
          </div>
          <div className="text-secondary-600 dark:text-secondary-400 text-sm">
            Monthly Dividends
          </div>
          <div className="text-green-600 dark:text-green-400 text-sm mt-1">
            {portfolioSummary.annualizedReturn.toFixed(1)}% expected yield
          </div>
        </div>

        {/* Annualized Return */}
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <button
              onClick={handleExportPortfolio}
              className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 rounded-lg transition-colors"
              title="Export portfolio"
            >
              <Download className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
            </button>
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
            {portfolioSummary.annualizedReturn.toFixed(1)}%
          </div>
          <div className="text-secondary-600 dark:text-secondary-400 text-sm">
            Expected Annual Return
          </div>
          <div className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">
            Based on current holdings
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
        <div className="border-b border-secondary-200/50 dark:border-secondary-700/50">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {portfolioHoldings.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                    No Properties Yet
                  </h4>
                  <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                    Start building your real estate portfolio today
                  </p>
                  <button className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors">
                    Browse Properties
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {portfolioHoldings.map((holding) => (
                    <div
                      key={holding.id}
                      className="border border-secondary-200/50 dark:border-secondary-700/50 rounded-xl p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <img
                            src={holding.propertyImage}
                            alt={holding.propertyTitle}
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                          <div>
                            <h4 className="font-semibold text-secondary-900 dark:text-white mb-1">
                              {holding.propertyTitle}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm text-secondary-600 dark:text-secondary-400">
                              <span>{holding.tokensOwned} tokens</span>
                              <span>•</span>
                              <span>{holding.propertyLocation}</span>
                              <span>•</span>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(holding.purchaseDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-secondary-900 dark:text-white">
                            {formatCurrency(holding.currentValue)}
                          </div>
                          <div className={`text-sm font-medium flex items-center justify-end ${
                            holding.gainLoss >= 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {holding.gainLoss >= 0 ? (
                              <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            {holding.gainLoss >= 0 ? '+' : ''}
                            {formatCurrency(Math.abs(holding.gainLoss))} ({holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%)
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-secondary-200/50 dark:border-secondary-700/50">
                        <div className="text-center">
                          <div className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
                            Token Price
                          </div>
                          <div className="font-semibold text-secondary-900 dark:text-white">
                            {formatCurrency(holding.tokenPrice)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
                            Expected Yield
                          </div>
                          <div className="font-semibold text-accent-600 dark:text-accent-400">
                            {holding.expectedYield.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
                            Last Dividend
                          </div>
                          <div className="font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(holding.lastDividend)}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end mt-4">
                        <button className="inline-flex items-center px-4 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <PortfolioPerformanceChart 
              data={analytics?.performance || []} 
              isLoading={isLoading}
            />
          )}

          {/* Diversification Tab */}
          {activeTab === 'diversification' && (
            <DiversificationAnalysis 
              data={analytics?.diversification || { byPropertyType: [], byLocation: [], byPropertySize: [] }} 
              isLoading={isLoading}
            />
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <TransactionHistory 
              transactions={allTransactions} 
              isLoading={isLoading}
            />
          )}

          {/* Tax Reports Tab */}
          {activeTab === 'tax' && (
            <TaxReportGenerator walletAddress={activeAddress} />
          )}
        </div>
      </div>
    </div>
  )
}