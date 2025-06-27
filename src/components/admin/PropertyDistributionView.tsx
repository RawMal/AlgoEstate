import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart,
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react'
import { AdminService } from '../../services/adminService'
import { PropertyDistribution } from '../../types/admin'

interface PropertyDistributionViewProps {
  propertyId: string
  propertyName: string
}

export function PropertyDistributionView({ propertyId, propertyName }: PropertyDistributionViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'investors' | 'distribution'>('overview')

  const { data: distribution, isLoading, error, refetch } = useQuery({
    queryKey: ['property-distribution', propertyId],
    queryFn: () => AdminService.getPropertyDistribution(propertyId),
    select: (result) => result.success ? result.data : null
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const exportData = () => {
    if (!distribution) return

    const csvData = [
      ['Investor', 'Wallet Address', 'Tokens', 'Percentage', 'Investment Value'],
      ...distribution.topInvestors.map(investor => [
        `Investor ${distribution.topInvestors.indexOf(investor) + 1}`,
        investor.walletAddress,
        investor.tokenAmount.toString(),
        formatPercentage(investor.percentage),
        formatCurrency(investor.investmentValue)
      ])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${propertyName}-distribution.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-secondary-600 dark:text-secondary-400">
          Loading distribution data...
        </p>
      </div>
    )
  }

  if (error || !distribution) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
        <div className="text-red-600 dark:text-red-400 mb-4">
          Failed to load distribution data
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-secondary-700/30">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
        <div>
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
            Token Distribution
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400">
            {propertyName}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportData}
            className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 rounded-lg transition-colors"
            title="Export data"
          >
            <Download className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200/50 dark:border-secondary-700/50">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'investors', label: 'Top Investors', icon: Users },
            { id: 'distribution', label: 'Distribution Chart', icon: PieChart }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
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

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {distribution.totalInvestors}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Total Investors
                </div>
              </div>
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-accent-600 dark:text-accent-400">
                  {formatPercentage(distribution.fundingPercentage)}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Funded
                </div>
              </div>
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(distribution.averageInvestment)}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Avg Investment
                </div>
              </div>
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {distribution.availableTokens.toLocaleString()}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Available Tokens
                </div>
              </div>
            </div>

            {/* Funding Progress */}
            <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-6">
              <h4 className="font-semibold text-secondary-900 dark:text-white mb-4">
                Funding Progress
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-600 dark:text-secondary-400">
                    {(distribution.totalTokens - distribution.availableTokens).toLocaleString()} / {distribution.totalTokens.toLocaleString()} tokens sold
                  </span>
                  <span className="text-secondary-900 dark:text-white font-medium">
                    {formatPercentage(distribution.fundingPercentage)}
                  </span>
                </div>
                <div className="w-full bg-secondary-200/50 dark:bg-secondary-700/50 backdrop-blur-sm rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-accent-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${distribution.fundingPercentage}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Total Raised:</span>
                    <span className="ml-2 font-semibold text-secondary-900 dark:text-white">
                      {formatCurrency((distribution.totalTokens - distribution.availableTokens) * (distribution.totalValue / distribution.totalTokens))}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Remaining:</span>
                    <span className="ml-2 font-semibold text-secondary-900 dark:text-white">
                      {formatCurrency(distribution.availableTokens * (distribution.totalValue / distribution.totalTokens))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4">
                <h5 className="font-semibold text-secondary-900 dark:text-white mb-3">
                  Investment Distribution
                </h5>
                <div className="space-y-2">
                  {distribution.distributionChart.slice(0, 3).map((range, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-secondary-600 dark:text-secondary-400">
                        {range.range}
                      </span>
                      <span className="text-secondary-900 dark:text-white font-medium">
                        {range.count} ({formatPercentage(range.percentage)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4">
                <h5 className="font-semibold text-secondary-900 dark:text-white mb-3">
                  Top 3 Investors
                </h5>
                <div className="space-y-2">
                  {distribution.topInvestors.slice(0, 3).map((investor, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-secondary-600 dark:text-secondary-400 font-mono">
                        {investor.walletAddress.slice(0, 8)}...
                      </span>
                      <span className="text-secondary-900 dark:text-white font-medium">
                        {formatPercentage(investor.percentage)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'investors' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-secondary-900 dark:text-white">
              Top Token Holders
            </h4>
            <div className="space-y-3">
              {distribution.topInvestors.map((investor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-xl"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-mono text-sm text-secondary-900 dark:text-white">
                        {investor.walletAddress.slice(0, 12)}...{investor.walletAddress.slice(-12)}
                      </div>
                      <div className="text-xs text-secondary-600 dark:text-secondary-400">
                        {investor.tokenAmount.toLocaleString()} tokens
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-secondary-900 dark:text-white">
                      {formatPercentage(investor.percentage)}
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      {formatCurrency(investor.investmentValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="space-y-6">
            <h4 className="font-semibold text-secondary-900 dark:text-white">
              Token Distribution by Range
            </h4>
            
            {/* Distribution Chart */}
            <div className="space-y-4">
              {distribution.distributionChart.map((range, index) => (
                <div
                  key={index}
                  className="bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-xl p-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-secondary-900 dark:text-white">
                      {range.range}
                    </span>
                    <span className="text-secondary-600 dark:text-secondary-400">
                      {range.count} investors ({formatPercentage(range.percentage)})
                    </span>
                  </div>
                  <div className="w-full bg-secondary-200/50 dark:bg-secondary-600/50 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${range.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="bg-primary-50/80 dark:bg-primary-900/20 backdrop-blur-sm rounded-xl p-6">
              <h5 className="font-semibold text-secondary-900 dark:text-white mb-4">
                Distribution Summary
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {distribution.distributionChart.find(r => r.range.includes('1-10'))?.count || 0}
                  </div>
                  <div className="text-secondary-600 dark:text-secondary-400">
                    Small Investors (1-10 tokens)
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {(distribution.distributionChart.find(r => r.range.includes('11-50'))?.count || 0) + 
                     (distribution.distributionChart.find(r => r.range.includes('51-100'))?.count || 0)}
                  </div>
                  <div className="text-secondary-600 dark:text-secondary-400">
                    Medium Investors (11-100 tokens)
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {(distribution.distributionChart.find(r => r.range.includes('101-500'))?.count || 0) + 
                     (distribution.distributionChart.find(r => r.range.includes('500+'))?.count || 0)}
                  </div>
                  <div className="text-secondary-600 dark:text-secondary-400">
                    Large Investors (100+ tokens)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}