import { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  Coins, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  RefreshCw,
  Eye,
  ExternalLink
} from 'lucide-react'
import { TransactionService } from '../services/TransactionService'
import { supabase } from '../lib/supabase'
import { TransactionModal } from './TransactionModal'
import { AddPropertyModal } from './AddPropertyModal'

interface PortfolioHolding {
  propertyId: string
  propertyTitle: string
  propertyImage: string
  assetId: number
  tokensOwned: number
  tokenPrice: number
  currentValue: number
  purchaseValue: number
  gainLoss: number
  gainLossPercent: number
  lastUpdated: string
}


interface PortfolioSummary {
  totalValue: number
  totalInvested: number
  totalGainLoss: number
  totalGainLossPercent: number
  totalProperties: number
  totalTokens: number
  monthlyDividends: number
}

// Get property image based on property name
const getPropertyImage = (propertyName: string): string => {
  const imageMap: { [key: string]: string } = {
    'Luxury Manhattan Penthouse': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'Modern Miami Condo': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'Downtown Austin Office': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'Chicago Loft': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'San Francisco Victorian': 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'Seattle Tech Hub': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    'Chicago Luxury Apartment': 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  }
  return imageMap[propertyName] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
}

export function UserDashboard() {
  const { activeAddress } = useWallet()
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [transactions, setTransactions] = useState<RecentTransaction[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false)

  const transactionService = new TransactionService()

  // Fetch portfolio data from Supabase
  const { data: portfolioData, isLoading: isLoadingPortfolio, refetch: refetchPortfolio } = useQuery({
    queryKey: ['user-portfolio', activeAddress],
    queryFn: async () => {
      if (!activeAddress) return null
      
      // Call the database function to get user portfolio
      const { data, error } = await supabase
        .rpc('get_user_portfolio_detailed', { user_wallet_address: activeAddress })
      
      if (error) {
        console.error('Error fetching portfolio:', error)
        return null
      }
      
      // Transform data to match our interface
      const transformedHoldings: PortfolioHolding[] = data?.map((item: {
        property_id: string
        property_name: string
        property_location: string
        property_image: string
        property_type: string
        token_amount: number
        token_price: string
        current_value: string
        purchase_value: string
        purchase_date: string
        expected_yield: string
        last_dividend: string
        asa_id: number | null
      }) => {
        const tokenPrice = parseFloat(item.token_price)
        const currentValue = parseFloat(item.current_value)
        const purchaseValue = parseFloat(item.purchase_value)
        const gainLoss = currentValue - purchaseValue
        const gainLossPercent = purchaseValue > 0 ? (gainLoss / purchaseValue) * 100 : 0
        
        return {
          propertyId: item.property_id,
          propertyTitle: item.property_name,
          propertyImage: item.property_image,
          assetId: item.asa_id || 0,
          tokensOwned: item.token_amount,
          tokenPrice,
          currentValue,
          purchaseValue,
          gainLoss,
          gainLossPercent,
          lastUpdated: item.purchase_date
        }
      }) || []
      
      return transformedHoldings
    },
    enabled: !!activeAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Update holdings when data changes
  useEffect(() => {
    if (portfolioData) {
      setHoldings(portfolioData)
    }
  }, [portfolioData])

  // Fetch recent transactions
  const { data: transactionData, isLoading: isLoadingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['recent-transactions', activeAddress],
    queryFn: async () => {
      if (!activeAddress || holdings.length === 0) return []
      
      // For now, we'll generate mock transactions based on actual holdings
      // In production, this would fetch from blockchain indexer
      const recentTxs: RecentTransaction[] = []
      
      holdings.forEach((holding, index) => {
        // Add purchase transaction
        recentTxs.push({
          id: `purchase-${holding.propertyId}`,
          type: 'purchase',
          propertyTitle: holding.propertyTitle,
          amount: holding.purchaseValue,
          tokenAmount: holding.tokensOwned,
          timestamp: holding.lastUpdated,
          txId: `TX${holding.assetId}${index}`,
          status: 'confirmed'
        })
        
        // Add dividend transaction (if any)
        if (Math.random() > 0.5) {
          const dividendAmount = holding.tokensOwned * 0.5 // Mock dividend
          recentTxs.push({
            id: `dividend-${holding.propertyId}`,
            type: 'dividend',
            propertyTitle: holding.propertyTitle,
            amount: dividendAmount,
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            txId: `DIV${holding.assetId}${index}`,
            status: 'confirmed'
          })
        }
      })
      
      // Sort by timestamp
      return recentTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    },
    enabled: !!activeAddress && holdings.length > 0,
  })

  // Update transactions when data changes
  useEffect(() => {
    if (transactionData) {
      setTransactions(transactionData)
    }
  }, [transactionData])

  // Calculate portfolio summary
  const portfolioSummary: PortfolioSummary = {
    totalValue: holdings.reduce((sum, holding) => sum + holding.currentValue, 0),
    totalInvested: holdings.reduce((sum, holding) => sum + holding.purchaseValue, 0),
    totalGainLoss: holdings.reduce((sum, holding) => sum + holding.gainLoss, 0),
    totalGainLossPercent: 0,
    totalProperties: holdings.length,
    totalTokens: holdings.reduce((sum, holding) => sum + holding.tokensOwned, 0),
    monthlyDividends: holdings.reduce((sum, holding) => sum + (holding.tokensOwned * 0.5), 0) // Mock calculation
  }

  portfolioSummary.totalGainLossPercent = portfolioSummary.totalInvested > 0 
    ? (portfolioSummary.totalGainLoss / portfolioSummary.totalInvested) * 100 
    : 0

  // Fetch real-time data
  const { data: accountAssets, isLoading: isLoadingAssets, refetch: refetchAssets } = useQuery({
    queryKey: ['account-assets', activeAddress],
    queryFn: () => activeAddress ? transactionService.getAccountAssets(activeAddress) : null,
    enabled: !!activeAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Set up real-time subscriptions and periodic refresh
  useEffect(() => {
    if (!activeAddress) return

    // Set up real-time subscription for token ownership changes
    const subscription = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'token_ownership',
          filter: `wallet_address=eq.${activeAddress}`
        },
        (payload) => {
          console.log('Portfolio change detected:', payload)
          // Refetch portfolio data when changes occur
          refetchPortfolio()
          refetchTransactions()
          setLastUpdated(new Date())
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties'
        },
        (payload) => {
          console.log('Property change detected:', payload)
          // Refetch portfolio data when property details change
          refetchPortfolio()
          setLastUpdated(new Date())
        }
      )
      .subscribe()

    // Also set up periodic refresh as backup
    const interval = setInterval(() => {
      refetchAssets()
      refetchPortfolio()
      refetchTransactions()
      setLastUpdated(new Date())
    }, 30000) // Refresh every 30 seconds

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [activeAddress, refetchAssets, refetchPortfolio, refetchTransactions])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refetchAssets(),
        refetchPortfolio(),
        refetchTransactions()
      ])
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: RecentTransaction['type']) => {
    switch (type) {
      case 'purchase':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />
      case 'sale':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case 'dividend':
        return <DollarSign className="h-4 w-4 text-green-500" />
      case 'fee':
        return <Activity className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-secondary-500" />
    }
  }

  // Convert RecentTransaction to PortfolioTransaction for modal
  const convertToPortfolioTransactions = (transactions: RecentTransaction[]) => {
    return transactions.map(tx => ({
      ...tx,
      algoExplorerUrl: `https://testnet.algoexplorer.io/tx/${tx.txId}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 30000000 // Mock block number
    }))
  }

  if (!activeAddress) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
        <Wallet className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400">
          Please connect your Algorand wallet to view your investment portfolio
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Investment Portfolio
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 text-sm mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddPropertyModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600/80 hover:bg-green-700 backdrop-blur-sm text-white font-medium rounded-xl transition-colors"
          >
            <Building2 className="h-4 w-4 mr-2" />
            List a Property
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

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
            {formatCurrency(Math.abs(portfolioSummary.totalGainLoss))} today
          </div>
        </div>

        {/* Properties Count */}
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent-100/50 dark:bg-accent-900/30 backdrop-blur-sm rounded-xl">
              <Building2 className="h-6 w-6 text-accent-600 dark:text-accent-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
            {portfolioSummary.totalProperties}
          </div>
          <div className="text-secondary-600 dark:text-secondary-400 text-sm">
            Properties Owned
          </div>
          <div className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">
            {portfolioSummary.totalTokens} total tokens
          </div>
        </div>

        {/* Monthly Dividends */}
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100/50 dark:bg-green-900/30 backdrop-blur-sm rounded-xl">
              <Coins className="h-6 w-6 text-green-600 dark:text-green-400" />
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
            Next payment in 8 days
          </div>
        </div>

        {/* ALGO Balance */}
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl">
              <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
            {isLoadingAssets ? (
              <div className="animate-pulse bg-secondary-200 dark:bg-secondary-700 h-8 w-20 rounded"></div>
            ) : (
              `${accountAssets?.algo?.toFixed(4) || '0.0000'} ALGO`
            )}
          </div>
          <div className="text-secondary-600 dark:text-secondary-400 text-sm">
            Available Balance
          </div>
          <div className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">
            Ready to invest
          </div>
        </div>
      </div>

      {/* Holdings and Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Property Holdings */}
        <div className="lg:col-span-2">
          <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
            <div className="p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
                Property Holdings
              </h3>
            </div>
            <div className="p-6">
              {isLoadingPortfolio ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="border border-secondary-200/50 dark:border-secondary-700/50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-secondary-200 dark:bg-secondary-700 rounded-xl"></div>
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                            <div className="h-3 w-24 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="h-4 w-20 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                          <div className="h-3 w-16 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : holdings.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                    No Properties Yet
                  </h4>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    Start building your real estate portfolio today
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {holdings.map((holding) => (
                    <div
                      key={holding.propertyId}
                      className="border border-secondary-200/50 dark:border-secondary-700/50 rounded-xl p-4 hover:shadow-md transition-shadow"
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
                              <span>Asset ID: {holding.assetId}</span>
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
                            Total Tokens
                          </div>
                          <div className="font-semibold text-secondary-900 dark:text-white">
                            {holding.tokensOwned}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
                            Last Updated
                          </div>
                          <div className="font-semibold text-secondary-900 dark:text-white text-xs">
                            {formatDate(holding.lastUpdated)}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Link 
                          to={`/property/${holding.propertyId}`}
                          className="inline-flex items-center px-3 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-1">
          <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
            <div className="p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
                Recent Transactions
              </h3>
            </div>
            <div className="p-6">
              {isLoadingTransactions ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-secondary-200 dark:bg-secondary-700 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-3 w-20 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                          <div className="h-2 w-16 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="h-3 w-16 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                        <div className="h-2 w-12 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-secondary-400 mx-auto mb-3" />
                  <p className="text-secondary-600 dark:text-secondary-400 text-sm">
                    No transactions yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.slice(0, 8).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/50 dark:bg-secondary-600/50 backdrop-blur-sm rounded-lg">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <div className="font-medium text-secondary-900 dark:text-white text-sm">
                            {transaction.type === 'purchase' && 'Bought'}
                            {transaction.type === 'sale' && 'Sold'}
                            {transaction.type === 'dividend' && 'Dividend'}
                            {transaction.type === 'fee' && 'Fee'}
                            {transaction.tokenAmount && ` ${transaction.tokenAmount} tokens`}
                          </div>
                          <div className="text-xs text-secondary-600 dark:text-secondary-400 truncate max-w-[120px]">
                            {transaction.propertyTitle}
                          </div>
                          <div className="text-xs text-secondary-500 dark:text-secondary-400">
                            {formatDate(transaction.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold text-sm ${
                          transaction.type === 'purchase' || transaction.type === 'fee'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {transaction.type === 'purchase' || transaction.type === 'fee' ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div className="flex items-center text-xs text-secondary-500 dark:text-secondary-400">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                            transaction.status === 'confirmed' ? 'bg-green-500' :
                            transaction.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></span>
                          {transaction.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-secondary-200/50 dark:border-secondary-700/50">
                <button 
                  onClick={() => setIsTransactionModalOpen(true)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All Transactions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        transactions={convertToPortfolioTransactions(transactions)}
        isLoading={isLoadingTransactions}
      />

      {/* Add Property Modal */}
      <AddPropertyModal
        isOpen={isAddPropertyModalOpen}
        onClose={() => setIsAddPropertyModalOpen(false)}
        onSuccess={async () => {
          // Refresh all data when a property is successfully created
          await handleRefresh()
        }}
      />
    </div>
  )
}