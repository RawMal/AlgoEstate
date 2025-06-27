import { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useQuery } from '@tanstack/react-query'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  Coins, 
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  RefreshCw,
  Eye,
  ExternalLink
} from 'lucide-react'
import { TransactionService } from '../services/TransactionService'
import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import { formatAlgoAmount, algorandClient } from '../services/algorandService'

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

interface RecentTransaction {
  id: string
  type: 'purchase' | 'sale' | 'dividend' | 'fee'
  propertyTitle: string
  amount: number
  tokenAmount?: number
  timestamp: string
  txId: string
  status: 'confirmed' | 'pending' | 'failed'
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

// Mock data for demonstration
const mockHoldings: PortfolioHolding[] = [
  {
    propertyId: '1',
    propertyTitle: 'Luxury Manhattan Penthouse',
    propertyImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    assetId: 123456789,
    tokensOwned: 50,
    tokenPrice: 275,
    currentValue: 13750,
    purchaseValue: 12500,
    gainLoss: 1250,
    gainLossPercent: 10,
    lastUpdated: '2024-01-20T10:30:00Z'
  },
  {
    propertyId: '2',
    propertyTitle: 'Modern Miami Condo',
    propertyImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    assetId: 987654321,
    tokensOwned: 25,
    tokenPrice: 185,
    currentValue: 4625,
    purchaseValue: 4250,
    gainLoss: 375,
    gainLossPercent: 8.82,
    lastUpdated: '2024-01-20T09:15:00Z'
  },
  {
    propertyId: '3',
    propertyTitle: 'Downtown Austin Office',
    propertyImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    assetId: 456789123,
    tokensOwned: 15,
    tokenPrice: 320,
    currentValue: 4800,
    purchaseValue: 5100,
    gainLoss: -300,
    gainLossPercent: -5.88,
    lastUpdated: '2024-01-20T08:45:00Z'
  }
]

const mockTransactions: RecentTransaction[] = [
  {
    id: '1',
    type: 'purchase',
    propertyTitle: 'Luxury Manhattan Penthouse',
    amount: 2750,
    tokenAmount: 10,
    timestamp: '2024-01-20T10:30:00Z',
    txId: 'ABCD1234567890EFGH',
    status: 'confirmed'
  },
  {
    id: '2',
    type: 'dividend',
    propertyTitle: 'Modern Miami Condo',
    amount: 45.50,
    timestamp: '2024-01-19T14:20:00Z',
    txId: 'EFGH9876543210ABCD',
    status: 'confirmed'
  },
  {
    id: '3',
    type: 'purchase',
    propertyTitle: 'Downtown Austin Office',
    amount: 1600,
    tokenAmount: 5,
    timestamp: '2024-01-18T16:45:00Z',
    txId: 'IJKL5555666677778',
    status: 'confirmed'
  },
  {
    id: '4',
    type: 'fee',
    propertyTitle: 'Platform Fee',
    amount: 55,
    timestamp: '2024-01-18T16:45:00Z',
    txId: 'MNOP9999888877776',
    status: 'confirmed'
  }
]

export function UserDashboard() {
  const { activeAddress } = useWallet()
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(mockHoldings)
  const [transactions, setTransactions] = useState<RecentTransaction[]>(mockTransactions)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const transactionService = new TransactionService()

  // Calculate portfolio summary
  const portfolioSummary: PortfolioSummary = {
    totalValue: holdings.reduce((sum, holding) => sum + holding.currentValue, 0),
    totalInvested: holdings.reduce((sum, holding) => sum + holding.purchaseValue, 0),
    totalGainLoss: holdings.reduce((sum, holding) => sum + holding.gainLoss, 0),
    totalGainLossPercent: 0,
    totalProperties: holdings.length,
    totalTokens: holdings.reduce((sum, holding) => sum + holding.tokensOwned, 0),
    monthlyDividends: 125.75 // Mock value
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

  // Set up real-time blockchain subscriber
  useEffect(() => {
    if (!activeAddress) return

    let subscriber: AlgorandSubscriber | null = null

    const setupSubscriber = async () => {
      try {
        subscriber = new AlgorandSubscriber({
          filters: [
            {
              name: 'asset-transfers',
              filter: {
                sender: activeAddress,
                receiver: activeAddress
              }
            },
            {
              name: 'payments',
              filter: {
                sender: activeAddress,
                receiver: activeAddress
              }
            }
          ],
          maxRoundsToSync: 100,
          syncBehaviour: 'sync-oldest',
          watermarkPersistence: {
            get: async () => 0,
            set: async () => {}
          }
        }, algorandClient.client)

        subscriber.on('asset-transfers', (transaction) => {
          console.log('Asset transfer detected:', transaction)
          // Update holdings when asset transfers are detected
          refetchAssets()
          setLastUpdated(new Date())
        })

        subscriber.on('payments', (transaction) => {
          console.log('Payment detected:', transaction)
          // Update when payments are detected
          refetchAssets()
          setLastUpdated(new Date())
        })

        await subscriber.start()
      } catch (error) {
        console.error('Error setting up blockchain subscriber:', error)
      }
    }

    setupSubscriber()

    return () => {
      if (subscriber) {
        subscriber.stop()
      }
    }
  }, [activeAddress, refetchAssets])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetchAssets()
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
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center px-4 py-2 bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </button>
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
              `${accountAssets?.algo.toFixed(4) || '0.0000'} ALGO`
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
              {holdings.length === 0 ? (
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
                        <button className="inline-flex items-center px-3 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </button>
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
              {transactions.length === 0 ? (
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
                <button className="w-full inline-flex items-center justify-center px-4 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All Transactions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}